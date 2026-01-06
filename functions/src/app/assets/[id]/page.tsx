'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useChainId, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ABIS, getContractsForChain, isContractsConfiguredFor } from '@/config/contracts';
import { MainLayout } from '@/components/layout/MainLayout';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { formatEther, formatUnits, parseEther, parseUnits } from 'viem';
import { chains } from '@/config/wagmi';
import { RequireWallet } from '@/components/wallet/RequireWallet';
import { OracleStatusDisplay } from '@/components/assets/OracleStatusDisplay';
import { TokenomicsDisplay } from '@/components/assets/TokenomicsDisplay';
import { LegalSummary } from '@/components/assets/LegalSummary';
import { AMMPoolHealth } from '@/components/assets/AMMPoolHealth';
import { Contract } from 'ethers';
import { useEthersSigner } from '@/hooks/useEthersSigner';

type RegistryAsset = {
  token: `0x${string}`;
  owner: `0x${string}`;
  metadataURI: string;
  active: boolean;
};

type AssetMetadata = {
  name?: string;
  description?: string;
  location?: string;
  assetType?: string;
  image?: string;
  documents?: Array<{ name: string; url: string; type: string }>;
};

export default function AssetDetailPage() {
  return <AssetDetailPageInner />;
}

function AssetDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chain = chains.find((c) => c.id === chainId);
  const signer = useEthersSigner();
  const supportedChainIds: number[] = chains.map((c) => c.id);
  const readEnabledChainIds = React.useMemo(
    () => supportedChainIds.filter((id) => isContractsConfiguredFor(id, ['ASSET_REGISTRY'])),
    [supportedChainIds],
  );
  const wrongNetwork = Boolean(isConnected && !readEnabledChainIds.includes(chainId));

  const { writeContract, data: txHash, error: txError, isPending: isTxPending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [primaryBuyAmount, setPrimaryBuyAmount] = React.useState('');
  const [ammBuyEth, setAmmBuyEth] = React.useState('');
  const [ammSellTokens, setAmmSellTokens] = React.useState('');
  const [redeemTokens, setRedeemTokens] = React.useState('');

  // Metadata and oracle verification state
  const [metadata, setMetadata] = React.useState<AssetMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = React.useState(false);
  const [metadataError, setMetadataError] = React.useState<string | null>(null);
  const [oracleVerified, setOracleVerified] = React.useState<boolean | null>(null);
  const [oracleChecking, setOracleChecking] = React.useState(false);
  const [oracleError, setOracleError] = React.useState<string | null>(null);

  const idRaw = params?.id ?? '';
  const assetId = React.useMemo(() => {
    try {
      if (!idRaw) return null;
      const n = Number(idRaw);
      if (!Number.isFinite(n) || n <= 0) return null;
      return BigInt(Math.floor(n));
    } catch {
      return null;
    }
  }, [idRaw]);

  const contracts = React.useMemo(() => getContractsForChain(chainId), [chainId]);

  const registryAddress = (contracts.ASSET_REGISTRY || '') as `0x${string}` | '';
  const registryAddressOrUndefined: `0x${string}` | undefined =
    registryAddress && registryAddress.length === 42
      ? (registryAddress as `0x${string}`)
      : undefined;
  const registryConfigured = Boolean(registryAddressOrUndefined);

  const assetQuery = useReadContract({
    address: registryAddressOrUndefined,
    abi: ABIS.ASSET_REGISTRY,
    functionName: 'getAsset',
    args: assetId ? [assetId] : undefined,
    query: {
      enabled: registryConfigured && Boolean(assetId),
      refetchInterval: 3_000,
    },
  });

  const asset: RegistryAsset | null = React.useMemo(() => {
    if (assetQuery.status !== 'success' || !assetQuery.data) return null;
    const result = assetQuery.data as unknown as [`0x${string}`, `0x${string}`, string, boolean];
    return {
      token: result[0],
      owner: result[1],
      metadataURI: result[2],
      active: result[3],
    };
  }, [assetQuery.data, assetQuery.status]);

  const tokenMetaQuery = useReadContracts({
    contracts: asset
      ? [
          { address: asset.token, abi: ABIS.ASSET_TOKEN, functionName: 'name' },
          { address: asset.token, abi: ABIS.ASSET_TOKEN, functionName: 'symbol' },
          { address: asset.token, abi: ABIS.ERC20, functionName: 'decimals' },
        ]
      : [],
    query: {
      enabled: Boolean(asset),
      refetchInterval: 10_000,
    },
  });

  const balanceQuery = useReadContract({
    address: asset?.token,
    abi: ABIS.ERC20,
    functionName: 'balanceOf',
    args: isConnected && address && asset ? [address] : undefined,
    query: {
      enabled: Boolean(asset) && isConnected && Boolean(address),
      refetchInterval: 3_000,
    },
  });

  const tokenName = tokenMetaQuery.data?.[0]?.status === 'success'
    ? (tokenMetaQuery.data?.[0].result as string)
    : '—';
  const tokenSymbol = tokenMetaQuery.data?.[1]?.status === 'success'
    ? (tokenMetaQuery.data?.[1].result as string)
    : '—';
  const tokenDecimals = tokenMetaQuery.data?.[2]?.status === 'success'
    ? Number(tokenMetaQuery.data?.[2].result)
    : 18;
  const balance = balanceQuery.status === 'success' ? (balanceQuery.data as unknown as bigint) : 0n;
  const balanceFloat = Number(balance) / 10 ** (Number.isFinite(tokenDecimals) ? tokenDecimals : 18);

  // Fetch total supply for tokenomics
  const totalSupplyQuery = useReadContract({
    address: asset?.token,
    abi: ABIS.ASSET_TOKEN,
    functionName: 'totalSupply',
    query: {
      enabled: Boolean(asset),
      refetchInterval: 10_000,
    },
  });
  const totalSupply = totalSupplyQuery.status === 'success' ? (totalSupplyQuery.data as unknown as bigint) : 0n;

  // Fetch and parse metadata
  React.useEffect(() => {
    if (!asset?.metadataURI) {
      setMetadata(null);
      setMetadataError(null);
      return;
    }

    const fetchMetadata = async () => {
      setMetadataLoading(true);
      setMetadataError(null);
      try {
        const uri = asset.metadataURI.startsWith('ipfs://')
          ? `https://ipfs.io/ipfs/${asset.metadataURI.replace('ipfs://', '')}`
          : asset.metadataURI;

        const res = await fetch(uri);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const docs = Array.isArray(json?.documents)
          ? json.documents.map((d: any) => ({
              name: d?.name || 'Document',
              url: d?.uri || d?.url || '',
              type: d?.type || 'unknown',
            })).filter((d: any) => d.url)
          : [];

        setMetadata({
          name: json?.name,
          description: json?.description,
          location: json?.location,
          assetType: json?.assetType,
          image: json?.image,
          documents: docs,
        });
      } catch (err) {
        setMetadataError(`Failed to load metadata: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchMetadata();
  }, [asset?.metadataURI]);

  // Check oracle verification
  React.useEffect(() => {
    if (!asset?.token || !contracts.PROOF_OF_RESERVE) {
      setOracleVerified(null);
      setOracleError(null);
      return;
    }

    const checkOracle = async () => {
      setOracleChecking(true);
      setOracleError(null);
      try {
        const porContract = new Contract(
          contracts.PROOF_OF_RESERVE as string,
          ['function checkReserve(address token) view returns (uint256 reserveAmount, uint256 totalSupply, bool isValid)'],
          signer || undefined,
        );
        const result = await porContract.checkReserve(asset.token);
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
  }, [asset?.token, contracts.PROOF_OF_RESERVE, signer]);

  if (!isConnected) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <RequireWallet supportedChainIds={readEnabledChainIds} />
        </div>
      </MainLayout>
    );
  }

  const finalSaleAddress = (contracts.FINAL_SALE || '') as `0x${string}` | '';
  const finalSaleAddressOrUndefined: `0x${string}` | undefined =
    finalSaleAddress && finalSaleAddress.length === 42 ? (finalSaleAddress as `0x${string}`) : undefined;

  const finalSalePriceQuery = useReadContract({
    address: finalSaleAddressOrUndefined,
    abi: ABIS.FINAL_SALE,
    functionName: 'pricePerTokenWei',
    args: asset ? [asset.token] : undefined,
    query: {
      enabled: Boolean(finalSaleAddressOrUndefined) && Boolean(asset),
      refetchInterval: 5_000,
    },
  });
  const finalSalePricePerTokenWei =
    finalSalePriceQuery.status === 'success' ? (finalSalePriceQuery.data as unknown as bigint) : 0n;

  const redeemAmountBaseUnits = React.useMemo(() => {
    const raw = redeemTokens.trim();
    if (!raw) return 0n;
    try {
      return parseUnits(raw, Number.isFinite(tokenDecimals) ? tokenDecimals : 18);
    } catch {
      return 0n;
    }
  }, [redeemTokens, tokenDecimals]);

  const redeemPayoutWei = React.useMemo(() => {
    if (redeemAmountBaseUnits <= 0n || finalSalePricePerTokenWei <= 0n) return 0n;
    // FinalSale is priced as wei per 1 token (1e18 units)
    const scale = 10n ** 18n;
    return (redeemAmountBaseUnits * finalSalePricePerTokenWei) / scale;
  }, [finalSalePricePerTokenWei, redeemAmountBaseUnits]);

  const primarySaleAddress = (contracts.PRIMARY_SALE || '') as `0x${string}` | '';
  const primarySaleAddressOrUndefined: `0x${string}` | undefined =
    primarySaleAddress && primarySaleAddress.length === 42 ? (primarySaleAddress as `0x${string}`) : undefined;

  const primarySaleQuery = useReadContract({
    address: primarySaleAddressOrUndefined,
    abi: ABIS.PRIMARY_SALE,
    functionName: 'getSale',
    args: asset ? [asset.token] : undefined,
    query: {
      enabled: Boolean(primarySaleAddressOrUndefined) && Boolean(asset),
      refetchInterval: 5_000,
    },
  });

  const sale = React.useMemo(() => {
    if (primarySaleQuery.status !== 'success' || !primarySaleQuery.data) return null;
    const raw: any = primarySaleQuery.data;
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'token' in raw) return raw as any;
    if (Array.isArray(raw)) {
      return {
        token: raw[0],
        seller: raw[1],
        pricePerToken: raw[2],
        tokensForSale: raw[3],
        tokensSold: raw[4],
        fundsWithdrawn: raw[5],
        startTime: raw[6],
        endTime: raw[7],
        active: raw[8],
        finalized: raw[9],
      } as any;
    }
    return null;
  }, [primarySaleQuery.data, primarySaleQuery.status]);

  const ammPoolAddress = (contracts.AMM_POOL || '') as `0x${string}` | '';
  const ammPoolAddressOrUndefined: `0x${string}` | undefined =
    ammPoolAddress && ammPoolAddress.length === 42 ? (ammPoolAddress as `0x${string}`) : undefined;

  const ammTokenQuery = useReadContract({
    address: ammPoolAddressOrUndefined,
    abi: ABIS.AMM_POOL,
    functionName: 'token',
    query: {
      enabled: Boolean(ammPoolAddressOrUndefined),
      refetchInterval: 10_000,
    },
  });

  const ammMatchesAsset = React.useMemo(() => {
    if (!asset) return false;
    if (ammTokenQuery.status !== 'success' || !ammTokenQuery.data) return false;
    return (ammTokenQuery.data as `0x${string}`).toLowerCase() === asset.token.toLowerCase();
  }, [ammTokenQuery.data, ammTokenQuery.status, asset]);

  const ammReservesQuery = useReadContract({
    address: ammPoolAddressOrUndefined,
    abi: ABIS.AMM_POOL,
    functionName: 'getReserves',
    query: {
      enabled: Boolean(ammPoolAddressOrUndefined) && ammMatchesAsset,
      refetchInterval: 5_000,
    },
  });

  const [reserveToken, reserveETH] = React.useMemo(() => {
    if (ammReservesQuery.status !== 'success' || !ammReservesQuery.data) return [0n, 0n] as const;
    const raw = ammReservesQuery.data as unknown as [bigint, bigint];
    return [raw[0] ?? 0n, raw[1] ?? 0n] as const;
  }, [ammReservesQuery.data, ammReservesQuery.status]);

  const sellAmountBaseUnits = React.useMemo(() => {
    const raw = ammSellTokens.trim();
    if (!raw) return 0n;
    try {
      return parseUnits(raw, Number.isFinite(tokenDecimals) ? tokenDecimals : 18);
    } catch {
      return 0n;
    }
  }, [ammSellTokens, tokenDecimals]);

  const allowanceQuery = useReadContract({
    address: asset?.token,
    abi: ABIS.ERC20,
    functionName: 'allowance',
    args: isConnected && address && asset && ammPoolAddressOrUndefined ? [address, ammPoolAddressOrUndefined] : undefined,
    query: {
      enabled: Boolean(asset) && Boolean(ammPoolAddressOrUndefined) && ammMatchesAsset && isConnected && Boolean(address),
      refetchInterval: 5_000,
    },
  });
  const allowance = allowanceQuery.status === 'success' ? (allowanceQuery.data as unknown as bigint) : 0n;
  const needsApproval = sellAmountBaseUnits > 0n && allowance < sellAmountBaseUnits;

  const ammBuyEthWei = React.useMemo(() => {
    const raw = ammBuyEth.trim();
    if (!raw) return 0n;
    try {
      return parseEther(raw);
    } catch {
      return 0n;
    }
  }, [ammBuyEth]);

  const ammBuyQuoteQuery = useReadContract({
    address: ammPoolAddressOrUndefined,
    abi: ABIS.AMM_POOL,
    functionName: 'getAmountOut',
    args: ammBuyEthWei > 0n ? [ammBuyEthWei, true] : undefined,
    query: {
      enabled: Boolean(ammPoolAddressOrUndefined) && ammMatchesAsset && ammBuyEthWei > 0n,
      refetchInterval: 5_000,
    },
  });
  const ammBuyTokensOut = ammBuyQuoteQuery.status === 'success' ? (ammBuyQuoteQuery.data as unknown as bigint) : 0n;

  const ammSellQuoteQuery = useReadContract({
    address: ammPoolAddressOrUndefined,
    abi: ABIS.AMM_POOL,
    functionName: 'getAmountOut',
    args: sellAmountBaseUnits > 0n ? [sellAmountBaseUnits, false] : undefined,
    query: {
      enabled: Boolean(ammPoolAddressOrUndefined) && ammMatchesAsset && sellAmountBaseUnits > 0n,
      refetchInterval: 5_000,
    },
  });
  const ammSellEthOut = ammSellQuoteQuery.status === 'success' ? (ammSellQuoteQuery.data as unknown as bigint) : 0n;

  const primaryBuyAmountBaseUnits = React.useMemo(() => {
    const raw = primaryBuyAmount.trim();
    if (!raw) return 0n;
    try {
      return parseUnits(raw, Number.isFinite(tokenDecimals) ? tokenDecimals : 18);
    } catch {
      return 0n;
    }
  }, [primaryBuyAmount, tokenDecimals]);

  const primaryCostWei = React.useMemo(() => {
    if (!sale) return 0n;
    const pricePerTokenWei = BigInt(sale.pricePerToken ?? 0);
    if (pricePerTokenWei <= 0n || primaryBuyAmountBaseUnits <= 0n) return 0n;
    const scale = 10n ** 18n;
    const product = pricePerTokenWei * primaryBuyAmountBaseUnits;
    let cost = product / scale;
    if (product % scale !== 0n) cost += 1n;
    return cost;
  }, [primaryBuyAmountBaseUnits, sale]);

  React.useEffect(() => {
    if (isTxConfirmed) {
      setPendingAction(null);
    }
  }, [isTxConfirmed]);

  React.useEffect(() => {
    if (txError) {
      setPendingAction(null);
    }
  }, [txError]);

  const handlePrimaryBuy = async () => {
    if (!asset) return;
    if (!primarySaleAddressOrUndefined) {
      alert('PrimarySale contract not deployed. Please deploy contracts first.');
      return;
    }
    if (!isConnected) {
      alert('Please connect your wallet to purchase.');
      return;
    }
    if (wrongNetwork) {
      alert('Wrong network. Switch to a supported network to purchase.');
      return;
    }
    if (primaryBuyAmountBaseUnits <= 0n || primaryCostWei <= 0n) {
      alert('Enter a valid token amount.');
      return;
    }

    setPendingAction('primary-buy');
    try {
      await writeContract({
        address: primarySaleAddressOrUndefined,
        abi: ABIS.PRIMARY_SALE,
        functionName: 'purchaseTokens',
        args: [asset.token, primaryBuyAmountBaseUnits],
        value: primaryCostWei,
      });
    } catch (e) {
      console.error('Primary buy error:', e);
      setPendingAction(null);
      alert('Purchase failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleAmmBuy = async () => {
    if (!ammPoolAddressOrUndefined || !ammMatchesAsset) {
      alert('AMM pool not configured for this asset.');
      return;
    }
    if (!isConnected) {
      alert('Please connect your wallet to trade.');
      return;
    }
    if (wrongNetwork) {
      alert('Wrong network. Switch to a supported network to trade.');
      return;
    }
    if (ammBuyEthWei <= 0n) {
      alert('Enter a valid ETH amount.');
      return;
    }

    setPendingAction('amm-buy');
    try {
      await writeContract({
        address: ammPoolAddressOrUndefined,
        abi: ABIS.AMM_POOL,
        functionName: 'swapETHForTokens',
        args: [0n],
        value: ammBuyEthWei,
      });
    } catch (e) {
      console.error('AMM buy error:', e);
      setPendingAction(null);
      alert('Swap failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleApproveForAmmSell = async () => {
    if (!asset) return;
    if (!ammPoolAddressOrUndefined || !ammMatchesAsset) {
      alert('AMM pool not configured for this asset.');
      return;
    }
    if (!isConnected) {
      alert('Please connect your wallet.');
      return;
    }
    if (wrongNetwork) {
      alert('Wrong network. Switch to a supported network to trade.');
      return;
    }
    if (sellAmountBaseUnits <= 0n) {
      alert('Enter a valid token amount.');
      return;
    }

    setPendingAction('amm-approve');
    try {
      await writeContract({
        address: asset.token,
        abi: ABIS.ERC20,
        functionName: 'approve',
        args: [ammPoolAddressOrUndefined, sellAmountBaseUnits],
      });
    } catch (e) {
      console.error('Approve error:', e);
      setPendingAction(null);
      alert('Approve failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleAmmSell = async () => {
    if (!ammPoolAddressOrUndefined || !ammMatchesAsset) {
      alert('AMM pool not configured for this asset.');
      return;
    }
    if (!isConnected) {
      alert('Please connect your wallet to trade.');
      return;
    }
    if (wrongNetwork) {
      alert('Wrong network. Switch to a supported network to trade.');
      return;
    }
    if (sellAmountBaseUnits <= 0n) {
      alert('Enter a valid token amount.');
      return;
    }
    if (needsApproval) {
      alert('Approve the token for the pool first.');
      return;
    }

    setPendingAction('amm-sell');
    try {
      await writeContract({
        address: ammPoolAddressOrUndefined,
        abi: ABIS.AMM_POOL,
        functionName: 'swapTokensForETH',
        args: [sellAmountBaseUnits, 0n],
      });
    } catch (e) {
      console.error('AMM sell error:', e);
      setPendingAction(null);
      alert('Swap failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleRedeem = async () => {
    if (!asset) return;
    if (!finalSaleAddressOrUndefined) {
      alert('FinalSale contract not deployed. Please deploy contracts first.');
      return;
    }
    if (!isConnected) {
      alert('Please connect your wallet to redeem.');
      return;
    }
    if (wrongNetwork) {
      alert('Wrong network. Switch to a supported network to redeem.');
      return;
    }
    if (finalSalePricePerTokenWei <= 0n) {
      alert('Exit price not set for this token.');
      return;
    }
    if (redeemAmountBaseUnits <= 0n) {
      alert('Enter a valid token amount.');
      return;
    }
    if (redeemAmountBaseUnits > balance) {
      alert('You do not have enough tokens to redeem that amount.');
      return;
    }

    setPendingAction('redeem');
    try {
      await writeContract({
        address: finalSaleAddressOrUndefined,
        abi: ABIS.FINAL_SALE,
        functionName: 'redeem',
        args: [asset.token, redeemAmountBaseUnits],
      });
    } catch (e) {
      console.error('Redeem error:', e);
      setPendingAction(null);
      alert('Redeem failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Asset Detail</h1>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Complete disclosure for asset ID <span className="font-mono">{idRaw || '—'}</span>
              </p>
            </div>
            <Link
              href="/marketplace"
              className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
            >
              ← Back to marketplace
            </Link>
          </div>
        </div>

        {!registryConfigured && (
          <Alert
            type="warning"
            message="Contracts are not configured for this network. Deploy contracts and configure NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS_* env vars."
          />
        )}

        {wrongNetwork && (
          <div className="mt-4">
            <Alert type="error" message="Wrong network. Switch to a supported network to perform write actions." />
          </div>
        )}

        {registryConfigured && !assetId && (
          <Alert type="warning" message="Invalid asset id." />
        )}

        {registryConfigured && assetId && assetQuery.isLoading && (
          <div className="surface rounded-lg p-6">Loading asset…</div>
        )}

        {registryConfigured && assetId && assetQuery.isError && (
          <Alert
            type="error"
            message="Failed to load asset from registry. Verify Anvil is running and the registry address is correct."
          />
        )}

        {registryConfigured && asset && (
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="surface rounded-lg p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {metadata?.image && (
                  <div className="md:w-48 h-48 bg-[color:var(--panel-2)] rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={metadata.image.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${metadata.image.replace('ipfs://', '')}` : metadata.image}
                      alt={metadata.name || tokenName || 'Asset'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold">{metadata?.name || tokenName || 'Asset'}</h2>
                  {metadata?.assetType && (
                    <div className="mt-1 text-sm text-[color:var(--text-muted)]">Type: {metadata.assetType}</div>
                  )}
                  {metadata?.location && (
                    <div className="mt-1 text-sm text-[color:var(--text-muted)]">📍 {metadata.location}</div>
                  )}
                  {metadata?.description && (
                    <p className="mt-3 text-sm text-[color:var(--text-muted)]">{metadata.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="text-xs text-[color:var(--text-muted)]">
                      Token: <a
                        href={`https://sepolia.etherscan.io/address/${asset.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[color:var(--accent)] hover:underline"
                      >
                        {asset.token.slice(0, 6)}...{asset.token.slice(-4)}
                      </a>
                    </div>
                    <div className="text-xs">
                      {asset.active ? (
                        <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-md">✓ Registry Approved</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/10 text-gray-500 rounded-md">Unverified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Summary */}
            <LegalSummary
              metadataURI={asset.metadataURI}
              documents={metadata?.documents || []}
              loading={metadataLoading}
              error={metadataError}
              onRetry={() => {
                // Trigger refetch by clearing metadata
                setMetadata(null);
                setMetadataError(null);
              }}
            />

            {/* Document Status - Always Visible */}
            <div className="surface rounded-lg p-6 border border-[color:var(--border)]">
              <h3 className="text-lg font-semibold mb-4">📄 Document Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[color:var(--border)]">
                  <span className="text-sm text-[color:var(--text-muted)]">Documents:</span>
                  {metadataLoading ? (
                    <span className="text-sm font-medium text-gray-400">⏳ Loading...</span>
                  ) : metadata?.documents && metadata.documents.length > 0 ? (
                    <span className="text-sm font-medium text-green-500">✓ {metadata.documents.length} Uploaded</span>
                  ) : (
                    <span className="text-sm font-medium text-yellow-500">⚠ No Documents</span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[color:var(--border)]">
                  <span className="text-sm text-[color:var(--text-muted)]">Verification:</span>
                  {oracleChecking ? (
                    <span className="text-sm font-medium text-gray-400">⏳ Checking...</span>
                  ) : (
                    <span className={`text-sm font-medium ${oracleVerified === true ? 'text-green-500' : oracleVerified === false ? 'text-red-500' : 'text-yellow-500'}`}>
                      {oracleVerified === true ? '✓ Verified' : oracleVerified === false ? '✗ Failed' : '⏳ Pending Oracle'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-[color:var(--text-muted)]">Document Hashes:</span>
                  <button 
                    className="text-sm font-medium text-[color:var(--accent)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!metadata?.documents || metadata.documents.length === 0}
                    onClick={() => {
                      if (!metadata?.documents || metadata.documents.length === 0) return;
                      
                      // Extract IPFS CIDs or show URLs
                      const extractHash = (url: string) => {
                        // Extract IPFS CID from URL
                        if (url.includes('ipfs://')) {
                          return url.replace('ipfs://', '');
                        } else if (url.includes('/ipfs/')) {
                          const parts = url.split('/ipfs/');
                          return parts[1]?.split('/')[0] || url;
                        }
                        // If not IPFS, return the URL itself
                        return url;
                      };
                      
                      const hashList = metadata.documents.map((d, i) => 
                        `${i + 1}. ${d.name}\n   Hash: ${extractHash(d.url)}`
                      ).join('\n\n');
                      
                      alert('📄 Document Hashes:\n\n' + hashList);
                    }}
                  >
                    {metadata?.documents && metadata.documents.length > 0 ? 'View Hashes →' : 'No Hashes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Oracle Status */}
            <OracleStatusDisplay
              oracleVerified={oracleVerified}
              oracleChecking={oracleChecking}
              oracleError={oracleError}
              contracts={contracts}
              chainId={chainId}
            />

            {/* Tokenomics */}
            <TokenomicsDisplay
              tokenAddress={asset.token}
              tokenName={tokenName}
              tokenSymbol={tokenSymbol}
              tokenDecimals={tokenDecimals}
              totalSupply={totalSupply}
              userBalance={balance}
              chainId={chainId}
            />

            {/* AMM Pool Health */}
            {ammPoolAddressOrUndefined && ammMatchesAsset && (
              <AMMPoolHealth
                poolAddress={ammPoolAddressOrUndefined}
                reserveToken={reserveToken}
                reserveETH={reserveETH}
                tokenSymbol={tokenSymbol}
                tokenDecimals={tokenDecimals}
                chainId={chainId}
              />
            )}

            {/* Proceed to Purchase CTA */}
            <div className="surface rounded-lg p-6 border-2 border-[color:var(--accent)]">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Ready to Purchase?</h3>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                    {oracleVerified === true
                      ? 'Oracle verification passed. You can proceed to purchase this asset.'
                      : oracleVerified === false
                      ? 'Oracle verification failed. Purchase is disabled until verification passes.'
                      : 'Checking oracle verification status...'}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  disabled={oracleVerified !== true || oracleChecking}
                  onClick={() => router.push(`/purchase?assetId=${encodeURIComponent(idRaw)}`)}
                >
                  {oracleVerified === true ? '→ Proceed to Purchase' : 'Purchase Unavailable'}
                </Button>
              </div>
            </div>

            {/* Trading & Management (Advanced) */}
            <details className="surface rounded-lg">
              <summary className="px-6 py-4 cursor-pointer hover:bg-[color:var(--panel-2)] transition-colors">
                <span className="text-sm font-semibold">⚙️ Advanced Trading & Management</span>
                <span className="ml-2 text-xs text-[color:var(--text-muted)]">(Primary Sale, AMM, Exit)</span>
              </summary>
              <div className="px-6 pb-6 pt-2 border-t border-[color:var(--border)]">
                {txError && (
                  <div className="mb-6">
                    <Alert type="error" message={`Transaction failed: ${txError.message}`} />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Primary Sale */}
                  <div className="surface rounded-lg border border-[color:var(--border)]">
                    <div className="px-6 py-4 border-b border-[color:var(--border)]">
                      <div className="text-sm font-semibold">Primary Sale</div>
                      <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                        Contract: <span className="font-mono">{primarySaleAddressOrUndefined ?? '—'}</span>
                      </div>
                    </div>

                    <div className="px-6 py-4">
                      {primarySaleAddressOrUndefined && sale ? (
                        <div className="space-y-4">
                          <div className="text-sm text-[color:var(--text-muted)]">
                            Price: <span className="text-[color:var(--text)] font-semibold">{formatEther(BigInt(sale.pricePerToken ?? 0))} ETH</span> per token
                          </div>
                          <div className="text-sm text-[color:var(--text-muted)]">
                            Remaining: <span className="text-[color:var(--text)] font-semibold">{formatUnits(BigInt(sale.tokensForSale ?? 0) - BigInt(sale.tokensSold ?? 0), tokenDecimals)}</span> {tokenSymbol}
                          </div>

                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="block text-xs text-[color:var(--text-muted)] mb-1">Buy amount ({tokenSymbol})</label>
                              <input
                                value={primaryBuyAmount}
                                onChange={(e) => setPrimaryBuyAmount(e.target.value)}
                                className="w-full px-3 py-2 surface rounded-lg border border-[color:var(--border)]"
                                placeholder="e.g. 10"
                              />
                              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                                Est. cost: {primaryCostWei > 0n ? `${formatEther(primaryCostWei)} ETH` : '—'}
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handlePrimaryBuy}
                              loading={pendingAction === 'primary-buy' && (isTxPending || isTxConfirming)}
                              disabled={pendingAction !== null}
                            >
                              Buy
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Alert
                          type="info"
                          message={
                            primarySaleAddressOrUndefined
                              ? 'No primary sale found for this token (or it is not active).'
                              : 'PrimarySale contract not configured.'
                          }
                        />
                      )}
                    </div>
                  </div>

                  {/* AMM Trading */}
                  <div className="surface rounded-lg border border-[color:var(--border)]">
                    <div className="px-6 py-4 border-b border-[color:var(--border)]">
                      <div className="text-sm font-semibold">AMM Trading</div>
                      <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                        Pool: <span className="font-mono">{ammPoolAddressOrUndefined ?? '—'}</span>
                      </div>
                    </div>

                    <div className="px-6 py-4 space-y-6">
                      {ammPoolAddressOrUndefined && ammMatchesAsset ? (
                        <>
                          <div className="text-xs text-[color:var(--text-muted)]">
                            Reserves: {formatUnits(reserveToken, tokenDecimals)} {tokenSymbol} / {formatEther(reserveETH)} ETH
                          </div>

                          <div className="surface rounded-lg p-4 border border-[color:var(--border)]">
                            <div className="text-sm font-semibold mb-3">Buy {tokenSymbol} (ETH → Token)</div>
                            <div className="flex items-end gap-3">
                              <div className="flex-1">
                                <label className="block text-xs text-[color:var(--text-muted)] mb-1">ETH in</label>
                                <input
                                  value={ammBuyEth}
                                  onChange={(e) => setAmmBuyEth(e.target.value)}
                                  className="w-full px-3 py-2 surface rounded-lg border border-[color:var(--border)]"
                                  placeholder="e.g. 0.1"
                                />
                                <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                                  Est. tokens out: {ammBuyTokensOut > 0n ? formatUnits(ammBuyTokensOut, tokenDecimals) : '—'}
                                </div>
                              </div>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={handleAmmBuy}
                                loading={pendingAction === 'amm-buy' && (isTxPending || isTxConfirming)}
                                disabled={pendingAction !== null}
                              >
                                Swap
                              </Button>
                            </div>
                          </div>

                          <div className="surface rounded-lg p-4 border border-[color:var(--border)]">
                            <div className="text-sm font-semibold mb-3">Sell {tokenSymbol} (Token → ETH)</div>
                            {needsApproval ? (
                              <div className="flex items-end gap-3">
                                <div className="flex-1">
                                  <div className="text-xs text-[color:var(--text-muted)]">
                                    Approval required to trade your tokens on the AMM pool.
                                  </div>
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={handleApproveForAmmSell}
                                  loading={pendingAction === 'amm-approve' && (isTxPending || isTxConfirming)}
                                  disabled={pendingAction !== null}
                                >
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-end gap-3">
                                <div className="flex-1">
                                  <label className="block text-xs text-[color:var(--text-muted)] mb-1">Tokens in</label>
                                  <input
                                    value={ammSellTokens}
                                    onChange={(e) => setAmmSellTokens(e.target.value)}
                                    className="w-full px-3 py-2 surface rounded-lg border border-[color:var(--border)]"
                                    placeholder="e.g. 10"
                                  />
                                  <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                                    Est. ETH out: {ammSellEthOut > 0n ? formatEther(ammSellEthOut) : '—'}
                                  </div>
                                </div>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={handleAmmSell}
                                  loading={pendingAction === 'amm-sell' && (isTxPending || isTxConfirming)}
                                  disabled={pendingAction !== null}
                                >
                                  Swap
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <Alert
                          type="info"
                          message={
                            ammPoolAddressOrUndefined
                              ? 'AMM pool is not configured for this token.'
                              : 'AMM pool address not configured.'
                          }
                        />
                      )}
                    </div>
                  </div>

                  {/* Exit (Final Sale) */}
                  <div className="surface rounded-lg border border-[color:var(--border)] lg:col-span-2">
                    <div className="px-6 py-4 border-b border-[color:var(--border)]">
                      <div className="text-sm font-semibold">Exit (Final Sale)</div>
                      <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                        Contract: <span className="font-mono">{finalSaleAddressOrUndefined ?? '—'}</span>
                      </div>
                    </div>

                    <div className="px-6 py-4">
                      {finalSaleAddressOrUndefined ? (
                        <div className="space-y-4">
                          <div className="text-sm text-[color:var(--text-muted)]">
                            Price: <span className="text-[color:var(--text)] font-semibold">{finalSalePricePerTokenWei > 0n ? `${formatEther(finalSalePricePerTokenWei)} ETH` : 'Not set'}</span> per token
                          </div>

                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="block text-xs text-[color:var(--text-muted)] mb-1">Redeem amount ({tokenSymbol})</label>
                              <input
                                value={redeemTokens}
                                onChange={(e) => setRedeemTokens(e.target.value)}
                                className="w-full px-3 py-2 surface rounded-lg border border-[color:var(--border)]"
                                placeholder="e.g. 100"
                              />
                              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                                Est. payout: {redeemPayoutWei > 0n ? `${formatEther(redeemPayoutWei)} ETH` : '—'}
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleRedeem}
                              loading={pendingAction === 'redeem' && (isTxPending || isTxConfirming)}
                              disabled={pendingAction !== null || finalSalePricePerTokenWei === 0n}
                            >
                              Redeem
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Alert type="info" message="FinalSale contract not configured." />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
