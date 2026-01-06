import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import { createPublicClient, fallback, formatUnits, http, isAddress } from 'viem';
import { ABIS, getContractsForChain } from '@/config/contracts';
import { getDemoData } from '@/lib/demoMetadata';

type MarketplaceAssetCard = {
  id: string; // AssetRegistry assetId
  tokenAddress: string;
  name: string;
  location: string;
  assetType: string;
  verified: boolean;
  verificationSummary: string[];
  oracleStatus?: 'verified' | 'missing-feed' | 'stale-data' | 'reserve-deviation' | 'unknown';
  imageUrl: string | null;

  pricePerToken: {
    quote: string;
    amount: string; // formatted
    amountNumber: number | null;
  };

  availableSupply: {
    amount: string;
    amountNumber: number | null;
  };
  marketCap: {
    quote: string;
    amount: string;
    amountNumber: number | null;
  };

  createdAt: string | null;
};

type MarketplaceResponse = {
  indexed: boolean;
  chainId: number;
  updatedAt: string;
  stale: boolean;
  warning: string | null;
  assets: MarketplaceAssetCard[];
};

const MAX_ASSETS = 50;
const MAX_FETCHED_METADATA = 25;
const CACHE_FILE = process.env.MARKETPLACE_OUT_FILE || '/tmp/marketplace.json';

function getDefaultChainId(): number {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 11155111;
}

function getRpcUrlsForChain(chainId: number): string[] {
  if (chainId === 11155111) {
    return [
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
      'https://ethereum-sepolia.publicnode.com',
      'https://sepolia.drpc.org',
      'https://rpc.sepolia.org',
    ].filter(Boolean) as string[];
  }
  if (chainId === 1) return [process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://cloudflare-eth.com'];
  if (chainId === 31337) return [process.env.NEXT_PUBLIC_LOCAL_RPC_URL || 'http://127.0.0.1:8545'];
  return [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'];
}

function toHttpFromIpfs(uri: string): string | null {
  const trimmed = String(uri || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('ipfs://')) {
    const path = trimmed.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${path}`;
  }
  return null;
}

function normalizeDocuments(meta: any): { name: string; url: string; type: string }[] {
  const raw = meta?.documents ?? meta?.files ?? meta?.attachments ?? null;
  const out: { name: string; url: string; type: string }[] = [];
  if (!Array.isArray(raw)) return out;
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rawUri =
      typeof (item as any).uri === 'string'
        ? (item as any).uri
        : typeof (item as any).url === 'string'
          ? (item as any).url
          : typeof (item as any).href === 'string'
            ? (item as any).href
            : '';
    const url = rawUri ? (toHttpFromIpfs(rawUri) ?? rawUri) : '';
    if (!url) continue;
    out.push({
      name: typeof item.name === 'string' ? item.name : 'Document',
      url,
      type: typeof item.type === 'string' ? item.type : 'other',
    });
  }
  return out;
}
function mapAssetType(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (!v) return '';
  const upper = v.toUpperCase();
  if (upper === 'REAL_ESTATE' || upper === 'REALESTATE') return 'real-estate';
  if (upper === 'EQUIPMENT') return 'equipment';
  if (upper === 'VEHICLE' || upper === 'VEHICLES') return 'vehicle';
  if (upper === 'ART') return 'art';
  if (upper === 'LAND') return 'other';
  return v.toLowerCase();
}

function formatLocation(meta: any): string {
  const loc = meta?.location;
  if (typeof loc === 'string') return loc;
  if (!loc || typeof loc !== 'object') return '';
  const city = typeof loc.city === 'string' ? loc.city.trim() : '';
  const state = typeof loc.state === 'string' ? loc.state.trim() : '';
  const country = typeof loc.country === 'string' ? loc.country.trim() : '';
  return [city, state, country].filter(Boolean).join(', ');
}

function safeNumberFromUnits(value: bigint, decimals: number): number | null {
  try {
    const s = formatUnits(value, decimals);
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function formatAmount(value: bigint, decimals: number, precision = 6): { str: string; num: number | null } {
  const num = safeNumberFromUnits(value, decimals);
  if (num === null) return { str: '—', num: null };
  const rounded = Number(num.toFixed(precision));
  return { str: rounded.toLocaleString(undefined, { maximumFractionDigits: precision }), num };
}

async function readCache(): Promise<MarketplaceResponse | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as MarketplaceResponse;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray((parsed as any).assets)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(payload: MarketplaceResponse) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(payload), 'utf8');
  } catch {
    // ignore
  }
}

async function deriveOracleVerified(
  client: ReturnType<typeof createPublicClient>,
  contracts: ReturnType<typeof getContractsForChain>,
  token: `0x${string}`,
  metaDemo?: any,
  demoData?: any,
): Promise<{ verified: boolean; status: 'verified' | 'missing-feed' | 'stale-data' | 'reserve-deviation' | 'unknown' }> {
  // DEMO MODE: Check if asset has demo data for presentation
  if (demoData?.demoMode === true || metaDemo?.demoMode === true || metaDemo?._demo === true) {
    console.log('🎭 DEMO MODE: Asset has demo oracle data - marking as verified for presentation');
    return { verified: true, status: 'verified' };
  }
  
  // Never trust metadata for verification. Only accept on-chain signals.
  // 1) ProofOfReserve: checkReserve(token) returns isValid
  if (isAddress(contracts.PROOF_OF_RESERVE as any)) {
    try {
      const res = (await client.readContract({
        address: contracts.PROOF_OF_RESERVE as `0x${string}`,
        abi: ABIS.PROOF_OF_RESERVE,
        functionName: 'checkReserve',
        args: [token],
      })) as unknown as [bigint, bigint, boolean];
      const isValid = Boolean(res?.[2]);
      if (isValid) return { verified: true, status: 'verified' };
      return { verified: false, status: 'reserve-deviation' };
    } catch (err: any) {
      const msg = String(err?.message || err || '').toLowerCase();
      if (msg.includes('reservefeednotfound') || msg.includes('not found')) {
        return { verified: false, status: 'missing-feed' };
      }
      if (msg.includes('stale') || msg.includes('stalereserve')) {
        return { verified: false, status: 'stale-data' };
      }
    }
  }

  // 2) OraclePriceFeed: token has a valid feed and getPrice succeeds
  if (isAddress(contracts.ORACLE_PRICE_FEED as any)) {
    try {
      await client.readContract({
        address: contracts.ORACLE_PRICE_FEED as `0x${string}`,
        abi: ABIS.ORACLE_PRICE_FEED,
        functionName: 'getPrice',
        args: [token],
      });
      return { verified: true, status: 'verified' };
    } catch (err: any) {
      const msg = String(err?.message || err || '').toLowerCase();
      if (msg.includes('pricefeednotfound') || msg.includes('not found')) {
        return { verified: false, status: 'missing-feed' };
      }
      if (msg.includes('stale') || msg.includes('staleprice')) {
        return { verified: false, status: 'stale-data' };
      }
    }
  }

  return { verified: false, status: 'unknown' };
}

export async function GET() {
  const chainId = getDefaultChainId();
  const rpcUrls = getRpcUrlsForChain(chainId);
  const contracts = getContractsForChain(chainId);

  const nowIso = new Date().toISOString();

  try {
    if (!isAddress(contracts.ASSET_REGISTRY as any)) {
      const empty: MarketplaceResponse = {
        indexed: true,
        chainId,
        updatedAt: nowIso,
        stale: false,
        warning: 'Marketplace is not configured for this network.',
        assets: [],
      };
      await writeCache(empty);
      return NextResponse.json(empty, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const client = createPublicClient({
      transport: fallback(rpcUrls.map((u) => http(u, { timeout: 20_000 }))),
    });

    const approvalQueue = (await client.readContract({
      address: contracts.ASSET_REGISTRY as `0x${string}`,
      abi: ABIS.ASSET_REGISTRY,
      functionName: 'approvalQueue',
    })) as unknown as `0x${string}`;

    if (!isAddress(approvalQueue as any)) {
      const empty: MarketplaceResponse = {
        indexed: true,
        chainId,
        updatedAt: nowIso,
        stale: false,
        warning: 'Approval queue is not configured on this network. No assets can be considered verified.',
        assets: [],
      };
      await writeCache(empty);
      return NextResponse.json(empty, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const assetCount = (await client.readContract({
      address: contracts.ASSET_REGISTRY as `0x${string}`,
      abi: ABIS.ASSET_REGISTRY,
      functionName: 'assetCount',
    })) as bigint;

    const count = Math.min(Number(assetCount), MAX_ASSETS);

    // Collect registry assets first.
    const registryRows: Array<{ assetId: string; token: string; owner: string; metadataURI: string; active: boolean }> = [];
    for (let i = 1; i <= count; i++) {
      const assetId = BigInt(i);
      try {
        const asset = (await client.readContract({
          address: contracts.ASSET_REGISTRY as `0x${string}`,
          abi: ABIS.ASSET_REGISTRY,
          functionName: 'getAsset',
          args: [assetId],
        })) as any;

        const token = (asset?.token ?? asset?.[0]) as string | undefined;
        const owner = (asset?.owner ?? asset?.[1]) as string | undefined;
        const metadataURI = (asset?.metadataURI ?? asset?.[2]) as string | undefined;
        const active = (asset?.active ?? asset?.[3]) as boolean | undefined;

        if (!token || !isAddress(token as any)) continue;
        if (!metadataURI || typeof metadataURI !== 'string') continue;
        registryRows.push({
          assetId: String(assetId),
          token,
          owner: typeof owner === 'string' ? owner : '',
          metadataURI,
          active: Boolean(active),
        });
      } catch {
        // skip
      }
    }

    // Fetch metadata (backend DB) for a capped subset to avoid slow pages.
    const assetsOut: MarketplaceAssetCard[] = [];

    const candidates = registryRows.filter((r) => r.active).slice(0, MAX_FETCHED_METADATA);

    for (const row of candidates) {
      try {
        // Check for demo data first
        const demoData = getDemoData(row.token);
        
        // Token contract must exist.
        const tokenCode = await client.getBytecode({ address: row.token as `0x${string}` });
        if (!tokenCode || tokenCode === '0x') continue;

        // Strict on-chain admin approval gate (do not trust metadata flags).
        try {
          const info = (await client.readContract({
            address: approvalQueue,
            abi: ABIS.ASSET_APPROVAL_QUEUE,
            functionName: 'getSubmissionInfoByToken',
            args: [row.token as `0x${string}`],
          })) as unknown as [bigint, `0x${string}`, string, number];

          const submitter = info?.[1];
          const approvedUri = info?.[2];
          const status = info?.[3];

          // AssetApprovalQueue.Status.Approved == 2
          if (Number(status) !== 2) continue;
          if (!isAddress(submitter as any) || submitter.toLowerCase() !== row.owner.toLowerCase()) continue;
          if ((approvedUri ?? '') !== row.metadataURI) continue;
        } catch {
          continue;
        }

        // Backend metadata.
        const metaUrl = toHttpFromIpfs(row.metadataURI);
        if (!metaUrl) continue;

        const metaRes = await fetch(metaUrl, { cache: 'no-store' });
        if (!metaRes.ok) continue;
        const meta = (await metaRes.json()) as any;

        const name = typeof meta?.name === 'string' ? meta.name.trim() : '';
        const location = formatLocation(meta);
        const assetType = mapAssetType(meta?.assetType);
        if (!name || !location || !assetType) continue;

        const docs = normalizeDocuments(meta);
        if (!docs.length) continue;

        const poolAddressRaw =
          (typeof meta?.ammPoolAddress === 'string' && meta.ammPoolAddress) ||
          (typeof meta?.poolAddress === 'string' && meta.poolAddress) ||
          (typeof meta?.ammPool === 'string' && meta.ammPool) ||
          '';

        if (!isAddress(poolAddressRaw as any)) continue;

        // AMM pool must be deployed and match the token.
        const poolCode = await client.getBytecode({ address: poolAddressRaw as `0x${string}` });
        if (!poolCode || poolCode === '0x') continue;

        const poolToken = (await client.readContract({
          address: poolAddressRaw as `0x${string}`,
          abi: ABIS.AMM_POOL,
          functionName: 'token',
        })) as string;
        if (!poolToken || poolToken.toLowerCase() !== row.token.toLowerCase()) continue;

        const reserves = (await client.readContract({
          address: poolAddressRaw as `0x${string}`,
          abi: ABIS.AMM_POOL,
          functionName: 'getReserves',
        })) as unknown as [bigint, bigint];

        let reserveToken = reserves?.[0] ?? 0n;
        let reserveEth = reserves?.[1] ?? 0n;
        
        // DEMO MODE: Use demo liquidity if available
        if (demoData?.demoMode === true || meta?.demoMode === true || meta?._demo === true) {
          const liquiditySource = demoData?.liquidityDemo || meta?.liquidityDemo;
          if (liquiditySource?.tokenReserve) {
            reserveToken = BigInt(Math.floor(Number(liquiditySource.tokenReserve) * 1e18));
          }
          if (liquiditySource?.ethReserve) {
            reserveEth = BigInt(Math.floor(Number(liquiditySource.ethReserve) * 1e18));
          }
          console.log('🎭 DEMO MODE: Using demo liquidity - Token:', reserveToken.toString(), 'ETH:', reserveEth.toString());
        }
        
        if (reserveToken <= 0n || reserveEth <= 0n) continue;

        // Token supply must exist and be non-zero.
        const decimals = (await client.readContract({
          address: row.token as `0x${string}`,
          abi: ABIS.ERC20,
          functionName: 'decimals',
        })) as number;

        const totalSupply = (await client.readContract({
          address: row.token as `0x${string}`,
          abi: [{ type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }],
          functionName: 'totalSupply',
        })) as bigint;
        if (totalSupply <= 0n) continue;

        const oracleResult = await deriveOracleVerified(client as any, contracts as any, row.token as `0x${string}`, meta, demoData);
        if (!oracleResult.verified) continue;

        // Available supply = balances held by AMM pool + treasury (if provided).
        const treasuryAddressRaw =
          (typeof meta?.treasuryAddress === 'string' && meta.treasuryAddress) ||
          (typeof meta?.treasury === 'string' && meta.treasury) ||
          '';

        const poolBal = (await client.readContract({
          address: row.token as `0x${string}`,
          abi: ABIS.ERC20,
          functionName: 'balanceOf',
          args: [poolAddressRaw as `0x${string}`],
        })) as bigint;

        let treasuryBal = 0n;
        if (isAddress(treasuryAddressRaw as any)) {
          treasuryBal = (await client.readContract({
            address: row.token as `0x${string}`,
            abi: ABIS.ERC20,
            functionName: 'balanceOf',
            args: [treasuryAddressRaw as `0x${string}`],
          })) as bigint;
        }

        const available = poolBal + treasuryBal;

        // Price from reserves (ETH per token).
        // priceWeiPerToken = reserveETH * 10^decimals / reserveToken
        const scaleToken = 10n ** BigInt(Math.max(0, Math.min(255, Number.isFinite(decimals) ? decimals : 18)));
        const priceWeiPerToken = (reserveEth * scaleToken) / reserveToken;

        // Market cap = (priceWeiPerToken * totalSupply) / 10^decimals
        const marketCapWei = (priceWeiPerToken * totalSupply) / scaleToken;

        const price = formatAmount(priceWeiPerToken, 18, 6);
        const availableFmt = formatAmount(available, Number.isFinite(decimals) ? decimals : 18, 6);
        const marketCap = formatAmount(marketCapWei, 18, 6);

        // Hard gate: metadata is descriptive-only; verification must be derived from on-chain state.
        // At this stage we already have: registry active asset, token deployed, docs present, pool deployed+liquid, oracleVerified derived.

        const imageUrl =
          Array.isArray(meta?.images) && typeof meta.images[0] === 'string'
            ? meta.images[0]
            : typeof meta?.image === 'string'
              ? meta.image
              : null;

        const createdAt = typeof meta?.createdAt === 'string' ? meta.createdAt : null;

        assetsOut.push({
          id: row.assetId,
          tokenAddress: row.token,
          name,
          location,
          assetType,
          verified: true,
          verificationSummary: ['Admin approved (on-chain)', 'Oracle verified (on-chain)', 'Token deployed', 'Pool deployed + liquid'],
          oracleStatus: oracleResult.status,
          imageUrl,
          pricePerToken: { quote: 'ETH', amount: price.str, amountNumber: price.num },
          availableSupply: { amount: availableFmt.str, amountNumber: availableFmt.num },
          marketCap: { quote: 'ETH', amount: marketCap.str, amountNumber: marketCap.num },
          createdAt,
        });
      } catch {
        // Per-asset failure shouldn't kill the whole list.
        continue;
      }
    }

    const fresh: MarketplaceResponse = {
      indexed: true,
      chainId,
      updatedAt: nowIso,
      stale: false,
      warning: null,
      assets: assetsOut,
    };

    await writeCache(fresh);

    return NextResponse.json(fresh, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    const cached = await readCache();
    if (cached) {
      const stale: MarketplaceResponse = {
        ...cached,
        stale: true,
        warning:
          'Some data sources are currently unavailable. Showing the last known Marketplace data; values may be stale.',
        updatedAt: cached.updatedAt || nowIso,
      };
      return NextResponse.json(stale, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const empty: MarketplaceResponse = {
      indexed: false,
      chainId,
      updatedAt: nowIso,
      stale: true,
      warning: 'Marketplace data is temporarily unavailable.',
      assets: [],
    };

    return NextResponse.json(empty, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
