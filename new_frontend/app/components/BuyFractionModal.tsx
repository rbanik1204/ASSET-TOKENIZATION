import React, { useState } from 'react';
import { X, ShoppingCart, AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useMarketplace, type PrepareBuyResult } from '../contexts/MarketplaceContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import algosdk from 'algosdk';

interface BuyFractionModalProps {
  listing: {
    id: string;
    asaId: number;
    assetName: string;
    unitName: string;
    pricePerUnit: number;
    remainingQuantity: number;
    minPurchase: number;
    sellerAddress: string;
    platformFeeBps: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TxStatus = 'idle' | 'preparing' | 'signing' | 'confirming' | 'success' | 'error';

export const BuyFractionModal: React.FC<BuyFractionModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { address, connectedWallet, network, signTransactions } = useAlgorand();
  const { prepareBuy, confirmBuy } = useMarketplace();

  const [units, setUnits] = useState(listing.minPurchase || 1);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [prepareResult, setPrepareResult] = useState<PrepareBuyResult | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const feePct = listing.platformFeeBps / 100;
  const subtotal = units * listing.pricePerUnit;
  const platformFee = subtotal * listing.platformFeeBps / 10000;
  const totalCost = subtotal;
  const networkFee = 0.003; // ~3 txns × 0.001 ALGO

  const explorerBase = network === 'mainnet'
    ? 'https://algoexplorer.io'
    : 'https://testnet.algoexplorer.io';

  const reset = () => {
    setTxStatus('idle');
    setPrepareResult(null);
    setExplorerUrl(null);
    setTxId(null);
    setErrorMsg(null);
    setUnits(listing.minPurchase || 1);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  /**
   * Two-step atomic swap buy flow:
   * 1. prepareBuy → get unsigned buyer txns from backend
   * 2. Wallet signs buyer txns
   * 3. confirmBuy → backend signs server portion + submits to Algorand
   */
  const handleBuy = async () => {
    if (!address || !connectedWallet) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (units < listing.minPurchase || units > listing.remainingQuantity) {
      toast.error(`Enter a valid amount (${listing.minPurchase} - ${listing.remainingQuantity})`);
      return;
    }

    setTxStatus('preparing');
    setErrorMsg(null);

    try {
      // ── Step 1: Prepare (get unsigned txns from backend) ──
      const result = await prepareBuy(listing.id, address, units);
      setPrepareResult(result);

      // ── Step 2: Sign buyer txns with wallet ──
      setTxStatus('signing');

      const buyerIndices = new Set(result.buyerSignIndices ?? [0, 1]);

      // Decode ALL unsigned txns → algosdk Transaction objects
      const txnObjs = result.unsignedTxns.map((b64: string) => {
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        return algosdk.decodeUnsignedTransaction(bytes);
      });

      // Build signable txn group for Pera/Defly wallet
      // Buyer signs their txns; server txns are marked signers: [] (display-only)
      const txnGroup = txnObjs.map((txn: any, i: number) => ({
        txn,
        ...(buyerIndices.has(i) ? {} : { signers: [] }),
      }));

      let signedTxnBytes: (Uint8Array | null)[];

      // Use the existing wallet session from AlgorandContext
      signedTxnBytes = await signTransactions(txnGroup);

      // Extract only the buyer-signed txns (wallet returns null for signers:[] txns)
      const signedTxnsB64: string[] = [];
      for (const bytes of signedTxnBytes) {
        if (bytes && bytes.length > 0) {
          const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
          signedTxnsB64.push(btoa(String.fromCharCode(...b)));
        }
      }

      // ── Step 3: Confirm (backend signs server portion + submits) ──
      setTxStatus('confirming');

      const confirmResult = await confirmBuy(result.tradeId, signedTxnsB64);
      setTxId(confirmResult.trade.groupTxId);
      setExplorerUrl(confirmResult.explorerUrl);
      setTxStatus('success');

      toast.success(`✅ Purchased ${units} unit(s) of ${listing.assetName}!`);
      onSuccess?.();

    } catch (err: any) {
      console.error('Buy error:', err);
      // User cancelled wallet signing
      if (err?.message?.includes('CONNECT_MODAL_CLOSED') || err?.message?.includes('cancelled')) {
        setTxStatus('idle');
        return;
      }
      setTxStatus('error');
      setErrorMsg(err.message || 'Purchase failed');
      toast.error(err.message || 'Purchase failed');
    }
  };

  const statusMessages: Record<TxStatus, string | null> = {
    idle: null,
    preparing: '⏳ Preparing atomic swap...',
    signing: '✍️ Please sign in your wallet...',
    confirming: '⛓️ Submitting to Algorand blockchain...',
    success: '✅ Purchase complete!',
    error: '❌ Transaction failed',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-black border-4 border-accent w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b-4 border-foreground">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-bold uppercase">BUY FRACTION</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-accent/20 border-2 border-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Asset Info */}
              <div className="border-2 border-foreground bg-background p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold uppercase text-lg">{listing.assetName}</h3>
                  <span className="px-2 py-1 bg-accent text-black text-xs font-bold uppercase">
                    {listing.unitName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">ASA ID</div>
                    <div className="font-mono font-bold">
                      <a
                        href={`${explorerBase}/asset/${listing.asaId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline flex items-center gap-1"
                      >
                        #{listing.asaId}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">Available</div>
                    <div className="font-bold">{listing.remainingQuantity.toLocaleString()} units</div>
                  </div>
                </div>
              </div>

              {/* Success State */}
              {txStatus === 'success' && txId ? (
                <div className="border-2 border-accent bg-accent/10 p-6 text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-accent mx-auto" />
                  <h3 className="font-bold uppercase text-lg">PURCHASE SUCCESSFUL</h3>
                  <p className="text-sm text-muted-foreground">
                    You now own {units} unit(s) of {listing.assetName}
                  </p>
                  {prepareResult?.summary && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Subtotal: {prepareResult.summary.subtotal.toFixed(4)} ALGO</div>
                      <div>Platform Fee: {prepareResult.summary.platformFee.toFixed(4)} ALGO</div>
                      <div className="font-bold text-accent">Total: {prepareResult.summary.totalCost.toFixed(4)} ALGO</div>
                    </div>
                  )}
                  <div className="font-mono text-xs bg-black border border-foreground p-3 break-all">
                    TX: {txId}
                  </div>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 border-2 border-accent text-accent hover:bg-accent hover:text-black transition-colors uppercase font-bold text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      VIEW ON EXPLORER
                    </a>
                  )}
                  <button
                    onClick={handleClose}
                    className="w-full py-3 border-2 border-foreground font-bold uppercase hover:bg-muted transition-colors"
                  >
                    CLOSE
                  </button>
                </div>
              ) : txStatus === 'error' ? (
                <div className="border-2 border-destructive bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="font-bold uppercase text-destructive text-sm">TRANSACTION FAILED</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{errorMsg}</p>
                  <button
                    onClick={reset}
                    className="mt-3 px-4 py-2 border-2 border-foreground hover:border-accent text-sm font-bold uppercase transition-colors"
                  >
                    TRY AGAIN
                  </button>
                </div>
              ) : (
                <>
                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm uppercase font-bold mb-2">
                      UNITS TO PURCHASE
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setUnits(u => Math.max(listing.minPurchase, u - 1))}
                        disabled={txStatus !== 'idle'}
                        className="w-10 h-10 border-2 border-foreground font-bold text-xl hover:border-accent transition-colors disabled:opacity-50"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={listing.minPurchase}
                        max={listing.remainingQuantity}
                        value={units}
                        onChange={e => setUnits(Math.max(listing.minPurchase, Math.min(listing.remainingQuantity, parseInt(e.target.value) || listing.minPurchase)))}
                        disabled={txStatus !== 'idle'}
                        className="flex-1 text-center py-2 border-2 border-foreground bg-background focus:border-accent outline-none font-bold text-lg disabled:opacity-50"
                      />
                      <button
                        onClick={() => setUnits(u => Math.min(listing.remainingQuantity, u + 1))}
                        disabled={txStatus !== 'idle'}
                        className="w-10 h-10 border-2 border-foreground font-bold text-xl hover:border-accent transition-colors disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                    {listing.minPurchase > 1 && (
                      <p className="text-xs text-muted-foreground mt-1">Min. purchase: {listing.minPurchase} units</p>
                    )}
                  </div>

                  {/* Cost Breakdown */}
                  <div className="border-2 border-foreground bg-background p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground uppercase">Price per unit</span>
                      <span className="font-bold">{listing.pricePerUnit} ALGO</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground uppercase">Units × {units}</span>
                      <span className="font-bold">{subtotal.toFixed(4)} ALGO</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground uppercase">Platform Fee ({feePct}%)</span>
                      <span className="font-bold">{platformFee.toFixed(4)} ALGO</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground uppercase">Network Fee (est.)</span>
                      <span className="font-bold">{networkFee} ALGO</span>
                    </div>
                    <div className="border-t-2 border-foreground pt-2 flex justify-between">
                      <span className="font-bold uppercase">TOTAL</span>
                      <span className="font-bold text-accent text-lg">{(totalCost + networkFee).toFixed(4)} ALGO</span>
                    </div>
                  </div>

                  {/* Status Message */}
                  {statusMessages[txStatus] && (
                    <div className="flex items-center gap-2 text-sm text-accent font-bold">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {statusMessages[txStatus]}
                    </div>
                  )}

                  {/* Atomic Swap Explainer */}
                  <div className="text-xs text-muted-foreground border-l-4 border-accent pl-3">
                    This executes an <strong className="text-accent">atomic swap</strong> on Algorand:
                    your ALGO payment is grouped with the ASA transfer — both succeed or both
                    fail. Your wallet will prompt you to sign the payment transaction(s).
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={handleBuy}
                    disabled={!address || txStatus !== 'idle'}
                    className="w-full py-4 bg-accent text-black border-2 border-foreground font-bold uppercase text-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
                  >
                    {txStatus !== 'idle' ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-5 h-5" />
                    )}
                    {txStatus === 'idle' ? `BUY ${units} UNIT${units > 1 ? 'S' : ''}` : 'PROCESSING...'}
                  </button>

                  {!address && (
                    <p className="text-xs text-center text-destructive font-bold uppercase">
                      Connect your wallet to purchase
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
