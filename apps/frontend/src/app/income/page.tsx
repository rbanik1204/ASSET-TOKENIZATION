'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ABIS, getContractsForChain, isContractsConfiguredFor } from '@/config/contracts';
import { chains } from '@/config/wagmi';
import { RequireWallet } from '@/components/wallet/RequireWallet';
import { isUserRejectedError } from '@/lib/wallet/utils';

type IncomeApiResponse = {
  wallet: string;
  indexed: boolean;
  updatedAt: string | null;
  summary: { totalClaimable: number; totalClaimed: number; lifetimeEarnings: number };
  assets: Array<{
    id?: string | number;
    assetId?: string | number;
    tokenAddress?: string;
    name: string;
    symbol: string;
    tokensOwned: number;
    claimableAmount: number;
    totalEarned: number;
    monthlyRate: number;
    lastClaimDate: string;
  }>;
  claimHistory: Array<{
    date: string;
    asset: string;
    symbol: string;
    amount: number;
    txHash: string;
  }>;
};

export default function IncomePage() {
  return <IncomePageInner />;
}

function IncomePageInner() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const supportedChainIds: number[] = chains.map((c) => c.id);
  const writeEnabledChainIds = useMemo(
    () => supportedChainIds.filter((id) => isContractsConfiguredFor(id, ['INCOME_DISTRIBUTOR', 'USDC'])),
    [supportedChainIds],
  );
  const wrongNetwork = Boolean(isConnected && !writeEnabledChainIds.includes(chainId));

  const explorerTxBaseUrl = useMemo(() => {
    if (!chainId) return 'https://etherscan.io/tx/';
    switch (chainId) {
      case 56:
        return 'https://bscscan.com/tx/';
      case 97:
        return 'https://testnet.bscscan.com/tx/';
      case 137:
        return 'https://polygonscan.com/tx/';
      case 80002:
        return 'https://amoy.polygonscan.com/tx/';
      case 11155111:
        return 'https://sepolia.etherscan.io/tx/';
      default:
        return 'https://etherscan.io/tx/';
    }
  }, [chainId]);

  const [claimingAsset, setClaimingAsset] = useState<string | null>(null);
  const [claimingTokenAddress, setClaimingTokenAddress] = useState<`0x${string}` | null>(null);

  const { writeContract, data: txHash, error: claimError, isPending: isClaimPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<IncomeApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isConnected || !address) {
        setData(null);
        setLoadError(null);
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/income/${address}`, { cache: 'no-store' });
        const json = (await res.json()) as IncomeApiResponse | { error?: string };
        if (!res.ok) {
          throw new Error((json as any)?.error || 'Failed to load income data');
        }
        if (!cancelled) setData(json as IncomeApiResponse);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setLoadError(e instanceof Error ? e.message : 'Failed to load income data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    const t = setInterval(run, 5_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [address, isConnected]);

  const indexed = Boolean(data?.indexed);
  const updatedAt = data?.updatedAt ?? null;
  const incomeData = useMemo(() => {
    if (!address) return null;
    return (
      data ?? {
        wallet: address,
        indexed: false,
        updatedAt: null,
        summary: { totalClaimable: 0, totalClaimed: 0, lifetimeEarnings: 0 },
        assets: [],
        claimHistory: [],
      }
    );
  }, [address, data]);

  const handleClaim = async (assetTokenAddress: `0x${string}`) => {
    if (wrongNetwork) {
      setLoadError('Wrong network. Switch to a supported network to claim income.');
      return;
    }

    const { INCOME_DISTRIBUTOR, USDC } = getContractsForChain(chainId);
    if (!INCOME_DISTRIBUTOR || !USDC) {
      alert('IncomeDistributor contract is not configured for this network.');
      return;
    }

    setClaimingAsset(assetTokenAddress);
    setClaimingTokenAddress(assetTokenAddress);
    
    try {
      await writeContract({
        address: INCOME_DISTRIBUTOR as `0x${string}`,
        abi: ABIS.INCOME_DISTRIBUTOR,
        functionName: 'claimIncome',
        args: [assetTokenAddress, USDC as `0x${string}`],
      });
    } catch (error) {
      console.error('Claim error:', error);
      const message = isUserRejectedError(error)
        ? 'Transaction was rejected in your wallet.'
        : (error instanceof Error ? error.message : 'Failed to claim income.');
      alert('Failed to claim income: ' + message);
      setClaimingAsset(null);
      setClaimingTokenAddress(null);
    }
  };

  const handleClaimAll = async () => {
    alert('Batch claiming not implemented yet. Please claim each asset individually.');
  };

  // Reset claiming state when transaction confirms
  useEffect(() => {
    if (isConfirmed) {
      alert('Income claimed successfully! Check the Distribution Ledger below.');
      setClaimingAsset(null);
      setClaimingTokenAddress(null);
    }
  }, [isConfirmed]);

  // Show error if claim fails
  useEffect(() => {
    if (claimError) {
      console.error('Claim error:', claimError);
      alert('Failed to claim income: ' + claimError.message);
      setClaimingAsset(null);
      setClaimingTokenAddress(null);
    }
  }, [claimError]);

  if (!isConnected) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <RequireWallet supportedChainIds={writeEnabledChainIds} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Cash-flow statement and distribution ledger.</p>
        </div>

        {/* Statement Summary */}
        <div className="surface rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-[color:var(--border)] flex items-center justify-between gap-4">
            <div className="text-sm font-semibold">Statement Summary</div>
            <div className="text-xs text-[color:var(--text-muted)]">
              {loading ? 'Loading index…' : updatedAt ? `Indexed: ${updatedAt}` : 'Indexer not available'}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleClaimAll}
              loading={claimingAsset === 'all'}
              disabled={claimingAsset !== null || wrongNetwork}
            >
              Claim all
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-[color:var(--border)]">
                <tr>
                  <td className="px-6 py-3 text-sm text-[color:var(--text-muted)]">Total claimable</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold tabular-nums">
                    ${(incomeData?.summary.totalClaimable ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-[color:var(--text-muted)]">Total claimed</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold tabular-nums">
                    ${(incomeData?.summary.totalClaimed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-[color:var(--text-muted)]">Lifetime earnings</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold tabular-nums">
                    ${(incomeData?.summary.lifetimeEarnings ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {wrongNetwork && (
          <div className="mb-8">
            <Alert type="error" message="Wrong network. Switch to a supported network to perform write actions." />
          </div>
        )}

        {loadError && (
          <div className="mb-8">
            <Alert type="error" message={loadError} />
          </div>
        )}

        {/* Income by Asset */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-sm font-semibold">Income by Asset</h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[color:var(--bg)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Tokens Owned
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Claimable
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Total Earned
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Monthly Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Last Claim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {(incomeData?.assets ?? []).map((asset, idx) => (
                    <tr key={String(asset.id ?? asset.assetId ?? idx)} className="hover:bg-[color:var(--panel-2)] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium">{asset.name}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">{asset.symbol}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium tabular-nums">{asset.tokensOwned.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          ${asset.claimableAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium tabular-nums">
                          ${asset.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium tabular-nums">
                          ${asset.monthlyRate}/mo
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[color:var(--text-muted)]">{asset.lastClaimDate}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => asset.tokenAddress && handleClaim(asset.tokenAddress as `0x${string}`)}
                          loading={claimingAsset === asset.tokenAddress}
                          disabled={claimingAsset !== null || wrongNetwork || asset.claimableAmount === 0 || !asset.tokenAddress}
                        >
                          Claim
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Claim History */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Distribution Ledger</h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[color:var(--bg)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {(incomeData?.claimHistory ?? []).map((claim, index) => (
                    <tr key={index} className="hover:bg-[color:var(--panel-2)] transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm">{claim.date}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium">{claim.asset}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">{claim.symbol}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          ${claim.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={`${explorerTxBaseUrl}${claim.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-[color:var(--accent-primary)] hover:text-[color:var(--accent-hover)]"
                        >
                          {claim.txHash.substring(0, 10)}...
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </MainLayout>
  );
}
