'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { MainLayout } from '@/components/layout/MainLayout';
import { RequireWallet } from '@/components/wallet/RequireWallet';
import { SystemHealthMonitor } from '@/components/admin/SystemHealthMonitor';
import { chains } from '@/config/wagmi';
import { useAccount, useChainId, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ABIS, getContractsForChain, isContractsConfiguredFor } from '@/config/contracts';
import { isAddress, parseUnits } from 'viem';

interface PendingAsset {
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
}

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

function toHttpFromIpfs(uri: string, gateway: 'ipfs.io' | 'pinata' | 'cloudflare' | 'dweb' = 'ipfs.io') {
  const trimmed = (uri || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('ipfs://')) {
    const cid = trimmed.slice('ipfs://'.length).replace(/^ipfs\//, '');
    if (!cid) return null;
    
    // Try different IPFS gateways
    switch (gateway) {
      case 'pinata':
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
      case 'cloudflare':
        return `https://cloudflare-ipfs.com/ipfs/${cid}`;
      case 'dweb':
        return `https://dweb.link/ipfs/${cid}`;
      default:
        return `https://ipfs.io/ipfs/${cid}`;
    }
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return null;
}

// Try fetching from multiple IPFS gateways with timeout
async function fetchFromIPFS(uri: string, timeoutMs = 10000): Promise<any> {
  const gateways: Array<'ipfs.io' | 'pinata' | 'cloudflare' | 'dweb'> = ['pinata', 'ipfs.io', 'cloudflare', 'dweb'];
  
  for (const gateway of gateways) {
    try {
      const url = toHttpFromIpfs(uri, gateway);
      if (!url) continue;
      
      console.log(`🔄 Trying ${gateway} gateway:`, url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ Success with ${gateway} gateway`);
        return await response.json();
      }
      console.log(`❌ ${gateway} failed with status:`, response.status);
    } catch (e: any) {
      console.log(`❌ ${gateway} error:`, e.message);
      // Try next gateway
      continue;
    }
  }
  
  throw new Error('All IPFS gateways failed to fetch content');
}

export default function AdminPage() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const formatContractError = React.useCallback((e: unknown): string => {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;

    const anyErr = e as any;
    const pieces: string[] = [];

    const shortMessage = typeof anyErr?.shortMessage === 'string' ? anyErr.shortMessage : '';
    const message = typeof anyErr?.message === 'string' ? anyErr.message : '';
    const details = typeof anyErr?.details === 'string' ? anyErr.details : '';
    const causeMessage = typeof anyErr?.cause?.message === 'string' ? anyErr.cause.message : '';
    const metaMessages = Array.isArray(anyErr?.metaMessages) ? anyErr.metaMessages.filter((m: any) => typeof m === 'string') : [];

    if (shortMessage) pieces.push(shortMessage);
    else if (message) pieces.push(message);
    if (details && !pieces.includes(details)) pieces.push(details);
    if (causeMessage && !pieces.includes(causeMessage)) pieces.push(causeMessage);
    for (const m of metaMessages) {
      if (m && !pieces.includes(m)) pieces.push(m);
    }

    const joined = pieces.filter(Boolean).join(' | ');
    return joined || 'Unknown error';
  }, []);

  const supportedChainIds = React.useMemo<number[]>(() => chains.map((c) => c.id), []);
  const adminEnabledChainIds = React.useMemo(
    () =>
      supportedChainIds.filter(
        (id) =>
          isContractsConfiguredFor(id, ['ASSET_APPROVAL_QUEUE']) ||
          isContractsConfiguredFor(id, ['INCOME_DISTRIBUTOR', 'USDC']),
      ),
    [supportedChainIds],
  );
  const wrongNetwork = isConnected && !adminEnabledChainIds.includes(chainId);

  const { ASSET_APPROVAL_QUEUE, INCOME_DISTRIBUTOR, USDC } = getContractsForChain(chainId);
  const queueWriteEnabled = Boolean(!wrongNetwork && ASSET_APPROVAL_QUEUE);
  const depositWriteEnabled = Boolean(!wrongNetwork && INCOME_DISTRIBUTOR && USDC);

  const [queueOwner, setQueueOwner] = useState<`0x${string}` | null>(null);
  const [queueOwnerError, setQueueOwnerError] = useState<string | null>(null);

  const [incomeOwner, setIncomeOwner] = useState<`0x${string}` | null>(null);
  const [incomeOwnerError, setIncomeOwnerError] = useState<string | null>(null);

  const isQueueOwner = React.useMemo(() => {
    if (!address || !queueOwner) return false;
    return address.toLowerCase() === queueOwner.toLowerCase();
  }, [address, queueOwner]);

  const isIncomeOwner = React.useMemo(() => {
    if (!address || !incomeOwner) return false;
    return address.toLowerCase() === incomeOwner.toLowerCase();
  }, [address, incomeOwner]);

  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const {
    writeContract: writeDepositContract,
    data: depositTxHash,
    error: depositError,
    isPending: isDepositPending,
  } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });

  const {
    writeContract: writeApproveContract,
    data: approveTxHash,
    error: approveError,
    isPending: isApprovePending,
  } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const {
    writeContract: writeQueueContract,
    data: queueTxHash,
    error: queueError,
    isPending: isQueuePending,
  } = useWriteContract();
  const { isLoading: isQueueConfirming, isSuccess: isQueueConfirmed } = useWaitForTransactionReceipt({
    hash: queueTxHash,
  });

  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const [queue, setQueue] = useState<PendingAsset[]>([]);
  const [activity, setActivity] = useState<Array<{ timestamp: string; event: string; ref: string }>>([]);
  const [incomeDeposits, setIncomeDeposits] = useState<
    Array<{ id?: string; assetToken: string; name: string; symbol: string; amount: number; date: string | null; txHash: string }>
  >([]);

  const [assets, setAssets] = useState<IndexedAsset[]>([]);

  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});
  const [submissionMetaById, setSubmissionMetaById] = useState<Record<string, any>>({});
  const [selectedDocUrlById, setSelectedDocUrlById] = useState<Record<string, string>>({});

  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedAssetMeta, setSelectedAssetMeta] = useState<any | null>(null);
  const [depositAmountUsdc, setDepositAmountUsdc] = useState('');
  const [depositConfirmed, setDepositConfirmed] = useState(false);
  const [pendingDeposit, setPendingDeposit] = useState<{ assetToken: `0x${string}`; amount: bigint } | null>(null);
  const [usdcDecimals, setUsdcDecimals] = useState<number>(6);

  const [activeTab, setActiveTab] = useState<'queue' | 'deposits' | 'health'>('queue');

  const [submitTokenAddress, setSubmitTokenAddress] = useState('');
  const [submitMetadataUri, setSubmitMetadataUri] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setQueueOwner(null);
      setQueueOwnerError(null);
      if (!publicClient) return;
      if (!ASSET_APPROVAL_QUEUE || !isAddress(ASSET_APPROVAL_QUEUE)) return;
      try {
        const owner = (await publicClient.readContract({
          address: ASSET_APPROVAL_QUEUE as `0x${string}`,
          abi: ABIS.ASSET_APPROVAL_QUEUE,
          functionName: 'owner',
        })) as `0x${string}`;
        if (!cancelled) setQueueOwner(owner);
      } catch (e) {
        if (!cancelled) setQueueOwnerError(formatContractError(e));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, ASSET_APPROVAL_QUEUE, formatContractError]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIncomeOwner(null);
      setIncomeOwnerError(null);
      if (!publicClient) return;
      if (!INCOME_DISTRIBUTOR || !isAddress(INCOME_DISTRIBUTOR)) return;
      try {
        const owner = (await publicClient.readContract({
          address: INCOME_DISTRIBUTOR as `0x${string}`,
          abi: ABIS.OWNABLE,
          functionName: 'owner',
        })) as `0x${string}`;
        if (!cancelled) setIncomeOwner(owner);
      } catch (e) {
        if (!cancelled) setIncomeOwnerError(formatContractError(e));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, INCOME_DISTRIBUTOR, formatContractError]);

  const estimateClampedGas = React.useCallback(
    async (params: {
      contract: `0x${string}`;
      abi: any;
      functionName: string;
      args: any[];
    }): Promise<bigint | undefined> => {
      if (!publicClient || !address) return undefined;
      try {
        const estimated = await publicClient.estimateContractGas({
          address: params.contract,
          abi: params.abi,
          functionName: params.functionName as any,
          args: params.args as any,
          account: address as `0x${string}`,
        } as any);

        const bump = (estimated * 12n) / 10n; // +20%
        const min = 150_000n;
        const max = 1_500_000n;
        const clamped = bump < min ? min : bump > max ? max : bump;
        return clamped;
      } catch {
        // Fallback: keep well below common RPC gas caps.
        return 500_000n;
      }
    },
    [publicClient, address],
  );

  const simulateQueueOrThrow = React.useCallback(
    async (params: { functionName: string; args: any[] }) => {
      if (!publicClient) throw new Error('RPC client not ready. Try again.');
      if (!address) throw new Error('Wallet address not ready. Try again.');
      if (!ASSET_APPROVAL_QUEUE || !isAddress(ASSET_APPROVAL_QUEUE)) {
        throw new Error('AssetApprovalQueue is not configured for this network.');
      }

      // eth_call preflight: surfaces real revert reason (instead of MetaMask generic failure)
      await publicClient.simulateContract({
        address: ASSET_APPROVAL_QUEUE as `0x${string}`,
        abi: ABIS.ASSET_APPROVAL_QUEUE,
        functionName: params.functionName as any,
        args: params.args as any,
        account: address as `0x${string}`,
      } as any);
    },
    [publicClient, address, ASSET_APPROVAL_QUEUE],
  );

  const mapQueueStatusUi = React.useCallback((raw: unknown): string => {
    const n = typeof raw === 'bigint' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
    if (n === 2) return 'Approved';
    if (n === 3) return 'Rejected';
    if (n === 1) return 'Pending';
    return 'Unknown';
  }, []);

  const isSubmissionNotFoundError = React.useCallback(
    (e: unknown) => {
      const msg = formatContractError(e);
      return msg.includes('SubmissionNotFound') || msg.includes('Submission not found');
    },
    [formatContractError],
  );

  const simulateDepositOrThrow = React.useCallback(
    async (params: { assetToken: `0x${string}`; incomeToken: `0x${string}`; amount: bigint }) => {
      if (!publicClient) throw new Error('RPC client not ready. Try again.');
      if (!address) throw new Error('Wallet address not ready. Try again.');
      if (!INCOME_DISTRIBUTOR || !isAddress(INCOME_DISTRIBUTOR)) {
        throw new Error('IncomeDistributor is not configured for this network.');
      }

      await publicClient.simulateContract({
        address: INCOME_DISTRIBUTOR as `0x${string}`,
        abi: ABIS.INCOME_DISTRIBUTOR,
        functionName: 'depositIncome',
        args: [params.assetToken, params.incomeToken, params.amount],
        account: address as `0x${string}`,
      } as any);
    },
    [publicClient, address, INCOME_DISTRIBUTOR],
  );
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const [indexedAt, setIndexedAt] = useState<string | null>(null);
  const [indexed, setIndexed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const indexerHealthy = React.useMemo(() => {
    if (!indexed || !indexedAt) return false;
    const ts = Date.parse(indexedAt);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts <= 30_000;
  }, [indexed, indexedAt]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!address) {
        setIsAdmin(false);
        setRoleError(null);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);
      setRoleError(null);
      try {
        const res = await fetch(`/api/admin/role/${address}`, { cache: 'no-store' });
        const json = (await res.json()) as any;
        if (!res.ok) throw new Error(json?.error || 'Failed to check admin role');
        if (!cancelled) setIsAdmin(json?.role === 'admin');
      } catch (e) {
        if (!cancelled) {
          setIsAdmin(false);
          setRoleError(e instanceof Error ? e.message : 'Failed to check admin role');
        }
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const normalizeDocuments = React.useCallback((meta: any): PendingAsset['documents'] => {
    const raw = meta?.documents ?? meta?.files ?? meta?.attachments ?? null;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    const out: PendingAsset['documents'] = [];
    for (const item of arr) {
      if (!item) continue;
      if (typeof item === 'string') {
        const url = item.trim();
        if (!url) continue;
        out.push({ name: 'Document', url, type: '' });
        continue;
      }
      if (typeof item === 'object') {
        const url = String((item as any).url ?? (item as any).uri ?? (item as any).href ?? '').trim();
        if (!url) continue;
        const name = String((item as any).name ?? (item as any).title ?? 'Document');
        const type = String((item as any).type ?? (item as any).mimeType ?? '');
        out.push({ name, url, type });
      }
    }
    return out;
  }, []);

  const isPdfUrl = React.useCallback((url: string, type: string) => {
    const u = (url || '').toLowerCase();
    const t = (type || '').toLowerCase();
    if (t.includes('pdf')) return true;
    return u.endsWith('.pdf');
  }, []);

  const isImageUrl = React.useCallback((url: string, type: string) => {
    const u = (url || '').toLowerCase();
    const t = (type || '').toLowerCase();
    if (t.startsWith('image/')) return true;
    return u.endsWith('.png') || u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.webp') || u.endsWith('.gif');
  }, []);

  const fetchQueueFromBlockchain = React.useCallback(async () => {
    if (!publicClient || !ASSET_APPROVAL_QUEUE || !isAddress(ASSET_APPROVAL_QUEUE)) {
      return [];
    }

    try {
      // Get submission count from contract
      const submissionCount = (await publicClient.readContract({
        address: ASSET_APPROVAL_QUEUE as `0x${string}`,
        abi: ABIS.ASSET_APPROVAL_QUEUE,
        functionName: 'submissionCount',
      })) as bigint;

      console.log('📊 Fetching submissions from blockchain. Count:', submissionCount.toString());

      const submissions: PendingAsset[] = [];

      // Fetch each submission
      for (let i = 1n; i <= submissionCount; i++) {
        try {
          const submission = (await publicClient.readContract({
            address: ASSET_APPROVAL_QUEUE as `0x${string}`,
            abi: ABIS.ASSET_APPROVAL_QUEUE,
            functionName: 'getSubmission',
            args: [i],
          })) as any;

          // getSubmission returns: (token, submitter, metadataURI, submittedAt, status, reviewedAt, reviewer)
          const token = submission.token || submission[0];
          const submitter = submission.submitter || submission[1];
          const metadataURI = submission.metadataURI || submission[2];
          const submittedAt = submission.submittedAt || submission[3];
          const status = submission.status || submission[4];

          console.log(`📋 Submission ${i}: status=${status} (0=None, 1=Pending, 2=Approved, 3=Rejected)`);

          // Only show pending submissions (status = 1)
          if (Number(status) !== 1) {
            console.log(`⏭️ Skipping submission ${i}: status is ${status}, not Pending`);
            continue;
          }

          // Fetch metadata from IPFS with multiple gateway fallbacks
          let metadata: any = {};
          let metadataError: string | null = null;
          try {
            console.log(`📥 Fetching metadata for submission ${i} from:`, metadataURI);
            metadata = await fetchFromIPFS(metadataURI);
            console.log(`✅ Successfully fetched metadata for submission ${i}`);
          } catch (e: any) {
            metadataError = e.message || 'Failed to fetch metadata';
            console.error(`❌ Failed to fetch metadata for submission ${i}:`, e);
            console.error(`   Metadata URI was:`, metadataURI);
          }

          submissions.push({
            id: i.toString(),
            tokenAddress: token,
            metadataURI,
            name: metadata.assetDetails?.name || metadata.tokenization?.tokenName || (metadataError ? '⚠️ Metadata Unavailable' : 'Unknown Asset'),
            symbol: metadata.tokenization?.tokenSymbol || 'N/A',
            location: metadata.assetDetails?.location?.address || metadata.assetDetails?.location || 'Unknown',
            assetType: metadata.assetDetails?.type || 'real-estate',
            description: metadata.assetDetails?.description || (metadataError ? `Unable to load metadata: ${metadataError}` : ''),
            submitter,
            submissionDate: new Date(Number(submittedAt) * 1000).toISOString(),
            status: 'pending',
            documents: metadataError ? [] : Object.entries(metadata.documents || {}).map(([name, cid]) => {
              // Convert camelCase to Title Case (e.g., titleDeed -> Title Deed)
              const displayName = name
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase())
                .trim();
              return {
                name: displayName,
                url: toHttpFromIpfs(cid as string, 'pinata') || (cid as string),
                type: name.toLowerCase().includes('pdf') ? 'pdf' : 'document'
              };
            }),
            requestedSupply: parseFloat(metadata.tokenization?.totalSupply || '0'),
            pricePerToken: parseFloat(metadata.tokenization?.pricePerToken || '0'),
          });
        } catch (e) {
          console.error(`Error fetching submission ${i}:`, e);
        }
      }

      console.log('✅ Fetched', submissions.length, 'pending submissions from blockchain');
      return submissions;
    } catch (e) {
      console.error('Failed to fetch queue from blockchain:', e);
      return [];
    }
  }, [publicClient, ASSET_APPROVAL_QUEUE]);

  const loadAdminData = React.useCallback(async () => {
    if (!address) return;
    if (roleLoading) return;
    if (!isAdmin) return;

    setLoading(true);
    setLoadError(null);
    try {
      const [queueRes, activityRes, incomeRes, assetsRes] = await Promise.all([
        fetch('/api/admin/queue', { cache: 'no-store' }),
        fetch('/api/admin/activity', { cache: 'no-store' }),
        fetch('/api/admin/income', { cache: 'no-store' }),
        fetch('/api/admin/assets', { cache: 'no-store' }),
      ]);

      const queueJson = (await queueRes.json()) as any;
      const activityJson = (await activityRes.json()) as any;
      const incomeJson = (await incomeRes.json()) as any;
      const assetsJson = (await assetsRes.json()) as any;

      if (!queueRes.ok) throw new Error(queueJson?.error || 'Failed to load admin queue');
      if (!activityRes.ok) throw new Error(activityJson?.error || 'Failed to load admin activity');
      if (!incomeRes.ok) throw new Error(incomeJson?.error || 'Failed to load income deposits');
      if (!assetsRes.ok) throw new Error(assetsJson?.error || 'Failed to load indexed assets');

      const updatedAt =
        (queueJson?.updatedAt ?? activityJson?.updatedAt ?? incomeJson?.updatedAt ?? assetsJson?.updatedAt ?? null) as
          | string
          | null;
      const isIndexed = Boolean(queueJson?.indexed || activityJson?.indexed || incomeJson?.indexed || assetsJson?.indexed);

      let queueData = Array.isArray(queueJson?.queue) ? queueJson.queue : [];

      // Check if indexer is stale (more than 15 minutes old)
      const indexerAge = updatedAt ? Date.now() - new Date(updatedAt).getTime() : Infinity;
      const isStale = indexerAge > 15 * 60 * 1000; // 15 minutes

      // ALWAYS fetch directly from blockchain for most up-to-date data
      console.log('🔄 Fetching fresh data from blockchain...');
      const blockchainQueue = await fetchQueueFromBlockchain();
      // Always use blockchain data as source of truth
      queueData = blockchainQueue;
      console.log(`✅ Using blockchain data: ${blockchainQueue.length} pending submissions`);

      setQueue(queueData);
      setActivity(Array.isArray(activityJson?.activity) ? activityJson.activity : []);
      setIncomeDeposits(Array.isArray(incomeJson?.deposits) ? incomeJson.deposits : []);
      setAssets(Array.isArray(assetsJson?.assets) ? assetsJson.assets : []);
      setIndexedAt(updatedAt);
      setIndexed(isIndexed);
    } catch (e) {
      setQueue([]);
      setActivity([]);
      setIncomeDeposits([]);
      setAssets([]);
      setIndexedAt(null);
      setIndexed(false);
      setLoadError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [address, isAdmin, roleLoading, fetchQueueFromBlockchain]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadAdminData();
    };
    run();
    const t = setInterval(run, 5_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [loadAdminData]);

  // Hydrate submission docs/details from metadata when a row is expanded.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const id = expandedSubmissionId;
      if (!id) return;
      if (submissionMetaById[id]) return;

      const submission = queue.find((q) => q.id === id);
      const uri = submission?.metadataURI ?? null;
      if (!uri) return;

      try {
        console.log(`📥 Fetching metadata for submission ${id} from IPFS...`);
        const json = await fetchFromIPFS(uri);
        if (cancelled) return;

        const docs = normalizeDocuments(json);
        setSubmissionMetaById((cur) => ({ ...cur, [id]: json }));
        setQueue((cur) =>
          cur.map((row) => {
            if (row.id !== id) return row;
            return {
              ...row,
              name: typeof json?.name === 'string' ? json.name : row.name,
              symbol: typeof json?.symbol === 'string' ? json.symbol : row.symbol,
              location: typeof json?.location === 'string' ? json.location : row.location,
              assetType: typeof json?.assetType === 'string' ? json.assetType : row.assetType,
              description: typeof json?.description === 'string' ? json.description : row.description,
              documents: docs.length ? docs : row.documents,
            };
          }),
        );

        if (docs.length && !selectedDocUrlById[id]) {
          setSelectedDocUrlById((cur) => ({ ...cur, [id]: docs[0].url }));
        }
      } catch {
        // ignore
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [expandedSubmissionId, normalizeDocuments, queue, selectedDocUrlById, submissionMetaById]);

  const activeAssets = React.useMemo(() => assets.filter((a) => a && a.active && typeof a.token === 'string'), [assets]);
  const selectedAsset = React.useMemo(
    () => activeAssets.find((a) => a.assetId === selectedAssetId) ?? null,
    [activeAssets, selectedAssetId],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setSelectedAssetMeta(null);
      if (!selectedAsset?.metadataURI) return;
      try {
        console.log('📥 Fetching asset metadata from IPFS...');
        const json = await fetchFromIPFS(selectedAsset.metadataURI);
        if (!cancelled) setSelectedAssetMeta(json);
      } catch (e) {
        console.error('❌ Failed to fetch asset metadata:', e);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedAsset?.metadataURI]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!publicClient) return;
      if (!USDC || !isAddress(USDC)) return;
      try {
        const d = (await publicClient.readContract({
          address: USDC as `0x${string}`,
          abi: ABIS.ERC20,
          functionName: 'decimals',
        })) as number;
        if (!cancelled && typeof d === 'number') setUsdcDecimals(d);
      } catch {
        if (!cancelled) setUsdcDecimals(6);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, USDC]);

  const handleApprove = async (assetId: string) => {
    setProcessingAction(`approve-${assetId}`);

    if (!isConnected) {
      alert('Connect your wallet to perform admin actions.');
      setProcessingAction(null);
      return;
    }

    if (!queueWriteEnabled) {
      alert('This network is not configured for submission approvals.');
      setProcessingAction(null);
      return;
    }

    if (!ASSET_APPROVAL_QUEUE) {
      alert('AssetApprovalQueue contract is not configured for this network.');
      setProcessingAction(null);
      return;
    }

    if (queueOwner && !isQueueOwner) {
      alert(`Approve/reject requires the queue owner wallet. Queue owner is ${queueOwner}.`);
      setProcessingAction(null);
      return;
    }

    try {
      // Step 1: Approve on-chain (changes status to Approved)
      console.log('📋 Step 1/2: Approving submission on-chain...');
      await simulateQueueOrThrow({ functionName: 'approve', args: [BigInt(assetId)] });
      const gas = await estimateClampedGas({
        contract: ASSET_APPROVAL_QUEUE as `0x${string}`,
        abi: ABIS.ASSET_APPROVAL_QUEUE,
        functionName: 'approve',
        args: [BigInt(assetId)],
      });
      const hash = await writeQueueContract({
        address: ASSET_APPROVAL_QUEUE as `0x${string}`,
        abi: ABIS.ASSET_APPROVAL_QUEUE,
        functionName: 'approve',
        args: [BigInt(assetId)],
        gas,
      });
      
      console.log('✅ Approval transaction submitted:', hash);
      alert('Approval transaction submitted. Waiting for confirmation before starting deployment pipeline...');
      
      // Wait for transaction confirmation
      if (publicClient && hash) {
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
        console.log('✅ Approval confirmed on-chain');
        
        // Step 2: Trigger deployment pipeline
        console.log('🚀 Step 2/2: Starting post-approval deployment pipeline...');
        const submission = queue.find(q => q.id === assetId);
        
        if (!submission) {
          alert('Could not find submission details for deployment. Refresh the page.');
          setProcessingAction(null);
          return;
        }
        
        try {
          // Fetch full metadata from IPFS
          console.log('📥 Fetching metadata from IPFS...');
          if (!submission.metadataURI) {
            throw new Error('Metadata URI is missing');
          }
          const metadata = await fetchFromIPFS(submission.metadataURI);
          
          // Call deployment API
          console.log('🏗️ Calling deployment API...');
          const deployRes = await fetch('/api/admin/deploy-asset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submissionId: assetId,
              metadataURI: submission.metadataURI,
              metadata,
            }),
          });
          
          const deployResult = await deployRes.json();
          
          if (deployResult.success) {
            alert(`✅ Asset deployed successfully!\n\n` +
                  `Token: ${deployResult.steps.tokenAddress}\n` +
                  `Pool: ${deployResult.steps.ammPoolAddress}\n` +
                  `Marketplace visible: ${deployResult.steps.marketplaceVisible ? 'Yes' : 'No'}`);
          } else {
            alert(`⚠️ Partial deployment completed.\n\n` +
                  `Some steps are not yet implemented or failed.\n` +
                  `Token deployed: ${deployResult.steps.tokenDeployed}\n` +
                  `Pool deployed: ${deployResult.steps.ammPoolDeployed}\n\n` +
                  `Error: ${deployResult.error || 'See console for details'}`);
          }
          
          console.log('📊 Deployment result:', deployResult);
        } catch (deployError: any) {
          console.error('❌ Deployment pipeline failed:', deployError);
          alert(`⚠️ Approval succeeded but deployment failed:\n${deployError.message}\n\nThe asset is approved but not yet deployed to marketplace.`);
        }
      }
      
      // Refresh queue regardless
      setTimeout(() => loadAdminData(), 1000);
      
    } catch (e) {
      console.error('❌ Approval error:', e);
      const errorMsg = formatContractError(e);
      if (errorMsg.includes('SubmissionNotPending')) {
        alert('This submission is no longer pending. It may have already been approved or rejected. Refreshing the list...');
        setTimeout(() => loadAdminData(), 500);
      } else {
        alert('Failed to approve asset: ' + errorMsg);
      }
      setProcessingAction(null);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (assetId: string) => {
    setProcessingAction(`reject-${assetId}`);

    if (!isConnected) {
      alert('Connect your wallet to perform admin actions.');
      setProcessingAction(null);
      return;
    }

    if (!queueWriteEnabled) {
      alert('This network is not configured for submission reviews.');
      setProcessingAction(null);
      return;
    }

    if (!ASSET_APPROVAL_QUEUE) {
      alert('AssetApprovalQueue contract is not configured for this network.');
      setProcessingAction(null);
      return;
    }

    if (queueOwner && !isQueueOwner) {
      alert(`Approve/reject requires the queue owner wallet. Queue owner is ${queueOwner}.`);
      setProcessingAction(null);
      return;
    }

    const reason = (rejectReasonById[assetId] || '').trim();
    if (!reason) {
      alert('Rejection requires a reason.');
      setProcessingAction(null);
      return;
    }

    try {
      await simulateQueueOrThrow({ functionName: 'reject', args: [BigInt(assetId), reason] });
      const gas = await estimateClampedGas({
        contract: ASSET_APPROVAL_QUEUE as `0x${string}`,
        abi: ABIS.ASSET_APPROVAL_QUEUE,
        functionName: 'reject',
        args: [BigInt(assetId), reason],
      });
      await writeQueueContract({
        address: ASSET_APPROVAL_QUEUE as `0x${string}`,
        abi: ABIS.ASSET_APPROVAL_QUEUE,
        functionName: 'reject',
        args: [BigInt(assetId), reason],
        gas,
      });
    } catch (e) {
      console.error('Reject error:', e);
      const errorMsg = formatContractError(e);
      if (errorMsg.includes('SubmissionNotPending')) {
        alert('This submission is no longer pending. It may have already been approved or rejected. Refreshing the list...');
        setTimeout(() => loadAdminData(), 500);
      } else {
        alert('Failed to reject asset: ' + errorMsg);
      }
      setProcessingAction(null);
    }
  };

  useEffect(() => {
    if (isQueueConfirmed) {
      console.log('✅ Queue action confirmed on blockchain');
      alert('Queue action confirmed.');
      setProcessingAction(null);
      // Force immediate refresh from blockchain
      setTimeout(() => {
        console.log('🔄 Refreshing queue after confirmation...');
        loadAdminData();
      }, 1000);
    }
  }, [isQueueConfirmed, loadAdminData]);

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      await loadAdminData();
    } finally {
      setTimeout(() => setManualRefreshing(false), 500);
    }
  };

  useEffect(() => {
    if (queueError) {
      alert('Queue action failed: ' + formatContractError(queueError));
      setProcessingAction(null);
    }
  }, [queueError, formatContractError]);

  const handleDepositIncome = async () => {
    if (!isConnected) {
      alert('Please connect your wallet to deposit income.');
      return;
    }

    if (!address) {
      alert('Wallet address not available yet. Try again in a moment.');
      return;
    }

    if (!depositWriteEnabled) {
      alert('Income deposits are not configured for this network.');
      return;
    }

    if (!INCOME_DISTRIBUTOR || !USDC) {
      alert('IncomeDistributor/USDC is not configured for this network.');
      return;
    }

    if (incomeOwner && !isIncomeOwner) {
      alert(`Income deposits require the IncomeDistributor owner wallet. Owner is ${incomeOwner}.`);
      return;
    }

    if (!selectedAsset || !isAddress(selectedAsset.token)) {
      alert('Select a valid asset to deposit income into.');
      return;
    }

    if (!selectedAsset.active) {
      alert('Income deposits are only allowed for verified assets.');
      return;
    }

    if (!depositConfirmed) {
      alert('Please confirm the deposit details before submitting.');
      return;
    }

    const rawAmount = depositAmountUsdc.trim();
    if (!rawAmount) {
      alert('Enter a USDC amount to deposit.');
      return;
    }

    let amountUnits: bigint;
    try {
      amountUnits = parseUnits(rawAmount, usdcDecimals);
    } catch {
      alert('Invalid amount format. Example: 1000.50');
      return;
    }
    if (amountUnits <= 0n) {
      alert('Amount must be greater than 0.');
      return;
    }

    if (!publicClient) {
      alert('Wallet client is not ready yet. Try again in a moment.');
      return;
    }

    const assetToken = selectedAsset.token as `0x${string}`;
    const usdcAddress = USDC as `0x${string}`;
    const incomeDistributor = INCOME_DISTRIBUTOR as `0x${string}`;

    // Ensure allowance for IncomeDistributor to pull USDC.
    try {
      const allowance = (await publicClient.readContract({
        address: usdcAddress,
        abi: ABIS.ERC20,
        functionName: 'allowance',
        args: [address as `0x${string}`, incomeDistributor],
      })) as bigint;

      if (allowance < amountUnits) {
        setPendingDeposit({ assetToken, amount: amountUnits });

        const approveGas = await estimateClampedGas({
          contract: usdcAddress,
          abi: ABIS.ERC20,
          functionName: 'approve',
          args: [incomeDistributor, amountUnits],
        });
        await writeApproveContract({
          address: usdcAddress,
          abi: ABIS.ERC20,
          functionName: 'approve',
          args: [incomeDistributor, amountUnits],
          gas: approveGas,
        });
        return;
      }
    } catch (e) {
      console.error('Allowance check failed:', e);
      alert('Failed to verify USDC allowance: ' + formatContractError(e));
      return;
    }

    try {
      await simulateDepositOrThrow({ assetToken, incomeToken: usdcAddress, amount: amountUnits });
      const gas = await estimateClampedGas({
        contract: incomeDistributor,
        abi: ABIS.INCOME_DISTRIBUTOR,
        functionName: 'depositIncome',
        args: [assetToken, usdcAddress, amountUnits],
      });
      await writeDepositContract({
        address: incomeDistributor,
        abi: ABIS.INCOME_DISTRIBUTOR,
        functionName: 'depositIncome',
        args: [assetToken, usdcAddress, amountUnits],
        value: 0n,
        gas,
      });
    } catch (e) {
      console.error('Deposit error:', e);
      alert('Failed to deposit income: ' + formatContractError(e));
    }
  };

  useEffect(() => {
    if (!isApproveConfirmed) return;
    if (!pendingDeposit) return;
    if (!INCOME_DISTRIBUTOR || !USDC) return;

    (async () => {
      try {
        if (incomeOwner && !isIncomeOwner) {
          alert(`Income deposits require the IncomeDistributor owner wallet. Owner is ${incomeOwner}.`);
          return;
        }

        await simulateDepositOrThrow({
          assetToken: pendingDeposit.assetToken,
          incomeToken: USDC as `0x${string}`,
          amount: pendingDeposit.amount,
        });

        const gas = await estimateClampedGas({
          contract: INCOME_DISTRIBUTOR as `0x${string}`,
          abi: ABIS.INCOME_DISTRIBUTOR,
          functionName: 'depositIncome',
          args: [pendingDeposit.assetToken, USDC as `0x${string}`, pendingDeposit.amount],
        });
        await writeDepositContract({
          address: INCOME_DISTRIBUTOR as `0x${string}`,
          abi: ABIS.INCOME_DISTRIBUTOR,
          functionName: 'depositIncome',
          args: [pendingDeposit.assetToken, USDC as `0x${string}`, pendingDeposit.amount],
          value: 0n,
          gas,
        });
      } catch (e) {
        console.error('Deposit after approve failed:', e);
        alert('USDC approval succeeded, but deposit failed: ' + formatContractError(e));
      } finally {
        setPendingDeposit(null);
      }
    })();
  }, [isApproveConfirmed, pendingDeposit, INCOME_DISTRIBUTOR, USDC, writeDepositContract, incomeOwner, isIncomeOwner, estimateClampedGas, simulateDepositOrThrow, formatContractError]);

  useEffect(() => {
    if (isDepositConfirmed) {
      alert('Income deposited successfully.');
      setDepositAmountUsdc('');
      setDepositConfirmed(false);
    }
  }, [isDepositConfirmed]);

  const handleSubmitToQueue = async () => {
    setProcessingAction('submit');

    if (!isConnected) {
      alert('Connect your wallet to submit.');
      setProcessingAction(null);
      return;
    }

    if (!queueWriteEnabled || !ASSET_APPROVAL_QUEUE) {
      alert('AssetApprovalQueue is not configured for this network.');
      setProcessingAction(null);
      return;
    }

    const token = submitTokenAddress.trim();
    const uri = submitMetadataUri.trim();
    if (!isAddress(token as any)) {
      alert('Enter a valid token contract address (0x…).');
      setProcessingAction(null);
      return;
    }
    if (!uri) {
      alert('Enter a metadata URI (ipfs://… or https://…).');
      setProcessingAction(null);
      return;
    }

    // Product-standpoint validation: require a deployed contract that looks like an ERC20.
    try {
      if (!publicClient) throw new Error('RPC client not ready. Try again.');

      const bytecode = await publicClient.getBytecode({ address: token as `0x${string}` });
      if (!bytecode || bytecode === '0x') {
        alert('Token must be a deployed contract address (not a wallet/EOA).');
        setProcessingAction(null);
        return;
      }

      // Minimal ERC20 sanity check (cheap + robust): decimals()
      await publicClient.readContract({
        address: token as `0x${string}`,
        abi: ABIS.ERC20,
        functionName: 'decimals',
      });
    } catch (e) {
      alert('Token address does not appear to be an ERC20 contract: ' + formatContractError(e));
      setProcessingAction(null);
      return;
    }

    // Avoid a revert + MetaMask failed tx: check if this token is already submitted.
    try {
      if (publicClient && ASSET_APPROVAL_QUEUE && isAddress(ASSET_APPROVAL_QUEUE)) {
        const info = (await publicClient.readContract({
          address: ASSET_APPROVAL_QUEUE as `0x${string}`,
          abi: ABIS.ASSET_APPROVAL_QUEUE,
          functionName: 'getSubmissionInfoByToken',
          args: [token as `0x${string}`],
        })) as any;

        const submissionId = info?.[0] as bigint | undefined;
        const status = info?.[3] as number | bigint | undefined;
        if (submissionId && submissionId > 0n) {
          alert(
            `This token is already submitted (submission #${submissionId.toString()}, status: ${mapQueueStatusUi(status)}). Use a different asset token address.`,
          );
          setProcessingAction(null);
          return;
        }
      }
    } catch (e) {
      // getSubmissionInfoByToken reverts with SubmissionNotFound when it's not submitted; that's expected.
      if (!isSubmissionNotFoundError(e)) {
        console.error('Pre-check getSubmissionInfoByToken failed:', e);
        alert('Failed to check existing submission: ' + formatContractError(e));
        setProcessingAction(null);
        return;
      }
    }

    try {
      await simulateQueueOrThrow({ functionName: 'submit', args: [token as `0x${string}`, uri] });
      const gas = await estimateClampedGas({
        contract: ASSET_APPROVAL_QUEUE as `0x${string}`,
        abi: ABIS.ASSET_APPROVAL_QUEUE,
        functionName: 'submit',
        args: [token as `0x${string}`, uri],
      });
      await writeQueueContract({
        address: ASSET_APPROVAL_QUEUE as `0x${string}`,
        abi: ABIS.ASSET_APPROVAL_QUEUE,
        functionName: 'submit',
        args: [token as `0x${string}`, uri],
        gas,
      });
    } catch (e) {
      console.error('Submit error:', e);
      alert('Failed to submit: ' + formatContractError(e));
      setProcessingAction(null);
    }
  };

  useEffect(() => {
    if (depositError) {
      alert('Deposit failed: ' + formatContractError(depositError));
    }
  }, [depositError, formatContractError]);

  useEffect(() => {
    if (approveError) {
      alert('USDC approval failed: ' + formatContractError(approveError));
      setPendingDeposit(null);
    }
  }, [approveError, formatContractError]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Operations console (review queue, approvals, audit).
          </p>
        </div>

        <RequireWallet supportedChainIds={adminEnabledChainIds}>
          {roleLoading && <Alert type="warning" message="Checking admin permissions…" />}
          {roleError && <Alert type="error" message={roleError} />}
          {!roleLoading && !roleError && !isAdmin && (
            <Alert type="error" message="This wallet is not authorized for admin access." />
          )}

          {!roleLoading && !roleError && isAdmin && (
            <>
              {/* Tab Navigation */}
              <div className="mb-6 border-b border-[color:var(--border)]">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('queue')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      activeTab === 'queue'
                        ? 'border-[color:var(--accent)] text-[color:var(--accent)]'
                        : 'border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
                    }`}
                  >
                    Approval Queue
                  </button>
                  <button
                    onClick={() => setActiveTab('deposits')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      activeTab === 'deposits'
                        ? 'border-[color:var(--accent)] text-[color:var(--accent)]'
                        : 'border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
                    }`}
                  >
                    Income Deposits
                  </button>
                  <button
                    onClick={() => setActiveTab('health')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      activeTab === 'health'
                        ? 'border-[color:var(--accent)] text-[color:var(--accent)]'
                        : 'border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text)]'
                    }`}
                  >
                    System Health
                  </button>
                  <a
                    href="/admin/wind-down"
                    className="px-4 py-2 font-medium border-b-2 border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
                  >
                    Asset Wind-Down
                  </a>
                </div>
              </div>

              {/* Health Monitor Tab */}
              {activeTab === 'health' && <SystemHealthMonitor />}

              {/* Queue and Deposits Tabs */}
              {activeTab !== 'health' && (
                <>

          {queueOwnerError && (
            <div className="mb-6">
              <Alert type="warning" message={`Could not read queue owner on-chain: ${queueOwnerError}`} />
            </div>
          )}

          {ASSET_APPROVAL_QUEUE && isAddress(ASSET_APPROVAL_QUEUE) && queueOwner && !isQueueOwner && (
            <div className="mb-6">
              <Alert
                type="warning"
                message={`Approve/Reject will revert unless you connect the queue owner wallet. Queue owner: ${queueOwner}.`}
              />
            </div>
          )}

          {!indexerHealthy && (
            <div className="mb-6">
              <Alert
                type="warning"
                message={
                  indexedAt
                    ? `Indexer is stale (last update: ${indexedAt}). Data may be outdated.`
                    : 'Indexer is not available yet. Data may be empty until the next refresh.'
                }
              />
            </div>
          )}

          <div className="surface rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-[color:var(--border)] flex items-center justify-between gap-4">
              <div className="text-sm font-semibold">Income Deposits</div>
              <div className="text-xs text-[color:var(--text-muted)]">
                {loading ? 'Loading index…' : indexedAt ? `Indexed: ${indexedAt}` : 'Indexer not available'}
              </div>
            </div>

            <div className="px-6 py-4">
              {!depositWriteEnabled && (
                <Alert type="warning" message="Income deposits are not configured for this network." />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[color:var(--text-muted)]">Asset</label>
                  <select
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm"
                  >
                    <option value="">Select asset…</option>
                    {activeAssets.map((a) => (
                      <option key={a.assetId} value={a.assetId}>
                        {(a.name ?? 'Asset') + (a.symbol ? ` (${a.symbol})` : '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[color:var(--text-muted)]">Amount (USDC)</label>
                  <input
                    value={depositAmountUsdc}
                    onChange={(e) => setDepositAmountUsdc(e.target.value)}
                    placeholder="1000.00"
                    className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="primary"
                    onClick={handleDepositIncome}
                    loading={isApprovePending || isApproveConfirming || isDepositPending || isDepositConfirming}
                    disabled={
                      processingAction !== null ||
                      wrongNetwork ||
                      !isAdmin ||
                      !depositWriteEnabled ||
                      !selectedAssetId ||
                      !depositConfirmed ||
                      Boolean(selectedAssetId && selectedAsset && !selectedAsset.active) ||
                      Boolean(incomeOwner && address && incomeOwner.toLowerCase() !== address.toLowerCase())
                    }
                    className="w-full"
                  >
                    Deposit USDC
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-xs">
                  <div className="text-[color:var(--text-muted)]">Token contract (read-only)</div>
                  <div className="mt-1 font-mono break-all">{selectedAsset?.token ?? '—'}</div>
                </div>
                <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-xs">
                  <div className="text-[color:var(--text-muted)]">Income contract (read-only)</div>
                  <div className="mt-1 font-mono break-all">{INCOME_DISTRIBUTOR || '—'}</div>
                </div>
                <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-xs">
                  <div className="text-[color:var(--text-muted)]">Income token (USDC, read-only)</div>
                  <div className="mt-1 font-mono break-all">{USDC || '—'}</div>
                </div>
                <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-xs">
                  <div className="text-[color:var(--text-muted)]">Asset status</div>
                  <div className="mt-1">{selectedAsset ? (selectedAsset.active ? 'Verified' : 'Unverified') : '—'}</div>
                </div>
              </div>

              {selectedAssetMeta && (
                <div className="mt-4 text-xs text-[color:var(--text-muted)]">
                  <div>Asset type: {typeof selectedAssetMeta.assetType === 'string' ? selectedAssetMeta.assetType : '—'}</div>
                  <div>Location: {typeof selectedAssetMeta.location === 'string' ? selectedAssetMeta.location : '—'}</div>
                </div>
              )}

              {selectedAssetId && selectedAsset && !selectedAsset.active && (
                <div className="mt-4">
                  <Alert type="warning" message="Income deposits are disabled for unverified assets." />
                </div>
              )}

              <div className="mt-4 flex items-start gap-2">
                <input
                  id="deposit-confirm"
                  type="checkbox"
                  checked={depositConfirmed}
                  onChange={(e) => setDepositConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="deposit-confirm" className="text-xs text-[color:var(--text-muted)]">
                  I confirm the selected asset and USDC amount are correct.
                </label>
              </div>
            </div>

            <div className="overflow-x-auto border-t border-[color:var(--border)]">
              <table className="w-full">
                <thead className="bg-[color:var(--bg)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {incomeDeposits.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-sm text-[color:var(--text-muted)]" colSpan={4}>
                        No deposits indexed yet.
                      </td>
                    </tr>
                  ) : (
                    incomeDeposits
                      .slice()
                      .reverse()
                      .map((d) => (
                        <tr key={d.id ?? d.txHash} className="hover:bg-[color:var(--panel-2)] transition-colors">
                          <td className="px-6 py-4 text-sm text-[color:var(--text-muted)]">{d.date ?? '—'}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium">{d.name}</div>
                            <div className="text-xs text-[color:var(--text-muted)]">{d.symbol} • {d.assetToken}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-right tabular-nums">
                            {(d.amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-[color:var(--text-muted)]">{d.txHash}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-[color:var(--border)] flex items-center justify-between gap-4">
              <div className="text-sm font-semibold">Submission Queue</div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-[color:var(--text-muted)]">
                  {loading ? 'Loading index…' : indexedAt ? `Indexed: ${indexedAt}` : 'Indexer not available'}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualRefresh}
                  loading={manualRefreshing}
                  disabled={manualRefreshing}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-[color:var(--border)]">
              <div className="text-sm font-semibold">Submit to queue</div>
              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                Use this to create a submission on-chain (so you can approve/reject it).
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-[color:var(--text-muted)]">Token address</label>
                  <input
                    value={submitTokenAddress}
                    onChange={(e) => setSubmitTokenAddress(e.target.value)}
                    placeholder="0x…"
                    className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[color:var(--text-muted)]">Metadata URI</label>
                  <input
                    value={submitMetadataUri}
                    onChange={(e) => setSubmitMetadataUri(e.target.value)}
                    placeholder="ipfs://… or https://…"
                    className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="primary"
                    onClick={handleSubmitToQueue}
                    loading={processingAction === 'submit'}
                    disabled={processingAction !== null || wrongNetwork || !queueWriteEnabled}
                    className="w-full"
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[color:var(--bg)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Submitter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Supply</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {queue.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-sm text-[color:var(--text-muted)]" colSpan={8}>
                        No submissions in queue.
                      </td>
                    </tr>
                  ) : (
                    queue.map((asset) => (
                      <React.Fragment key={asset.id}>
                        <tr className="hover:bg-[color:var(--panel-2)] transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium">{asset.name}</div>
                            <div className="text-xs text-[color:var(--text-muted)]">
                              {asset.symbol} • {asset.location}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">{asset.assetType}</td>
                          <td className="px-6 py-4 text-xs font-mono text-[color:var(--text-muted)]">{asset.submitter}</td>
                          <td className="px-6 py-4 text-sm text-[color:var(--text-muted)]">{asset.submissionDate}</td>
                          <td className="px-6 py-4 text-sm text-right tabular-nums">{asset.requestedSupply.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-right tabular-nums">${asset.pricePerToken.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm">{asset.status}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedSubmissionId((cur) => (cur === asset.id ? null : asset.id))}
                              >
                                {expandedSubmissionId === asset.id ? 'Hide' : 'Review'}
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {expandedSubmissionId === asset.id && (
                          <tr>
                            <td colSpan={8} className="px-6 py-5 bg-[color:var(--bg)]">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2">
                                  <div className="text-sm font-semibold">Submission details</div>
                                  <div className="mt-2 text-sm text-[color:var(--text-muted)]">{asset.description}</div>

                                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-xs">
                                      <div className="text-[color:var(--text-muted)]">Token contract (read-only)</div>
                                      <div className="mt-1 font-mono break-all">{asset.tokenAddress ?? '—'}</div>
                                    </div>
                                    <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-xs">
                                      <div className="text-[color:var(--text-muted)]">Income contract (read-only)</div>
                                      <div className="mt-1 font-mono break-all">{INCOME_DISTRIBUTOR || '—'}</div>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap gap-3 text-xs">
                                    {asset.metadataURI && (
                                      <a
                                        href={toHttpFromIpfs(asset.metadataURI, 'pinata') ?? undefined}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline text-[color:var(--text-muted)]"
                                      >
                                        View metadata
                                      </a>
                                    )}
                                    <div className="text-[color:var(--text-muted)]">Submission ID: {asset.id}</div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm font-semibold">Documents</div>
                                  <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                                    {asset.documents?.length ? '' : 'No documents available.'}
                                  </div>
                                  <div className="mt-2 space-y-2">
                                    {(asset.documents || []).map((d, idx) => (
                                      <button
                                        key={`${asset.id}-doc-${idx}`}
                                        type="button"
                                        onClick={() => setSelectedDocUrlById((cur) => ({ ...cur, [asset.id]: d.url }))}
                                        className="w-full text-left rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 hover:bg-[color:var(--panel-2)] transition-colors"
                                      >
                                        <div className="text-xs underline">{d.name}</div>
                                        <div className="text-[color:var(--text-muted)] text-[11px]">{d.type || 'Document'}</div>
                                      </button>
                                    ))}
                                  </div>

                                  {(() => {
                                    const selected = selectedDocUrlById[asset.id] || '';
                                    if (!selected) return null;
                                    const doc = (asset.documents || []).find((d) => d.url === selected) ?? null;
                                    const docType = doc?.type ?? '';
                                    const http = toHttpFromIpfs(selected, 'pinata') ?? selected;
                                    if (!http) return null;
                                    return (
                                      <div className="mt-3 rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] overflow-hidden">
                                        {isPdfUrl(http, docType) ? (
                                          <iframe title="Document viewer" src={http} className="w-full h-80" />
                                        ) : isImageUrl(http, docType) ? (
                                          <img alt="Document" src={http} className="w-full h-auto" />
                                        ) : (
                                          <div className="p-3 text-xs">
                                            <a href={http} target="_blank" rel="noreferrer" className="underline">
                                              Open document
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  <div className="mt-5">
                                    <label className="block text-xs font-medium text-[color:var(--text-muted)]">Reject reason</label>
                                    <input
                                      value={rejectReasonById[asset.id] ?? ''}
                                      onChange={(e) =>
                                        setRejectReasonById((cur) => ({ ...cur, [asset.id]: e.target.value }))
                                      }
                                      placeholder="Reason (required to reject)"
                                      className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-sm"
                                    />
                                  </div>

                                  <div className="mt-3 flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleApprove(asset.id)}
                                      loading={processingAction === `approve-${asset.id}`}
                                      disabled={
                                        processingAction !== null ||
                                        wrongNetwork ||
                                        !isAdmin ||
                                        !queueWriteEnabled ||
                                        (queueOwner ? !isQueueOwner : false)
                                      }
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleReject(asset.id)}
                                      loading={processingAction === `reject-${asset.id}`}
                                      disabled={
                                        processingAction !== null ||
                                        wrongNetwork ||
                                        !isAdmin ||
                                        !queueWriteEnabled ||
                                        (queueOwner ? !isQueueOwner : false)
                                      }
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface rounded-lg">
            <div className="px-6 py-4 border-b border-[color:var(--border)]">
              <div className="text-sm font-semibold">Activity</div>
              <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                Operational events and review actions.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[color:var(--bg)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wider">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {activity.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-sm text-[color:var(--text-muted)]" colSpan={3}>
                        No activity available.
                      </td>
                    </tr>
                  ) : (
                    activity.map((row, idx) => (
                      <tr key={(row as any)?.id ?? idx} className="hover:bg-[color:var(--panel-2)] transition-colors">
                        <td className="px-6 py-4 text-sm text-[color:var(--text-muted)]">{row.timestamp}</td>
                        <td className="px-6 py-4 text-sm">{row.event}</td>
                        <td className="px-6 py-4 text-xs font-mono text-[color:var(--text-muted)]">{row.ref}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!indexed && (
            <div className="mt-6">
              <Alert type="warning" message="Indexer output not found. Start the indexer to populate the queue and activity." />
            </div>
          )}

          {loadError && (
            <div className="mt-6">
              <Alert type="error" message={loadError} />
            </div>
          )}
              </>
            )}
            </>
          )}
        </RequireWallet>
      </div>
    </MainLayout>
  );
}
