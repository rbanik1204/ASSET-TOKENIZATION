import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createPublicClient, http, isAddress } from 'viem';

const INCOME_DISTRIBUTOR_ABI = [
  {
    type: 'function',
    name: 'getClaimableIncome',
    stateMutability: 'view',
    inputs: [
      { name: 'assetToken', type: 'address' },
      { name: 'user', type: 'address' },
      { name: 'incomeToken', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getTotalClaimed',
    stateMutability: 'view',
    inputs: [
      { name: 'assetToken', type: 'address' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'IncomeClaimed',
    inputs: [
      { name: 'assetToken', type: 'address', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'incomeToken', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'IncomeDeposited',
    inputs: [
      { name: 'assetToken', type: 'address', indexed: true },
      { name: 'incomeToken', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newIncomePerToken', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
];

function parseDotenv(content) {
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

async function loadEnvFromFrontend() {
  // Support running from either repo root or apps/frontend.
  // We prefer apps/frontend/.env.local because that's where the app config lives.
  const cwd = path.resolve(process.cwd());
  const candidates = [
    path.join(cwd, 'apps', 'frontend', '.env.local'),
    path.join(cwd, '.env.local'),
  ];

  try {
    let content = null;
    for (const p of candidates) {
      try {
        content = await fs.readFile(p, 'utf8');
        break;
      } catch {
        // continue
      }
    }

    if (!content) return;
    const parsed = parseDotenv(content);
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch {
    // optional
  }
}

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const CHAIN_ENV_SUFFIX = {
  1: 'ETHEREUM',
  11155111: 'SEPOLIA',
  56: 'BSC',
  97: 'BSC_TESTNET',
  137: 'POLYGON',
  80002: 'POLYGON_AMOY',
  31337: 'LOCAL',
};

function readAddressEnvVar(baseEnvVar, chainId) {
  const suffix = CHAIN_ENV_SUFFIX[chainId];
  const withSuffix = suffix ? process.env[`${baseEnvVar}_${suffix}`] : undefined;
  if (withSuffix && withSuffix.trim()) return withSuffix.trim();

  const base = process.env[baseEnvVar];
  if (base && base.trim()) return base.trim();

  return '';
}

function toOutPath(p) {
  if (!p) return null;
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

async function defaultOutFile() {
  const cwd = path.resolve(process.cwd());

  // If invoked from apps/frontend, write to ./\.data/indexer.json.
  const parts = cwd.split(path.sep).filter(Boolean);
  const endsWithAppsFrontend =
    parts.length >= 2 && parts[parts.length - 2] === 'apps' && parts[parts.length - 1] === 'frontend';
  if (endsWithAppsFrontend) return path.resolve(cwd, '.data/indexer.json');

  // If invoked from repo root (or elsewhere), prefer apps/frontend/.data/indexer.json when it looks like that folder exists.
  try {
    await fs.access(path.resolve(cwd, 'apps', 'frontend'));
    return path.resolve(cwd, 'apps', 'frontend', '.data', 'indexer.json');
  } catch {
    // fall back
  }

  return path.resolve(cwd, '.data/indexer.json');
}

const ASSET_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'assetCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getAsset',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'uint256' }],
    // IMPORTANT: this function returns a single struct (tuple) which contains a dynamic string.
    // If you model the outputs as 4 flat values, viem will decode the return incorrectly.
    outputs: [
      {
        name: 'asset',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'owner', type: 'address' },
          { name: 'metadataURI', type: 'string' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
];

const ASSET_APPROVAL_QUEUE_ABI = [
  {
    type: 'function',
    name: 'submissionCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getSubmission',
    stateMutability: 'view',
    inputs: [{ name: 'submissionId', type: 'uint256' }],
    outputs: [
      {
        name: 'submission',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'submitter', type: 'address' },
          { name: 'metadataURI', type: 'string' },
          { name: 'submittedAt', type: 'uint40' },
          { name: 'status', type: 'uint8' },
          { name: 'reviewedAt', type: 'uint40' },
          { name: 'reviewer', type: 'address' },
        ],
      },
    ],
  },
  {
    type: 'event',
    name: 'SubmissionCreated',
    inputs: [
      { name: 'submissionId', type: 'uint256', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'submitter', type: 'address', indexed: true },
      { name: 'metadataURI', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SubmissionApproved',
    inputs: [
      { name: 'submissionId', type: 'uint256', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'reviewer', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SubmissionRejected',
    inputs: [
      { name: 'submissionId', type: 'uint256', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'reviewer', type: 'address', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
];

const ERC20_ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
];

async function getBlockHashSafe(client, blockNumber) {
  try {
    const b = await client.getBlock({ blockNumber });
    return b?.hash || null;
  } catch {
    return null;
  }
}

function bigIntOrNull(v) {
  try {
    if (v === null || v === undefined) return null;
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(v);
    if (typeof v === 'string' && v.trim() !== '') return BigInt(v);
    return null;
  } catch {
    return null;
  }
}

function safeLowerAddress(a) {
  return typeof a === 'string' ? a.toLowerCase() : '';
}

function loadBalancesFromPrev(prev) {
  const raw = prev?.balancesByWalletToken;
  const out = new Map();
  if (!raw || typeof raw !== 'object') return out;

  for (const [wallet, tokenMap] of Object.entries(raw)) {
    if (!tokenMap || typeof tokenMap !== 'object') continue;
    const inner = new Map();
    for (const [token, bal] of Object.entries(tokenMap)) {
      const b = bigIntOrNull(bal);
      if (b !== null) inner.set(token.toLowerCase(), b);
    }
    out.set(wallet.toLowerCase(), inner);
  }
  return out;
}

function balancesToJson(balancesByWalletToken) {
  const out = {};
  for (const [wallet, tokenMap] of balancesByWalletToken.entries()) {
    out[wallet] = {};
    for (const [token, bal] of tokenMap.entries()) {
      out[wallet][token] = bal.toString();
    }
  }
  return out;
}

async function getLogsChunked({ client, address, event, args, fromBlock, toBlock, chunkSize }) {
  const logs = [];
  if (fromBlock > toBlock) return logs;

  const size = BigInt(chunkSize);
  let start = fromBlock;
  while (start <= toBlock) {
    const end = start + size - 1n;
    const chunkEnd = end <= toBlock ? end : toBlock;
    try {
      const chunk = await client.getLogs({ address, event, args, fromBlock: start, toBlock: chunkEnd });
      if (Array.isArray(chunk) && chunk.length) logs.push(...chunk);
    } catch {
      // ignore and continue; callers should be resilient
    }
    start = chunkEnd + 1n;
  }
  return logs;
}

function safeJsonStringify(obj) {
  return JSON.stringify(
    obj,
    (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
    2,
  );
}

function nowIso() {
  return new Date().toISOString();
}

async function ensureDirForFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function parseWallets(raw) {
  const list = (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const wallets = [];
  for (const w of list) {
    if (isAddress(w)) wallets.push(w);
  }
  return wallets;
}

async function loadOptionalJsonFile(filePath) {
  if (!filePath) return null;
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  try {
    const raw = await fs.readFile(resolved, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toHttpFromIpfs(uri) {
  if (typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('ipfs://')) {
    const cid = trimmed.slice('ipfs://'.length).replace(/^ipfs\//, '');
    if (!cid) return null;
    return `https://ipfs.io/ipfs/${cid}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return null;
}

async function loadAssetMetadata(metadataURI) {
  const url = toHttpFromIpfs(metadataURI);
  if (!url) return null;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === 'object' ? json : null;
  } catch {
    return null;
  }
}

async function computeIncomeFromHoldings({
  client,
  incomeDistributorAddress,
  incomeTokenAddress,
  incomeTokenDecimals,
  wallet,
  holdings,
  fromBlock,
  toBlock,
}) {
  // If the income distributor is not configured, fall back to zeros.
  if (!incomeDistributorAddress || !isAddress(incomeDistributorAddress)) {
    const assets = holdings.map((h) => {
      const decimals = typeof h.decimals === 'number' ? h.decimals : 18;
      const tokensOwned = Number(BigInt(h.balance)) / 10 ** decimals;
      return {
        assetId: h.assetId,
        tokenAddress: h.token,
        name: h.name,
        symbol: h.symbol,
        tokensOwned,
        claimableAmount: 0,
        totalEarned: 0,
        monthlyRate: 0,
        lastClaimDate: null,
      };
    });

    return {
      summary: { totalClaimable: 0, totalClaimed: 0, lifetimeEarnings: 0 },
      assets,
      claimHistory: [],
    };
  }

  const holdingsByToken = new Map();
  for (const h of holdings) holdingsByToken.set(h.token.toLowerCase(), h);

  const incomeToken = incomeTokenAddress && isAddress(incomeTokenAddress) ? incomeTokenAddress : null;
  const incomeDecimals = typeof incomeTokenDecimals === 'number' ? incomeTokenDecimals : 6;

  // Pull claim events for this wallet to build a minimal ledger.
  let claimLogs = [];
  try {
    claimLogs = await client.getLogs({
      address: incomeDistributorAddress,
      event: INCOME_DISTRIBUTOR_ABI.find((x) => x.type === 'event' && x.name === 'IncomeClaimed'),
      args: incomeToken ? { user: wallet, incomeToken } : { user: wallet },
      fromBlock,
      toBlock,
    });
  } catch {
    claimLogs = [];
  }

  const lastClaimByToken = new Map();
  const claimHistory = claimLogs
    .slice(-50)
    .map((l) => {
      const assetToken = (l.args?.assetToken || '').toString();
      const amount = l.args?.amount ?? 0n;
      const ts = l.args?.timestamp ?? 0n;

      const holding = holdingsByToken.get(assetToken.toLowerCase());
      const symbol = holding?.symbol ?? 'UNKNOWN';
      const name = holding?.name ?? 'Unknown Asset';

      lastClaimByToken.set(assetToken.toLowerCase(), ts);

      return {
        date: ts ? new Date(Number(ts) * 1000).toISOString().slice(0, 10) : null,
        asset: name,
        symbol,
        amount: Number(amount) / 10 ** incomeDecimals,
        txHash: l.transactionHash,
      };
    })
    .filter((x) => x.txHash);

  // For each holding, read claimable and claimed from the contract (source of truth).
  const assets = await Promise.all(
    holdings.map(async (h) => {
      const decimals = typeof h.decimals === 'number' ? h.decimals : 18;
      const tokensOwned = Number(BigInt(h.balance)) / 10 ** decimals;

      const [claimableWei, claimedWei] = await Promise.all([
        client
          .readContract({
            address: incomeDistributorAddress,
            abi: INCOME_DISTRIBUTOR_ABI,
            functionName: 'getClaimableIncome',
            args: [h.token, wallet, incomeToken || '0x0000000000000000000000000000000000000000'],
          })
          .catch(() => 0n),
        client
          .readContract({
            address: incomeDistributorAddress,
            abi: INCOME_DISTRIBUTOR_ABI,
            functionName: 'getTotalClaimed',
            args: [h.token, wallet],
          })
          .catch(() => 0n),
      ]);

      const claimableAmount = Number(claimableWei) / 10 ** incomeDecimals;
      const totalEarned = Number(claimedWei + claimableWei) / 10 ** incomeDecimals;
      const lastClaimTs = lastClaimByToken.get(h.token.toLowerCase());

      return {
        assetId: h.assetId,
        tokenAddress: h.token,
        name: h.name,
        symbol: h.symbol,
        tokensOwned,
        claimableAmount,
        totalEarned,
        monthlyRate: 0,
        lastClaimDate: lastClaimTs ? new Date(Number(lastClaimTs) * 1000).toISOString().slice(0, 10) : null,
      };
    }),
  );

  const totalClaimable = assets.reduce((sum, a) => sum + (a.claimableAmount || 0), 0);
  const totalClaimed = assets.reduce((sum, a) => sum + ((a.totalEarned || 0) - (a.claimableAmount || 0)), 0);
  const lifetimeEarnings = assets.reduce((sum, a) => sum + (a.totalEarned || 0), 0);

  return {
    summary: {
      totalClaimable,
      totalClaimed,
      lifetimeEarnings,
    },
    assets,
    claimHistory,
  };
}

async function indexOnce({ client, registryAddress, approvalQueueAddress, incomeDistributorAddress, wallets, outFile }) {
  const chainId = await client.getChainId();

  const prev = (await loadOptionalJsonFile(outFile)) || {};
  const startBlock = bigIntOrNull(env('INDEXER_START_BLOCK', '0')) ?? 0n;
  const logChunkSize = Number(env('INDEXER_LOG_CHUNK_SIZE', '50000'));
  const toBlock = await client.getBlockNumber();

  const incomeTokenAddress = env(
    'INDEXER_INCOME_TOKEN_ADDRESS',
    readAddressEnvVar('NEXT_PUBLIC_USDC_ADDRESS', chainId),
  );
  let incomeTokenDecimals = 6;
  if (incomeTokenAddress && isAddress(incomeTokenAddress)) {
    try {
      const d = await client.readContract({
        address: incomeTokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      });
      if (typeof d === 'number') incomeTokenDecimals = d;
    } catch {
      // keep default
    }
  }

  // --- Reorg handling (basic): verify last indexed block hash, else reset to startBlock.
  const prevTransferLastBlock = bigIntOrNull(prev?.transferEventsLastBlock);
  const prevTransferLastBlockHash = typeof prev?.transferEventsLastBlockHash === 'string' ? prev.transferEventsLastBlockHash : null;

  let transferFromBlock = prevTransferLastBlock !== null ? prevTransferLastBlock + 1n : startBlock;
  let balancesByWalletToken = loadBalancesFromPrev(prev);

  if (prevTransferLastBlock !== null && prevTransferLastBlockHash) {
    const expected = prevTransferLastBlockHash.toLowerCase();
    const actual = (await getBlockHashSafe(client, prevTransferLastBlock))?.toLowerCase() || null;
    if (!actual || actual !== expected) {
      // Reorg (or provider can't serve old block). Reset event-sourced state.
      transferFromBlock = startBlock;
      balancesByWalletToken = new Map();
    }
  }

  const prevIncomeLastBlock = bigIntOrNull(prev?.incomeEventsLastBlock);
  const prevIncomeLastBlockHash = typeof prev?.incomeEventsLastBlockHash === 'string' ? prev.incomeEventsLastBlockHash : null;
  let incomeFromBlock = prevIncomeLastBlock !== null ? prevIncomeLastBlock + 1n : startBlock;
  let prevDeposits = Array.isArray(prev?.incomeDeposits) ? prev.incomeDeposits : [];
  if (prevIncomeLastBlock !== null && prevIncomeLastBlockHash) {
    const expected = prevIncomeLastBlockHash.toLowerCase();
    const actual = (await getBlockHashSafe(client, prevIncomeLastBlock))?.toLowerCase() || null;
    if (!actual || actual !== expected) {
      incomeFromBlock = startBlock;
      prevDeposits = [];
    }
  }

  const prevAdminLastBlock = bigIntOrNull(prev?.adminEventsLastBlock);
  const prevAdminLastBlockHash = typeof prev?.adminEventsLastBlockHash === 'string' ? prev.adminEventsLastBlockHash : null;
  let adminFromBlock = prevAdminLastBlock !== null ? prevAdminLastBlock + 1n : startBlock;
  let prevActivity = Array.isArray(prev?.admin?.activity) ? prev.admin.activity : [];
  if (prevAdminLastBlock !== null && prevAdminLastBlockHash) {
    const expected = prevAdminLastBlockHash.toLowerCase();
    const actual = (await getBlockHashSafe(client, prevAdminLastBlock))?.toLowerCase() || null;
    if (!actual || actual !== expected) {
      adminFromBlock = startBlock;
      prevActivity = [];
    }
  }

  const assetCount = await client.readContract({
    address: registryAddress,
    abi: ASSET_REGISTRY_ABI,
    functionName: 'assetCount',
  });

  const count = Number(assetCount);
  const assets = [];
  for (let i = 1; i <= count; i++) {
    const assetId = BigInt(i);
    const res = await client.readContract({
      address: registryAddress,
      abi: ASSET_REGISTRY_ABI,
      functionName: 'getAsset',
      args: [assetId],
    });

    // res is the returned struct (tuple). viem typically returns an object with named fields
    // and numeric indexes; support both to be safe.
    const token = res?.token ?? res?.[0];
    const owner = res?.owner ?? res?.[1];
    const metadataURI = res?.metadataURI ?? res?.[2];
    const active = res?.active ?? res?.[3];

    assets.push({ assetId, token, owner, metadataURI, active });
  }

  const tokenMeta = new Map();
  for (const a of assets) {
    if (!a.active) continue;
    if (tokenMeta.has(a.token)) continue;

    const [name, symbol, decimals] = await Promise.all([
      client.readContract({ address: a.token, abi: ERC20_ABI, functionName: 'name' }).catch(() => null),
      client.readContract({ address: a.token, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => null),
      client.readContract({ address: a.token, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => null),
    ]);

    tokenMeta.set(a.token, {
      name: typeof name === 'string' ? name : null,
      symbol: typeof symbol === 'string' ? symbol : null,
      decimals: typeof decimals === 'number' ? decimals : null,
    });
  }

  const walletData = {};
  const incomeByWallet = {};

  // Ensure wallet entries exist in balances map.
  for (const w of wallets) {
    const wl = w.toLowerCase();
    if (!balancesByWalletToken.has(wl)) balancesByWalletToken.set(wl, new Map());
  }

  // --- Holdings: event-log-based (ERC20 Transfer) for configured wallets.
  // We only compute balances for the specific wallets (not a full index of all holders).
  const transferEvent = ERC20_ABI.find((x) => x.type === 'event' && x.name === 'Transfer');
  const activeTokens = assets.filter((a) => a.active).map((a) => a.token);
  for (const token of activeTokens) {
    const tokenLower = token.toLowerCase();

    for (const wallet of wallets) {
      const walletLower = wallet.toLowerCase();
      const tokenMap = balancesByWalletToken.get(walletLower) || new Map();
      let bal = tokenMap.get(tokenLower) || 0n;

      const logsFrom = await getLogsChunked({
        client,
        address: token,
        event: transferEvent,
        args: { from: wallet },
        fromBlock: transferFromBlock,
        toBlock,
        chunkSize: logChunkSize,
      });
      for (const l of logsFrom) {
        const v = l.args?.value ?? 0n;
        bal -= v;
      }

      const logsTo = await getLogsChunked({
        client,
        address: token,
        event: transferEvent,
        args: { to: wallet },
        fromBlock: transferFromBlock,
        toBlock,
        chunkSize: logChunkSize,
      });
      for (const l of logsTo) {
        const v = l.args?.value ?? 0n;
        bal += v;
      }

      tokenMap.set(tokenLower, bal);
      balancesByWalletToken.set(walletLower, tokenMap);
    }
  }
  for (const wallet of wallets) {
    const holdings = [];
    for (const a of assets) {
      if (!a.active) continue;

      const meta = tokenMeta.get(a.token) || { name: null, symbol: null, decimals: null };
      const bal = (balancesByWalletToken.get(wallet.toLowerCase())?.get(a.token.toLowerCase()) ?? 0n);

      if (bal === 0n) continue;

      holdings.push({
        assetId: a.assetId,
        token: a.token,
        owner: a.owner,
        metadataURI: a.metadataURI,
        active: a.active,
        name: meta.name,
        symbol: meta.symbol,
        decimals: meta.decimals,
        balance: bal,
      });
    }

    walletData[wallet.toLowerCase()] = {
      wallet,
      holdings,
    };

    incomeByWallet[wallet.toLowerCase()] = await computeIncomeFromHoldings({
      client,
      incomeDistributorAddress,
      incomeTokenAddress,
      incomeTokenDecimals,
      wallet,
      holdings,
      fromBlock: incomeFromBlock,
      toBlock,
    });
  }

  let adminQueue = await loadOptionalJsonFile(env('INDEXER_ADMIN_QUEUE_FILE', ''));

  if (approvalQueueAddress && isAddress(approvalQueueAddress)) {
    try {
      const sc = await client.readContract({
        address: approvalQueueAddress,
        abi: ASSET_APPROVAL_QUEUE_ABI,
        functionName: 'submissionCount',
      });
      const submissionCount = Number(sc);

      const pending = [];
      for (let i = 1; i <= submissionCount; i++) {
        const res = await client.readContract({
          address: approvalQueueAddress,
          abi: ASSET_APPROVAL_QUEUE_ABI,
          functionName: 'getSubmission',
          args: [BigInt(i)],
        });

        const submission = res?.submission ?? res?.[0] ?? res;
        const token = submission?.token ?? submission?.[0];
        const submitter = submission?.submitter ?? submission?.[1];
        const metadataURI = submission?.metadataURI ?? submission?.[2];
        const submittedAt = submission?.submittedAt ?? submission?.[3] ?? 0;
        const status = Number(submission?.status ?? submission?.[4] ?? 0);

        // AssetApprovalQueue.Status.Pending == 1
        if (status !== 1) continue;

        const [name, symbol] = await Promise.all([
          client.readContract({ address: token, abi: ERC20_ABI, functionName: 'name' }).catch(() => null),
          client.readContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => null),
        ]);

        const meta = await loadAssetMetadata(typeof metadataURI === 'string' ? metadataURI : '');
        const docs = Array.isArray(meta?.documents) ? meta.documents : [];

        const location = typeof meta?.location === 'string' ? meta.location : '—';
        const assetType = typeof meta?.assetType === 'string' ? meta.assetType : '—';
        const description = typeof meta?.description === 'string'
          ? meta.description
          : (typeof metadataURI === 'string' ? metadataURI : '—');
        const requestedSupply = typeof meta?.requestedSupply === 'number' ? meta.requestedSupply : 0;
        const pricePerToken = typeof meta?.pricePerToken === 'number' ? meta.pricePerToken : 0;

        pending.push({
          id: String(i),
          tokenAddress: token,
          metadataURI: typeof metadataURI === 'string' ? metadataURI : null,
          name: typeof name === 'string' ? name : 'Unknown Asset',
          symbol: typeof symbol === 'string' ? symbol : 'UNKNOWN',
          location,
          assetType,
          description,
          submitter: submitter,
          submissionDate: submittedAt ? new Date(Number(submittedAt) * 1000).toISOString().slice(0, 10) : nowIso().slice(0, 10),
          status: 'pending',
          documents: docs
            .filter((d) => d && typeof d === 'object')
            .map((d) => ({
              name: typeof d.name === 'string' ? d.name : 'Document',
              url: typeof d.url === 'string' ? d.url : '',
              type: typeof d.type === 'string' ? d.type : 'unknown',
            }))
            .filter((d) => d.url),
          requestedSupply,
          pricePerToken,
        });
      }

      adminQueue = pending;
    } catch {
      // keep file-based queue fallback
    }
  }

  let incomeDeposits = prevDeposits;
  if (incomeDistributorAddress && isAddress(incomeDistributorAddress)) {
    try {
      const depositEvent = INCOME_DISTRIBUTOR_ABI.find((x) => x.type === 'event' && x.name === 'IncomeDeposited');
      const depositLogs = await client.getLogs({
        address: incomeDistributorAddress,
        event: depositEvent,
        fromBlock: incomeFromBlock,
        toBlock,
      });

      if (depositLogs.length) {
        const seen = new Set(
          (prevDeposits || [])
            .map((d) => d?.id)
            .filter((x) => typeof x === 'string' && x.length > 0),
        );

        const mapped = depositLogs
          .filter((l) => {
            const it = (l.args?.incomeToken || '').toString();
            if (!incomeTokenAddress || !isAddress(incomeTokenAddress)) return true;
            return it.toLowerCase() === incomeTokenAddress.toLowerCase();
          })
          .map((l) => {
            const assetToken = (l.args?.assetToken || '').toString();
            const incomeToken = (l.args?.incomeToken || '').toString();
            const amount = l.args?.amount ?? 0n;
            const ts = l.args?.timestamp ?? 0n;
            const meta = tokenMeta.get(assetToken) || { name: null, symbol: null };

            const id = `${l.transactionHash}:${l.logIndex?.toString?.() ?? String(l.logIndex)}`;
            return {
              id,
              assetToken,
              incomeToken,
              name: meta?.name ?? 'Unknown Asset',
              symbol: meta?.symbol ?? 'UNKNOWN',
              amount: Number(amount) / 10 ** incomeTokenDecimals,
              date: ts ? new Date(Number(ts) * 1000).toISOString().slice(0, 10) : null,
              txHash: l.transactionHash,
            };
        });

        const merged = [...prevDeposits];
        for (const d of mapped) {
          if (!d?.id || seen.has(d.id)) continue;
          seen.add(d.id);
          merged.push(d);
        }

        incomeDeposits = merged.slice(-100);
      }
    } catch {
      incomeDeposits = prevDeposits;
    }
  }

  // --- Admin activity: derived from on-chain events (append-only)
  let activity = prevActivity;
  try {
    const seen = new Set(
      (prevActivity || [])
        .map((d) => d?.id)
        .filter((x) => typeof x === 'string' && x.length > 0),
    );

    const next = [];

    if (approvalQueueAddress && isAddress(approvalQueueAddress)) {
      const createdEvent = ASSET_APPROVAL_QUEUE_ABI.find((x) => x.type === 'event' && x.name === 'SubmissionCreated');
      const approvedEvent = ASSET_APPROVAL_QUEUE_ABI.find((x) => x.type === 'event' && x.name === 'SubmissionApproved');
      const rejectedEvent = ASSET_APPROVAL_QUEUE_ABI.find((x) => x.type === 'event' && x.name === 'SubmissionRejected');

      const [created, approved, rejected] = await Promise.all([
        getLogsChunked({ client, address: approvalQueueAddress, event: createdEvent, args: {}, fromBlock: adminFromBlock, toBlock, chunkSize: logChunkSize }),
        getLogsChunked({ client, address: approvalQueueAddress, event: approvedEvent, args: {}, fromBlock: adminFromBlock, toBlock, chunkSize: logChunkSize }),
        getLogsChunked({ client, address: approvalQueueAddress, event: rejectedEvent, args: {}, fromBlock: adminFromBlock, toBlock, chunkSize: logChunkSize }),
      ]);

      for (const l of created) {
        const id = `${l.transactionHash}:${l.logIndex?.toString?.() ?? String(l.logIndex)}`;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const ts = l.args?.timestamp ?? 0n;
        const submissionId = (l.args?.submissionId ?? '').toString();
        const token = (l.args?.token ?? '').toString();
        next.push({
          id,
          timestamp: ts ? new Date(Number(ts) * 1000).toISOString() : nowIso(),
          event: 'asset_submitted',
          ref: `submissionId=${submissionId} token=${token} tx=${l.transactionHash}`,
        });
      }

      for (const l of approved) {
        const id = `${l.transactionHash}:${l.logIndex?.toString?.() ?? String(l.logIndex)}`;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const ts = l.args?.timestamp ?? 0n;
        const submissionId = (l.args?.submissionId ?? '').toString();
        const token = (l.args?.token ?? '').toString();
        next.push({
          id,
          timestamp: ts ? new Date(Number(ts) * 1000).toISOString() : nowIso(),
          event: 'asset_approved',
          ref: `submissionId=${submissionId} token=${token} tx=${l.transactionHash}`,
        });
      }

      for (const l of rejected) {
        const id = `${l.transactionHash}:${l.logIndex?.toString?.() ?? String(l.logIndex)}`;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const ts = l.args?.timestamp ?? 0n;
        const submissionId = (l.args?.submissionId ?? '').toString();
        const token = (l.args?.token ?? '').toString();
        const reason = typeof l.args?.reason === 'string' ? l.args.reason : '';
        next.push({
          id,
          timestamp: ts ? new Date(Number(ts) * 1000).toISOString() : nowIso(),
          event: 'asset_rejected',
          ref: `submissionId=${submissionId} token=${token} reason=${reason} tx=${l.transactionHash}`,
        });
      }
    }

    if (incomeDistributorAddress && isAddress(incomeDistributorAddress)) {
      const depositEvent = INCOME_DISTRIBUTOR_ABI.find((x) => x.type === 'event' && x.name === 'IncomeDeposited');
      const deposits = await getLogsChunked({ client, address: incomeDistributorAddress, event: depositEvent, args: {}, fromBlock: adminFromBlock, toBlock, chunkSize: logChunkSize });
      for (const l of deposits) {
        const it = (l.args?.incomeToken || '').toString();
        if (incomeTokenAddress && isAddress(incomeTokenAddress) && it.toLowerCase() !== incomeTokenAddress.toLowerCase()) continue;

        const id = `${l.transactionHash}:${l.logIndex?.toString?.() ?? String(l.logIndex)}`;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const ts = l.args?.timestamp ?? 0n;
        const assetToken = (l.args?.assetToken ?? '').toString();
        const amount = l.args?.amount ?? 0n;
        const amountFmt = Number(amount) / 10 ** incomeTokenDecimals;
        next.push({
          id,
          timestamp: ts ? new Date(Number(ts) * 1000).toISOString() : nowIso(),
          event: 'income_deposited',
          ref: `assetToken=${assetToken} amount=${amountFmt} tx=${l.transactionHash}`,
        });
      }
    }

    activity = [...(prevActivity || []), ...next]
      .filter(Boolean)
      .sort((a, b) => (Date.parse(a?.timestamp || '') || 0) - (Date.parse(b?.timestamp || '') || 0))
      .slice(-200);
  } catch {
    activity = prevActivity;
  }

  const indexedAssets = assets.map((a) => {
    const meta = tokenMeta.get(a.token) || { name: null, symbol: null, decimals: null };
    return {
      assetId: a.assetId?.toString?.() ?? String(a.assetId),
      token: a.token,
      owner: a.owner,
      metadataURI: a.metadataURI,
      active: Boolean(a.active),
      name: meta.name,
      symbol: meta.symbol,
      decimals: meta.decimals,
    };
  });

  const payload = {
    updatedAt: nowIso(),
    chainId,
    transferEventsLastBlock: toBlock,
    transferEventsLastBlockHash: (await getBlockHashSafe(client, toBlock)) || null,
    balancesByWalletToken: balancesToJson(balancesByWalletToken),

    incomeEventsLastBlock: toBlock,
    incomeEventsLastBlockHash: (await getBlockHashSafe(client, toBlock)) || null,
    incomeDeposits,
    incomeToken: {
      address: incomeTokenAddress || null,
      decimals: incomeTokenDecimals,
    },
    assets: indexedAssets,
    registry: {
      address: registryAddress,
      assetCount: count,
    },
    wallets: walletData,
    income: incomeByWallet,
    adminEventsLastBlock: toBlock,
    adminEventsLastBlockHash: (await getBlockHashSafe(client, toBlock)) || null,
    admin: {
      queue: Array.isArray(adminQueue) ? adminQueue : [],
      activity,
    },
  };

  await ensureDirForFile(outFile);
  await fs.writeFile(outFile, safeJsonStringify(payload), 'utf8');
}

async function main() {
  await loadEnvFromFrontend();

  const rpcUrl = env('INDEXER_RPC_URL', env('NEXT_PUBLIC_RPC_URL', 'http://127.0.0.1:8545'));
  const walletsRaw = env('INDEXER_WALLETS', env('NEXT_PUBLIC_INDEXER_WALLETS', ''));

  const outFile = toOutPath(env('INDEXER_OUT_FILE', '')) || (await defaultOutFile());

  const intervalMs = Number(env('INDEXER_POLL_MS', '5000'));
  const runOnce = env('INDEXER_ONCE', '0') === '1';

  const client = createPublicClient({ transport: http(rpcUrl) });
  const chainId = await client.getChainId();

  const registryAddress = env(
    'INDEXER_ASSET_REGISTRY_ADDRESS',
    readAddressEnvVar('NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS', chainId),
  );
  const approvalQueueAddress = env(
    'INDEXER_ASSET_APPROVAL_QUEUE_ADDRESS',
    readAddressEnvVar('NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS', chainId),
  );
  const incomeDistributorAddress = env(
    'INDEXER_INCOME_DISTRIBUTOR_ADDRESS',
    readAddressEnvVar('NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS', chainId),
  );

  if (!registryAddress || !isAddress(registryAddress)) {
    console.error('[indexer] Missing or invalid registry address. Set NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS (or INDEXER_ASSET_REGISTRY_ADDRESS).');
    process.exit(1);
  }

  let wallets = parseWallets(walletsRaw);
  if (!wallets.length) {
    const fallback = env('INDEXER_FALLBACK_WALLET', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    if (!isAddress(fallback)) {
      console.error('[indexer] No wallets configured and fallback wallet is invalid. Set INDEXER_WALLETS="0x... , 0x..." (comma separated).');
      process.exit(1);
    }
    wallets = [fallback];
    console.warn('[indexer] No wallets configured; using fallback wallet:', fallback);
  }

  console.log('[indexer] rpc:', rpcUrl);
  console.log('[indexer] chainId:', chainId);
  console.log('[indexer] registry:', registryAddress);
  console.log('[indexer] approvalQueue:', approvalQueueAddress || '(not set)');
  console.log('[indexer] incomeDistributor:', incomeDistributorAddress || '(not set)');
  console.log('[indexer] wallets:', wallets.join(', '));
  console.log('[indexer] out:', outFile);
  console.log('[indexer] poll:', intervalMs, 'ms');
  if (runOnce) console.log('[indexer] mode: once');

  if (runOnce) {
    await indexOnce({ client, registryAddress, approvalQueueAddress, incomeDistributorAddress, wallets, outFile });
    console.log('[indexer] updated', nowIso());
    return;
  }

  // Loop forever.
  while (true) {
    try {
      await indexOnce({ client, registryAddress, approvalQueueAddress, incomeDistributorAddress, wallets, outFile });
      console.log('[indexer] updated', nowIso());
    } catch (e) {
      console.error('[indexer] error', e);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

main().catch((e) => {
  console.error('[indexer] fatal', e);
  process.exit(1);
});
