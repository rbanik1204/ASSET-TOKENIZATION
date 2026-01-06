import { createPublicClient, fallback, formatUnits, http, isAddress, parseAbiItem } from 'viem';
import { ABIS, getContractsForChain } from '@/config/contracts';

type AdminActivityRow = {
  id: string;
  timestamp: string;
  event: string;
  ref: string;
};

type PendingAsset = {
  id: string;
  tokenAddress?: string | null;
  metadataURI?: string | null;
  name: string;
  symbol: string;
  location: string;
  assetType: string;
  description: string;
  submitter: string;
  submissionDate: string;
  status: 'pending' | 'approved' | 'rejected';
  documents: { name: string; url: string; type: string }[];
  requestedSupply: number;
  pricePerToken: number;
};

type IndexedAsset = {
  assetId: string;
  token: string;
  owner: string;
  metadataURI: string;
  active: boolean;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
};

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

function mapQueueStatus(value: unknown): 'pending' | 'approved' | 'rejected' {
  // AssetApprovalQueue.Status enum:
  // 0 None, 1 Pending, 2 Approved, 3 Rejected
  const n = typeof value === 'bigint' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (n === 2) return 'approved';
  if (n === 3) return 'rejected';
  return 'pending';
}

const MAX_ASSETS = 50;
const MAX_SUBMISSIONS = 50;
const MAX_ACTIVITY_ROWS = 100;
const LOOKBACK_BLOCKS = 10_000n;

async function safeGetBlockTimestamps(client: ReturnType<typeof createPublicClient>, blockNumbers: bigint[]) {
  const cache = new Map<string, string>();
  const uniq = Array.from(new Set(blockNumbers.map((b) => b.toString())));
  await Promise.all(
    uniq.map(async (key) => {
      try {
        const blockNumber = BigInt(key);
        const block = await client.getBlock({ blockNumber });
        const seconds = typeof block.timestamp === 'bigint' ? Number(block.timestamp) : Number(block.timestamp);
        const iso = Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
        cache.set(key, iso);
      } catch {
        cache.set(key, new Date().toISOString());
      }
    }),
  );
  return cache;
}

function formatUsd6(amount: bigint): number {
  const s = formatUnits(amount, 6);
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function buildIndexerSnapshot() {
  const chainId = getDefaultChainId();
  const rpcUrls = getRpcUrlsForChain(chainId);

  const client = createPublicClient({
    transport: fallback(rpcUrls.map((u) => http(u, { timeout: 20_000 }))),
  });
  const contracts = getContractsForChain(chainId);

  let latestBlock: bigint | null = null;
  try {
    latestBlock = await client.getBlockNumber();
  } catch {
    latestBlock = null;
  }
  const fromBlock =
    latestBlock && latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : latestBlock ? 0n : undefined;

  const out: any = {
    updatedAt: new Date().toISOString(),
    chainId,
    registry: { address: contracts.ASSET_REGISTRY || null },
    assets: [] as IndexedAsset[],
    admin: {
      queue: [] as PendingAsset[],
      activity: [] as AdminActivityRow[],
    },
    incomeDeposits: [],
    wallets: {},
    income: {},
  };

  // Assets (registry) - capped for fast responses
  if (isAddress(contracts.ASSET_REGISTRY as any)) {
    try {
      const assetCount = (await client.readContract({
        address: contracts.ASSET_REGISTRY as `0x${string}`,
        abi: ABIS.ASSET_REGISTRY,
        functionName: 'assetCount',
      })) as bigint;

      const count = Math.min(Number(assetCount), MAX_ASSETS);
      for (let i = 1; i <= count; i++) {
        const assetId = BigInt(i);
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

        out.assets.push({
          assetId: String(assetId),
          token: typeof token === 'string' ? token : '',
          owner: typeof owner === 'string' ? owner : '',
          metadataURI: typeof metadataURI === 'string' ? metadataURI : '',
          active: Boolean(active),
          name: null,
          symbol: null,
          decimals: null,
        });
      }
    } catch {
      // ignore: leave assets empty
    }
  }

  // Queue (best-effort)
  if (isAddress(contracts.ASSET_APPROVAL_QUEUE as any)) {
    try {
      const submissionCount = (await client.readContract({
        address: contracts.ASSET_APPROVAL_QUEUE as `0x${string}`,
        abi: ABIS.ASSET_APPROVAL_QUEUE,
        functionName: 'submissionCount',
      })) as bigint;

      const count = Math.min(Number(submissionCount), MAX_SUBMISSIONS);
      for (let i = 1; i <= count; i++) {
        const submissionId = BigInt(i);

        let row: any;
        try {
          row = (await client.readContract({
            address: contracts.ASSET_APPROVAL_QUEUE as `0x${string}`,
            abi: ABIS.ASSET_APPROVAL_QUEUE,
            functionName: 'getSubmission',
            args: [submissionId],
          })) as any;
        } catch {
          continue;
        }

        // When getSubmission returns a struct, viem may wrap it as a tuple in index 0.
        const unpacked = row?.token ? row : Array.isArray(row) && row.length === 1 ? row[0] : row;

        const tokenAddress = (unpacked?.token ?? unpacked?.[0]) as string | undefined;
        const submitter = (unpacked?.submitter ?? unpacked?.[1]) as string | undefined;
        const metadataURI = (unpacked?.metadataURI ?? unpacked?.[2]) as string | undefined;
        const submittedAt = (unpacked?.submittedAt ?? unpacked?.[3]) as bigint | number | undefined;
        const status = (unpacked?.status ?? unpacked?.[4]) as unknown;

        let submissionDate = '';
        try {
          const seconds = typeof submittedAt === 'bigint' ? Number(submittedAt) : Number(submittedAt ?? 0);
          submissionDate = seconds > 0 ? new Date(seconds * 1000).toISOString() : '';
        } catch {
          submissionDate = '';
        }

        const pending: PendingAsset = {
          id: String(submissionId),
          tokenAddress: typeof tokenAddress === 'string' ? tokenAddress : null,
          metadataURI: typeof metadataURI === 'string' ? metadataURI : null,
          name: 'Unknown Asset',
          symbol: 'TOKEN',
          location: typeof tokenAddress === 'string' ? tokenAddress : '—',
          assetType: '—',
          description: '',
          submitter: typeof submitter === 'string' ? submitter : '—',
          submissionDate,
          status: mapQueueStatus(status),
          documents: [],
          requestedSupply: 0,
          pricePerToken: 0,
        };
        out.admin.queue.push(pending);
      }
    } catch {
      // ignore
    }
  }

  // Token metadata for assets + queue (best-effort, on-chain only)
  try {
    const tokenAddresses = Array.from(
      new Set(
        [
          ...out.assets.map((a: IndexedAsset) => a.token).filter((t: string) => isAddress(t as any)),
          ...out.admin.queue.map((q: PendingAsset) => q.tokenAddress).filter((t: any) => isAddress(t as any)),
        ].map((t: any) => String(t)),
      ),
    ).slice(0, 75);

    if (tokenAddresses.length) {
      const calls = tokenAddresses.flatMap((addr) => [
        { address: addr as `0x${string}`, abi: ABIS.ASSET_TOKEN, functionName: 'name' as const },
        { address: addr as `0x${string}`, abi: ABIS.ASSET_TOKEN, functionName: 'symbol' as const },
        { address: addr as `0x${string}`, abi: ABIS.ERC20, functionName: 'decimals' as const },
      ]);

      const res = await client.multicall({ contracts: calls as any, allowFailure: true });

      const meta = new Map<string, { name: string | null; symbol: string | null; decimals: number | null }>();
      for (let i = 0; i < tokenAddresses.length; i++) {
        const nameItem = res[i * 3 + 0] as any;
        const symbolItem = res[i * 3 + 1] as any;
        const decimalsItem = res[i * 3 + 2] as any;
        meta.set(tokenAddresses[i], {
          name: nameItem?.status === 'success' && typeof nameItem.result === 'string' ? nameItem.result : null,
          symbol: symbolItem?.status === 'success' && typeof symbolItem.result === 'string' ? symbolItem.result : null,
          decimals:
            decimalsItem?.status === 'success'
              ? Number(decimalsItem.result)
              : null,
        });
      }

      out.assets = out.assets.map((a: IndexedAsset) => {
        const m = meta.get(a.token);
        if (!m) return a;
        return { ...a, name: m.name, symbol: m.symbol, decimals: m.decimals };
      });

      out.admin.queue = out.admin.queue.map((q: PendingAsset) => {
        const token = q.tokenAddress ? String(q.tokenAddress) : '';
        const m = token ? meta.get(token) : undefined;
        if (!m) return q;
        return {
          ...q,
          name: m.name ?? q.name,
          symbol: m.symbol ?? q.symbol,
        };
      });
    }
  } catch {
    // ignore
  }

  // Activity + income deposits from real contract logs (bounded lookback)
  if (fromBlock !== undefined && latestBlock) {
    const activityRows: Array<AdminActivityRow & { _blockNumber?: bigint }> = [];
    const incomeDeposits: Array<any & { _blockNumber?: bigint }> = [];
    const blockNums: bigint[] = [];

    try {
      if (isAddress(contracts.ASSET_APPROVAL_QUEUE as any)) {
        const addr = contracts.ASSET_APPROVAL_QUEUE as `0x${string}`;
        const created = await client.getLogs({
          address: addr,
          event: parseAbiItem(
            'event SubmissionCreated(uint256 indexed submissionId, address indexed token, address indexed submitter, string metadataURI, uint256 timestamp)',
          ),
          fromBlock,
          toBlock: latestBlock,
        });
        const approved = await client.getLogs({
          address: addr,
          event: parseAbiItem(
            'event SubmissionApproved(uint256 indexed submissionId, address indexed token, address indexed reviewer, uint256 timestamp)',
          ),
          fromBlock,
          toBlock: latestBlock,
        });
        const rejected = await client.getLogs({
          address: addr,
          event: parseAbiItem(
            'event SubmissionRejected(uint256 indexed submissionId, address indexed token, address indexed reviewer, string reason, uint256 timestamp)',
          ),
          fromBlock,
          toBlock: latestBlock,
        });

        for (const log of [...created, ...approved, ...rejected]) {
          if (typeof log.blockNumber === 'bigint') blockNums.push(log.blockNumber);
        }

        const mk = (log: any, event: string, ref: string): AdminActivityRow & { _blockNumber?: bigint } => ({
          id: `${log.transactionHash}-${String(log.logIndex)}`,
          timestamp: '',
          event,
          ref,
          _blockNumber: typeof log.blockNumber === 'bigint' ? log.blockNumber : undefined,
        });

        for (const log of created) {
          activityRows.push(
            mk(
              log,
              'SubmissionCreated',
              `submissionId=${String((log as any).args?.submissionId)} token=${String((log as any).args?.token)}`,
            ),
          );
        }
        for (const log of approved) {
          activityRows.push(
            mk(
              log,
              'SubmissionApproved',
              `submissionId=${String((log as any).args?.submissionId)} token=${String((log as any).args?.token)}`,
            ),
          );
        }
        for (const log of rejected) {
          activityRows.push(
            mk(
              log,
              'SubmissionRejected',
              `submissionId=${String((log as any).args?.submissionId)} token=${String((log as any).args?.token)}`,
            ),
          );
        }
      }
    } catch {
      // ignore
    }

    try {
      if (isAddress(contracts.INCOME_DISTRIBUTOR as any)) {
        const addr = contracts.INCOME_DISTRIBUTOR as `0x${string}`;
        const deposited = await client.getLogs({
          address: addr,
          event: parseAbiItem(
            'event IncomeDeposited(address indexed assetToken, address indexed incomeToken, uint256 amount, uint256 newIncomePerToken, uint256 timestamp)',
          ),
          fromBlock,
          toBlock: latestBlock,
        });
        const claimed = await client.getLogs({
          address: addr,
          event: parseAbiItem(
            'event IncomeClaimed(address indexed assetToken, address indexed user, address indexed incomeToken, uint256 amount, uint256 timestamp)',
          ),
          fromBlock,
          toBlock: latestBlock,
        });

        for (const log of [...deposited, ...claimed]) {
          if (typeof log.blockNumber === 'bigint') blockNums.push(log.blockNumber);
        }

        for (const log of deposited) {
          activityRows.push({
            id: `${log.transactionHash}-${String(log.logIndex)}`,
            timestamp: '',
            event: 'IncomeDeposited',
            ref: `assetToken=${String((log as any).args?.assetToken)} amount=${String((log as any).args?.amount)}`,
            _blockNumber: typeof log.blockNumber === 'bigint' ? log.blockNumber : undefined,
          });

          const amount = (log as any).args?.amount as bigint | undefined;
          const assetToken = String((log as any).args?.assetToken ?? '');
          incomeDeposits.push({
            id: `${log.transactionHash}-${String(log.logIndex)}`,
            assetToken,
            name: 'Asset',
            symbol: '',
            amount: typeof amount === 'bigint' ? formatUsd6(amount) : 0,
            date: null,
            txHash: String(log.transactionHash),
            _blockNumber: typeof log.blockNumber === 'bigint' ? log.blockNumber : undefined,
          });
        }

        for (const log of claimed) {
          activityRows.push({
            id: `${log.transactionHash}-${String(log.logIndex)}`,
            timestamp: '',
            event: 'IncomeClaimed',
            ref: `assetToken=${String((log as any).args?.assetToken)} user=${String((log as any).args?.user)} amount=${String(
              (log as any).args?.amount,
            )}`,
            _blockNumber: typeof log.blockNumber === 'bigint' ? log.blockNumber : undefined,
          });
        }

        // Hydrate deposit token name/symbol (best-effort)
        try {
          const uniqTokens = Array.from(new Set(incomeDeposits.map((d) => d.assetToken).filter((t) => isAddress(t as any)))).slice(
            0,
            25,
          );
          if (uniqTokens.length) {
            const calls = uniqTokens.flatMap((addr) => [
              { address: addr as `0x${string}`, abi: ABIS.ASSET_TOKEN, functionName: 'name' as const },
              { address: addr as `0x${string}`, abi: ABIS.ASSET_TOKEN, functionName: 'symbol' as const },
            ]);
            const res = await client.multicall({ contracts: calls as any, allowFailure: true });
            const tokenMeta = new Map<string, { name: string; symbol: string }>();
            for (let i = 0; i < uniqTokens.length; i++) {
              const nameItem = res[i * 2 + 0] as any;
              const symbolItem = res[i * 2 + 1] as any;
              tokenMeta.set(uniqTokens[i], {
                name: nameItem?.status === 'success' && typeof nameItem.result === 'string' ? nameItem.result : 'Asset',
                symbol: symbolItem?.status === 'success' && typeof symbolItem.result === 'string' ? symbolItem.result : '',
              });
            }
            for (const d of incomeDeposits) {
              const m = tokenMeta.get(d.assetToken);
              if (m) {
                d.name = m.name;
                d.symbol = m.symbol;
              }
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    // Backfill timestamps (single batch of block reads)
    try {
      const tsCache = await safeGetBlockTimestamps(client as any, blockNums);

      for (const row of activityRows) {
        const bn = row._blockNumber;
        const iso = bn ? tsCache.get(bn.toString()) : undefined;
        row.timestamp = iso || out.updatedAt;
        delete (row as any)._blockNumber;
      }
      for (const d of incomeDeposits) {
        const bn = d._blockNumber as bigint | undefined;
        const iso = bn ? tsCache.get(bn.toString()) : undefined;
        d.date = iso || out.updatedAt;
        delete d._blockNumber;
      }
    } catch {
      for (const row of activityRows) {
        row.timestamp = out.updatedAt;
        delete (row as any)._blockNumber;
      }
      for (const d of incomeDeposits) {
        d.date = out.updatedAt;
        delete d._blockNumber;
      }
    }

    // Sort newest-first and cap
    activityRows.sort((a, b) => {
      const ta = Date.parse(a.timestamp);
      const tb = Date.parse(b.timestamp);
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    out.admin.activity = activityRows.slice(0, MAX_ACTIVITY_ROWS);

    incomeDeposits.sort((a, b) => {
      const ta = Date.parse(a.date || '');
      const tb = Date.parse(b.date || '');
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    out.incomeDeposits = incomeDeposits.slice(0, MAX_ACTIVITY_ROWS);
  }

  return out;
}
