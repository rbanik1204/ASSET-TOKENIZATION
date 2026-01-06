'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { MainLayout } from '@/components/layout/MainLayout';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RequireWallet } from '@/components/wallet/RequireWallet';
import { chains } from '@/config/wagmi';
import { ABIS, getContractsForChain, isContractsConfiguredFor } from '@/config/contracts';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { parseUnits } from 'ethers';
import { useEthersSigner } from '@/hooks/useEthersSigner';
import { Contract } from 'ethers';
import { isUserRejectedError } from '@/lib/wallet/utils';

type Method = 'upi' | 'paypal';

export default function PurchaseClient() {
  const search = useSearchParams();
  const assetId = search.get('assetId') || search.get('id');

  // CRITICAL: Purchase requires assetId. No manual token entry.
  if (!assetId) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Alert 
            type="error" 
            message="Invalid purchase request. Asset ID is required. Please initiate purchase from an asset detail page." 
          />
          <div className="mt-6">
            <Link href="/marketplace" className="text-[color:var(--accent)] hover:underline">
              ← Back to Marketplace
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const supportedChainIds: number[] = chains.map((c) => c.id);
  const writeEnabledChainIds = React.useMemo(
    () => supportedChainIds.filter((id) => isContractsConfiguredFor(id, ['PRIMARY_SALE'])),
    [supportedChainIds],
  );
  const wrongNetwork = Boolean(isConnected && !writeEnabledChainIds.includes(chainId));
  const signer = useEthersSigner();

  const [method, setMethod] = React.useState<Method>('upi');
  const [amount, setAmount] = React.useState('');

  const [tokenAddress, setTokenAddress] = React.useState('');
  const [txError, setTxError] = React.useState<string | null>(null);
  const [txPending, setTxPending] = React.useState(false);
  const [oracleVerified, setOracleVerified] = React.useState<boolean | null>(null);
  const [oracleChecking, setOracleChecking] = React.useState(false);
  const [oracleError, setOracleError] = React.useState<string | null>(null);

  const parsedAmount = Number(amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const { ASSET_REGISTRY, PRIMARY_SALE, PROOF_OF_RESERVE, ORACLE_PRICE_FEED } = getContractsForChain(chainId);

  const registryAddress = ASSET_REGISTRY as `0x${string}` | '';
  const registryAddressOrUndefined: `0x${string}` | undefined =
    registryAddress && registryAddress.length === 42 ? (registryAddress as `0x${string}`) : undefined;
  const registryConfigured = Boolean(registryAddressOrUndefined);

  const assetIdBigInt = assetId && /^\d+$/.test(assetId) ? BigInt(assetId) : null;

  const registryAssetQuery = useReadContract({
    address: registryAddressOrUndefined,
    abi: ABIS.ASSET_REGISTRY,
    functionName: 'getAsset',
    args: assetIdBigInt ? [assetIdBigInt] : undefined,
    query: { enabled: registryConfigured && Boolean(assetIdBigInt) },
  });

  React.useEffect(() => {
    if (!registryAssetQuery.data) return;
    const result = registryAssetQuery.data as any;
    const token = result?.[0] || result?.token;
    if (typeof token === 'string' && token.startsWith('0x')) {
      setTokenAddress(token);
    }
  }, [registryAssetQuery.data]);

  const primarySaleAddress = PRIMARY_SALE as `0x${string}` | '';
  const primarySaleAddressOrUndefined: `0x${string}` | undefined =
    primarySaleAddress && primarySaleAddress.length === 42 ? (primarySaleAddress as `0x${string}`) : undefined;
  const primarySaleConfigured = Boolean(primarySaleAddressOrUndefined);

  const tokenAddressOrUndefined = tokenAddress && tokenAddress.length === 42 ? (tokenAddress as `0x${string}`) : undefined;

  const saleQuery = useReadContract({
    address: primarySaleAddressOrUndefined,
    abi: ABIS.PRIMARY_SALE,
    functionName: 'getSale',
    args: tokenAddressOrUndefined ? [tokenAddressOrUndefined] : undefined,
    query: { enabled: primarySaleConfigured && Boolean(tokenAddressOrUndefined) },
  });

  const sale = saleQuery.data as any;
  const pricePerTokenWei: bigint | null = sale?.pricePerToken ? BigInt(sale.pricePerToken) : null;

  const tokenAmountBaseUnits: bigint | null = React.useMemo(() => {
    if (!validAmount) return null;
    try {
      // PrimarySale expects tokenAmount in base units (1e18).
      return BigInt(parseUnits(String(parsedAmount), 18));
    } catch {
      return null;
    }
  }, [parsedAmount, validAmount]);

  const totalCostWei: bigint | null = React.useMemo(() => {
    if (!pricePerTokenWei || !tokenAmountBaseUnits) return null;
    // totalCost = ceil(pricePerToken * tokenAmount / 1e18)
    const TOKEN_SCALE = 10n ** 18n;
    const product = pricePerTokenWei * tokenAmountBaseUnits;
    const q = product / TOKEN_SCALE;
    const r = product % TOKEN_SCALE;
    return r === 0n ? q : q + 1n;
  }, [pricePerTokenWei, tokenAmountBaseUnits]);

  const canWrite = isConnected && !wrongNetwork;

  // Check oracle verification when token address changes
  React.useEffect(() => {
    if (!tokenAddressOrUndefined || !PROOF_OF_RESERVE) {
      setOracleVerified(null);
      setOracleError(null);
      return;
    }

    const checkOracle = async () => {
      setOracleChecking(true);
      setOracleError(null);
      try {
        const porContract = new Contract(
          PROOF_OF_RESERVE as string,
          ['function checkReserve(address token) view returns (uint256 reserveAmount, uint256 totalSupply, bool isValid)'],
          signer || undefined,
        );
        const result = await porContract.checkReserve(tokenAddressOrUndefined);
        const isValid = Boolean(result?.[2]);
        setOracleVerified(isValid);
        if (!isValid) {
          setOracleError('Reserve verification failed: reserves do not match expected supply within acceptable deviation.');
        }
      } catch (err: any) {
        setOracleVerified(false);
        const msg = String(err?.message || err || '').toLowerCase();
        if (msg.includes('reservefeednotfound') || msg.includes('not found')) {
          setOracleError('Oracle verification unavailable: No reserve feed configured for this token.');
        } else if (msg.includes('stale')) {
          setOracleError('Oracle verification failed: Reserve data is stale or outdated.');
        } else {
          setOracleError('Oracle verification failed: Unable to verify reserves on-chain.');
        }
      } finally {
        setOracleChecking(false);
      }
    };

    checkOracle();
  }, [tokenAddressOrUndefined, PROOF_OF_RESERVE, signer]);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Purchase</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Choose a payment method and proceed to buy tokens.</p>
        </div>

        {assetId && (
          <div className="mb-6">
            <Alert type="info" message={`Purchasing flow started from asset ${assetId}.`} />
            <div className="mt-2 text-xs text-[color:var(--text-muted)]">
              <Link href={`/assets/${assetId}`} className="underline hover:text-[color:var(--text)]">
                View asset
              </Link>
            </div>
          </div>
        )}

        {!isConnected ? (
          <RequireWallet supportedChainIds={writeEnabledChainIds} />
        ) : (
          <div className="surface rounded-lg border border-[color:var(--border)]">
            <div className="px-6 py-4 border-b border-[color:var(--border)]">
              <div className="text-sm font-semibold">Payment</div>
              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                Purchase writes require a connected wallet on a supported network.
              </div>
            </div>

            <div className="p-6 space-y-6">
              {wrongNetwork && <Alert type="error" message="Wrong network. Switch to a supported network to purchase." />}

              {txError && <Alert type="error" message={txError} />}

              {oracleChecking && <Alert type="info" message="Checking oracle verification..." />}

              {oracleError && <Alert type="error" message={oracleError} />}

              {oracleVerified === false && !oracleError && (
                <Alert type="warning" message="This asset is not oracle-verified. Purchase is disabled for unverified assets." />
              )}

              {oracleVerified === true && (
                <Alert type="success" message="✓ Oracle verified: Reserves confirmed on-chain" />
              )}

              <div className="p-4 bg-[color:var(--panel-2)] rounded-lg border border-[color:var(--border)]">
                <div className="text-sm font-semibold mb-2">Asset Information</div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  <div className="flex justify-between items-center mb-1">
                    <span>Asset ID:</span>
                    <span className="font-mono font-semibold text-[color:var(--text)]">{assetId}</span>
                  </div>
                  {tokenAddress && (
                    <div className="flex justify-between items-center">
                      <span>Token Address:</span>
                      <span className="font-mono font-semibold text-[color:var(--text)]">{tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}</span>
                    </div>
                  )}
                </div>
              </div>

              {!primarySaleConfigured && (
                <Alert
                  type="warning"
                  message="PrimarySale contract is not configured for this network. Configure NEXT_PUBLIC_PRIMARY_SALE_ADDRESS_<SUFFIX> (recommended) or set NEXT_PUBLIC_DEFAULT_CHAIN_ID and NEXT_PUBLIC_PRIMARY_SALE_ADDRESS for a single-chain deployment."
                />
              )}

              {assetId && !registryConfigured && (
                <Alert
                  type="warning"
                  message="AssetRegistry contract is not configured for this network, so token address cannot be auto-filled from assetId. Configure NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS_<SUFFIX> (recommended) or set NEXT_PUBLIC_DEFAULT_CHAIN_ID and NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS for a single-chain deployment."
                />
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                    method === 'upi'
                      ? 'bg-[color:var(--panel-2)] border-[color:var(--border)] text-[color:var(--text)]'
                      : 'bg-transparent border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
                  }`}
                  onClick={() => setMethod('upi')}
                >
                  UPI
                </button>
                <button
                  type="button"
                  className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                    method === 'paypal'
                      ? 'bg-[color:var(--panel-2)] border-[color:var(--border)] text-[color:var(--text)]'
                      : 'bg-transparent border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
                  }`}
                  onClick={() => setMethod('paypal')}
                >
                  PayPal
                </button>
              </div>

              <Input
                label="Token amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1"
                min={0}
              />

              {pricePerTokenWei != null && totalCostWei != null && (
                <div className="text-sm text-[color:var(--text-muted)]">
                  <div className="font-semibold text-[color:var(--text)] mb-1">On-chain estimate</div>
                  <div>
                    Price per token (wei): <span className="font-mono">{pricePerTokenWei.toString()}</span>
                  </div>
                  <div>
                    Total cost (wei): <span className="font-mono">{totalCostWei.toString()}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <Link href="/marketplace" className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text)]">
                  Back to marketplace
                </Link>
                <Button
                  variant="primary"
                  disabled={
                    !validAmount ||
                    !canWrite ||
                    !primarySaleConfigured ||
                    !tokenAddressOrUndefined ||
                    !tokenAmountBaseUnits ||
                    !totalCostWei ||
                    txPending ||
                    !signer ||
                    oracleVerified !== true ||
                    oracleChecking
                  }
                  loading={txPending}
                  onClick={async () => {
                    setTxError(null);

                    // Re-verify oracle before purchase
                    if (oracleVerified !== true) {
                      setTxError('Oracle verification required before purchase.');
                      return;
                    }

                    if (!canWrite) {
                      setTxError('Wallet is not connected to a supported network.');
                      return;
                    }
                    if (!signer) {
                      setTxError('Wallet provider unavailable.');
                      return;
                    }
                    if (!primarySaleAddressOrUndefined) {
                      setTxError('PrimarySale contract not configured.');
                      return;
                    }
                    if (!tokenAddressOrUndefined || !tokenAmountBaseUnits || !totalCostWei) {
                      setTxError('Missing token address or invalid amount.');
                      return;
                    }

                    setTxPending(true);
                    try {
                      const primarySale = new Contract(
                        primarySaleAddressOrUndefined,
                        ['function purchaseTokens(address token, uint256 tokenAmount) payable'],
                        signer,
                      );

                      const tx = await primarySale.purchaseTokens(tokenAddressOrUndefined, tokenAmountBaseUnits, {
                        value: totalCostWei,
                      });
                      await tx.wait();
                    } catch (e) {
                      const msg = isUserRejectedError(e)
                        ? 'Transaction was rejected in your wallet.'
                        : e instanceof Error
                          ? e.message
                          : 'Purchase failed.';
                      setTxError(msg);
                    } finally {
                      setTxPending(false);
                    }
                  }}
                >
                  Purchase tokens
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
