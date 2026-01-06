'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useReadContract, useReadContracts } from 'wagmi';
import Link from 'next/link';
import { ABIS, getContractsForChain, isContractsConfiguredFor } from '@/config/contracts';
import { chains } from '@/config/wagmi';
import { RequireWallet } from '@/components/wallet/RequireWallet';
import { formatUnits } from 'ethers';

type RegistryAsset = {
  token: `0x${string}`;
  owner: `0x${string}`;
  metadataURI: string;
  active: boolean;
};

export default function PortfolioPage() {
  return <PortfolioPageInner />;
}

function PortfolioPageInner() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const supportedChainIds: number[] = chains.map((c) => c.id);
  const readEnabledChainIds = React.useMemo(
    () => supportedChainIds.filter((id) => isContractsConfiguredFor(id, ['ASSET_REGISTRY'])),
    [supportedChainIds],
  );
  const wrongNetwork = Boolean(isConnected && !readEnabledChainIds.includes(chainId));

  const [indexedLoading, setIndexedLoading] = React.useState(false);
  const [indexedError, setIndexedError] = React.useState<string | null>(null);
  const [indexed, setIndexed] = React.useState<
    | null
    | {
        wallet: string;
        indexed: boolean;
        updatedAt: string | null;
        holdings: Array<{
          assetId: string;
          token: string;
          owner: string;
          metadataURI: string;
          active: boolean;
          name: string;
          symbol: string;
          decimals: number;
          balance: string;
        }>;
      }
  >(null);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isConnected || !address) {
        setIndexed(null);
        setIndexedError(null);
        return;
      }

      setIndexedLoading(true);
      setIndexedError(null);
      try {
        const res = await fetch(`/api/portfolio/${address}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load portfolio');
        if (!cancelled) setIndexed(json);
      } catch (e) {
        if (!cancelled) {
          setIndexed(null);
          setIndexedError(e instanceof Error ? e.message : 'Failed to load portfolio');
        }
      } finally {
        if (!cancelled) setIndexedLoading(false);
      }
    }

    run();
    const t = setInterval(run, 5_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [address, isConnected]);

  const { ASSET_REGISTRY } = getContractsForChain(chainId);
  const registryAddress = (ASSET_REGISTRY || '') as `0x${string}` | '';
  const registryAddressOrUndefined: `0x${string}` | undefined =
    registryAddress && registryAddress.length === 42 ? (registryAddress as `0x${string}`) : undefined;
  const registryConfigured = Boolean(registryAddressOrUndefined);

  const assetCountQuery = useReadContract({
    address: registryAddressOrUndefined,
    abi: ABIS.ASSET_REGISTRY,
    functionName: 'assetCount',
    query: {
      enabled: registryConfigured,
      refetchInterval: 3_000,
    },
  });

  const assetCount = Number(assetCountQuery.data ?? 0);
  const assetIds = React.useMemo(() => {
    if (!registryConfigured || !Number.isFinite(assetCount) || assetCount <= 0) return [];
    return Array.from({ length: assetCount }, (_, idx) => BigInt(idx + 1));
  }, [assetCount, registryConfigured]);

  const assetsQuery = useReadContracts({
    contracts: registryAddressOrUndefined
      ? assetIds.map((assetId) => ({
          address: registryAddressOrUndefined,
          abi: ABIS.ASSET_REGISTRY,
          functionName: 'getAsset',
          args: [assetId],
        }))
      : [],
    query: {
      enabled: registryConfigured && assetIds.length > 0,
      refetchInterval: 3_000,
    },
  });

  const registryAssets: Array<{ assetId: bigint; asset: RegistryAsset | null }> = React.useMemo(() => {
    if (!registryConfigured || assetIds.length === 0) return [];
    return assetIds.map((assetId, idx) => {
      const item = assetsQuery.data?.[idx];
      if (!item || item.status !== 'success' || !item.result) return { assetId, asset: null };
      const result = item.result as unknown as [
        `0x${string}`,
        `0x${string}`,
        string,
        boolean,
      ];
      return {
        assetId,
        asset: {
          token: result[0],
          owner: result[1],
          metadataURI: result[2],
          active: result[3],
        },
      };
    });
  }, [assetIds, assetsQuery.data, registryConfigured]);

  const tokenAddresses = React.useMemo(() => {
    const tokens = registryAssets
      .map((a) => a.asset?.token)
      .filter((t): t is `0x${string}` => Boolean(t));
    return Array.from(new Set(tokens));
  }, [registryAssets]);

  const tokenMetaQuery = useReadContracts({
    contracts: tokenAddresses.flatMap((token) => [
      {
        address: token,
        abi: ABIS.ASSET_TOKEN,
        functionName: 'name',
      },
      {
        address: token,
        abi: ABIS.ASSET_TOKEN,
        functionName: 'symbol',
      },
      {
        address: token,
        abi: ABIS.ERC20,
        functionName: 'decimals',
      },
    ]),
    query: {
      enabled: isConnected && tokenAddresses.length > 0,
      refetchInterval: 10_000,
    },
  });

  const balancesQuery = useReadContracts({
    contracts: isConnected && address
      ? tokenAddresses.map((token) => ({
          address: token,
          abi: ABIS.ERC20,
          functionName: 'balanceOf',
          args: [address],
        }))
      : [],
    query: {
      enabled: isConnected && Boolean(address) && tokenAddresses.length > 0,
      refetchInterval: 3_000,
    },
  });

  const tokenMetaByAddress = React.useMemo(() => {
    const map = new Map<string, { name?: string; symbol?: string; decimals?: number }>();
    if (!tokenAddresses.length) return map;
    for (let i = 0; i < tokenAddresses.length; i++) {
      const nameItem = tokenMetaQuery.data?.[i * 3];
      const symbolItem = tokenMetaQuery.data?.[i * 3 + 1];
      const decimalsItem = tokenMetaQuery.data?.[i * 3 + 2];

      map.set(tokenAddresses[i], {
        name: nameItem?.status === 'success' ? (nameItem.result as string) : undefined,
        symbol: symbolItem?.status === 'success' ? (symbolItem.result as string) : undefined,
        decimals: decimalsItem?.status === 'success' ? Number(decimalsItem.result) : undefined,
      });
    }
    return map;
  }, [tokenAddresses, tokenMetaQuery.data]);

  const balancesByAddress = React.useMemo(() => {
    const map = new Map<string, bigint>();
    if (!tokenAddresses.length) return map;
    for (let i = 0; i < tokenAddresses.length; i++) {
      const item = balancesQuery.data?.[i];
      map.set(
        tokenAddresses[i],
        item?.status === 'success' ? (item.result as unknown as bigint) : 0n,
      );
    }
    return map;
  }, [tokenAddresses, balancesQuery.data]);

  const holdings = React.useMemo(() => {
    return registryAssets
      .filter((row) => row.asset && row.asset.active)
      .map((row) => {
        const token = row.asset!.token;
        const meta = tokenMetaByAddress.get(token);
        const balance = balancesByAddress.get(token) ?? 0n;
        const decimals = meta?.decimals ?? 18;
        const balanceFloat = Number(balance) / 10 ** decimals;
        return {
          assetId: row.assetId,
          token,
          owner: row.asset!.owner,
          metadataURI: row.asset!.metadataURI,
          name: meta?.name ?? 'Unknown Token',
          symbol: meta?.symbol ?? 'TOKEN',
          balance,
          balanceFloat,
        };
      })
      .filter((h) => h.balance > 0n)
      .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
  }, [balancesByAddress, registryAssets, tokenMetaByAddress]);

  const displayedHoldings = indexed?.holdings
    ? indexed.holdings
        .filter((h) => h.active)
        .map((h) => {
          let balanceFloat = 0;
          try {
            balanceFloat = Number.parseFloat(formatUnits(BigInt(h.balance), h.decimals ?? 18));
          } catch {
            balanceFloat = 0;
          }
          return {
            assetId: BigInt(h.assetId),
            token: h.token as `0x${string}`,
            owner: h.owner as `0x${string}`,
            metadataURI: h.metadataURI,
            active: h.active,
            name: h.name,
            symbol: h.symbol,
            balanceFloat,
          };
        })
        .filter((h) => h.balanceFloat > 0)
    : holdings;

  if (!isConnected) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <RequireWallet supportedChainIds={readEnabledChainIds} />
        </div>
      </MainLayout>
    );
  }

  if (indexedLoading && !indexed) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Alert type="info" message="Loading portfolio…" />
        </div>
      </MainLayout>
    );
  }

  if (wrongNetwork) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Alert type="error" message="Wrong network. Switch to a supported network to view your portfolio." />
        </div>
      </MainLayout>
    );
  }

  if (!registryConfigured) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Alert
            type="warning"
            message="Contracts are not configured for the connected network. Configure NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS_<SUFFIX> (recommended) or set NEXT_PUBLIC_DEFAULT_CHAIN_ID and NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS for a single-chain deployment."
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Holdings ledger for the connected wallet.
          </p>
        </div>

        {wrongNetwork && (
          <div className="mb-6">
            <Alert type="error" message="Wrong network. Switch to a supported network to perform write actions." />
          </div>
        )}

        {indexedError && (
          <div className="mb-6">
            <Alert type="error" message={indexedError} />
          </div>
        )}

        <div className="surface rounded-lg">
          <div className="px-6 py-4 border-b border-[color:var(--border)] flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Holdings</div>
              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                Wallet: <span className="font-mono">{address || '—'}</span>
              </div>
            </div>
            <div className="text-xs text-[color:var(--text-muted)]">
              {indexedLoading
                ? 'Loading index…'
                : indexed?.updatedAt
                  ? `Indexed: ${indexed.updatedAt}`
                  : assetCountQuery.isLoading
                    ? 'Loading registry…'
                    : `Registered assets: ${assetCount}`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[color:var(--bg)] border-b border-[color:var(--border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Asset ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Token</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Metadata</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {displayedHoldings.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-sm text-[color:var(--text-muted)]" colSpan={9}>
                      No holdings found for this wallet.
                    </td>
                  </tr>
                ) : (
                  displayedHoldings.map((h: any) => (
                    <tr key={`${String(h.assetId)}-${h.token}`} className="hover:bg-[color:var(--panel-2)] transition-colors">
                      <td className="px-6 py-4 text-sm font-mono">{String(h.assetId)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium">{h.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium">{h.symbol}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="font-semibold tabular-nums">
                          {Number(h.balanceFloat).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[color:var(--text-muted)] font-mono break-all">{h.token}</td>
                      <td className="px-6 py-4 text-xs text-[color:var(--text-muted)] font-mono break-all">{h.owner}</td>
                      <td className="px-6 py-4 text-sm">{h.active ? 'Verified' : 'Unverified'}</td>
                      <td className="px-6 py-4 text-xs text-[color:var(--text-muted)] break-all">{h.metadataURI || '—'}</td>
                      <td className="px-6 py-4">
                        <Link href={`/assets/${String(h.assetId)}`}>
                          <Button size="sm" variant="primary">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
