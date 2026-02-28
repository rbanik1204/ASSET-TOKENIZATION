import React, { useState } from 'react';
import { X, ShoppingCart, AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface BuyFractionModalProps {
  asset: {
    id: string;
    assetId?: number;
    name: string;
    unitName: string;
    pricePerUnit: number;
    unitsAvailable: number;
    seller: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TxStatus = 'idle' | 'estimating' | 'swapping' | 'confirming' | 'success' | 'error';

export const BuyFractionModal: React.FC<BuyFractionModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { address, network } = useAlgorand();
  const { addTransaction } = useAssetRegistry();

  const [units, setUnits] = useState(1);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalCost = units * asset.pricePerUnit;
  const swapFee = 0.002; // 2 txns × 0.001 ALGO
  const totalWithFees = totalCost + swapFee;

  const explorerBase = network === 'mainnet'
    ? 'https://algoexplorer.io'
    : 'https://testnet.algoexplorer.io';

  const reset = () => {
    setTxStatus('idle');
    setTxId(null);
    setErrorMsg(null);
    setUnits(1);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBuy = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!asset.assetId) {
      toast.error('This asset is not yet tokenized on Algorand');
      return;
    }

    if (units <= 0 || units > asset.unitsAvailable) {
      toast.error(`Enter a valid amount (1 - ${asset.unitsAvailable})`);
      return;
    }

    setTxStatus('estimating');
    setErrorMsg(null);

    try {
      // 1. Estimate swap
      const estimateRes = await fetch('/api/swap/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asaAmount: units,
          algoAmount: Math.round(totalCost * 1_000_000),
        }),
      });
      const estimate = await estimateRes.json();

      if (!estimate.success) {
        throw new Error('Failed to estimate swap costs');
      }

      setTxStatus('swapping');

      // 2. Prompt for mnemonic (DEMO MODE — in production use WalletConnect)
      const buyerMnemonic = prompt(
        `Confirm purchase of ${units} unit(s) of ${asset.name}.\n\n` +
        `Cost: ${totalCost} ALGO\nFees: ${swapFee} ALGO\nTotal: ${totalWithFees} ALGO\n\n` +
        `[DEMO] Enter your 25-word mnemonic to sign:`
      );

      if (!buyerMnemonic) {
        setTxStatus('idle');
        return;
      }

      const sellerMnemonic = prompt(
        `[DEMO] Enter the SELLER's 25-word mnemonic to complete atomic swap:`
      );

      if (!sellerMnemonic) {
        setTxStatus('idle');
        return;
      }

      setTxStatus('confirming');

      // 3. Execute atomic swap
      const swapRes = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerMnemonic,
          sellerMnemonic,
          asaId: asset.assetId,
          asaAmount: units,
          algoAmount: Math.round(totalCost * 1_000_000),
        }),
      });

      const result = await swapRes.json();

      if (result.success) {
        setTxId(result.txId);
        setTxStatus('success');

        // Record in context
        addTransaction({
          type: 'purchase',
          assetId: asset.assetId,
          assetName: asset.name,
          from: asset.seller,
          to: address,
          amount: units,
          txId: result.txId,
          status: 'confirmed',
        });

        toast.success(`✅ Purchased ${units} unit(s) of ${asset.name}!`);
        onSuccess?.();
      } else {
        throw new Error(result.message || 'Atomic swap failed');
      }
    } catch (err: any) {
      console.error('Buy error:', err);
      setTxStatus('error');
      setErrorMsg(err.message || 'Purchase failed');
      toast.error(err.message || 'Purchase failed');
    }
  };

  const statusMessages: Record<TxStatus, string | null> = {
    idle: null,
    estimating: '⏳ Estimating swap costs...',
    swapping: '🔄 Preparing atomic swap group...',
    confirming: '⛓️ Waiting for blockchain confirmation...',
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
                  <h3 className="font-bold uppercase text-lg">{asset.name}</h3>
                  <span className="px-2 py-1 bg-accent text-black text-xs font-bold uppercase">
                    {asset.unitName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">ASA ID</div>
                    <div className="font-mono font-bold">
                      {asset.assetId ? (
                        <a
                          href={`${explorerBase}/asset/${asset.assetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline flex items-center gap-1"
                        >
                          #{asset.assetId}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not tokenized</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">Available</div>
                    <div className="font-bold">{asset.unitsAvailable.toLocaleString()} units</div>
                  </div>
                </div>
              </div>

              {/* Success State */}
              {txStatus === 'success' && txId ? (
                <div className="border-2 border-accent bg-accent/10 p-6 text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-accent mx-auto" />
                  <h3 className="font-bold uppercase text-lg">PURCHASE SUCCESSFUL</h3>
                  <p className="text-sm text-muted-foreground">
                    You now own {units} unit(s) of {asset.name}
                  </p>
                  <div className="font-mono text-xs bg-black border border-foreground p-3 break-all">
                    TX: {txId}
                  </div>
                  <a
                    href={`${explorerBase}/tx/${txId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-accent text-accent hover:bg-accent hover:text-black transition-colors uppercase font-bold text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    VIEW ON ALGOEXPLORER
                  </a>
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
                        onClick={() => setUnits(u => Math.max(1, u - 1))}
                        disabled={txStatus !== 'idle'}
                        className="w-10 h-10 border-2 border-foreground font-bold text-xl hover:border-accent transition-colors disabled:opacity-50"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={asset.unitsAvailable}
                        value={units}
                        onChange={e => setUnits(Math.max(1, Math.min(asset.unitsAvailable, parseInt(e.target.value) || 1)))}
                        disabled={txStatus !== 'idle'}
                        className="flex-1 text-center py-2 border-2 border-foreground bg-background focus:border-accent outline-none font-bold text-lg disabled:opacity-50"
                      />
                      <button
                        onClick={() => setUnits(u => Math.min(asset.unitsAvailable, u + 1))}
                        disabled={txStatus !== 'idle'}
                        className="w-10 h-10 border-2 border-foreground font-bold text-xl hover:border-accent transition-colors disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="border-2 border-foreground bg-background p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground uppercase">Price per unit</span>
                      <span className="font-bold">{asset.pricePerUnit} ALGO</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground uppercase">Units × {units}</span>
                      <span className="font-bold">{totalCost.toFixed(4)} ALGO</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground uppercase">Network Fee</span>
                      <span className="font-bold">{swapFee} ALGO</span>
                    </div>
                    <div className="border-t-2 border-foreground pt-2 flex justify-between">
                      <span className="font-bold uppercase">TOTAL</span>
                      <span className="font-bold text-accent text-lg">{totalWithFees.toFixed(4)} ALGO</span>
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
                    This executes an <strong className="text-accent">atomic swap</strong>: both the
                    ALGO payment and ASA transfer happen simultaneously or not at all — completely
                    trustless.
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={handleBuy}
                    disabled={!address || txStatus !== 'idle' || !asset.assetId}
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
