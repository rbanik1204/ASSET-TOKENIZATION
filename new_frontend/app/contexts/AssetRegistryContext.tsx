import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import algosdk from 'algosdk';
import { useAlgorand } from './AlgorandContext';
import { API_BASE, apiFetch } from '../config/api';

// ── Types ─────────────────────────────────────────────────────

export interface ASAMetadata {
  id: string;
  assetId?: number;       // Algorand ASA ID (on-chain)
  name: string;
  unitName: string;
  totalSupply: number;
  decimals: number;
  url?: string;
  metadataHash?: string;
  manager?: string;
  reserve?: string;
  freeze?: string;
  clawback?: string;
  defaultFrozen: boolean;
  creator: string;
  createdAt: Date;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  tokenizationStatus?: 'draft' | 'metadata_pinned' | 'asa_created' | 'fully_linked' | 'failed';
  verificationReason?: string;
  category?: string;
  description?: string;
  ipfsCid?: string;
  ipfsMetadataUri?: string;
  txId?: string;
  explorerUrl?: string;
}

export interface MarketplaceListing {
  id: string;
  assetId: number;
  assetName: string;
  seller: string;
  pricePerUnit: number;
  unitsAvailable: number;
  totalValue: number;
  listedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'create' | 'transfer' | 'opt-in' | 'opt-out' | 'purchase' | 'distribution';
  assetId?: number;
  assetName?: string;
  from: string;
  to?: string;
  amount?: number;
  timestamp: Date;
  txId?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface PrepareResult {
  assetRecordId: string;
  unsignedTxn: string;
  ipfs: { cid: string; uri: string; gatewayUrl: string };
  metadata: Record<string, any>;
  metadataHash: string;
}

export interface CreateASAParams {
  name: string;
  unitName: string;
  totalSupply: number;
  decimals: number;
  url?: string;
  category: string;
  description?: string;
  defaultFrozen?: boolean;
  manager?: string;
  reserve?: string;
  freeze?: string;
  clawback?: string;
  creator: string;
  pricePerUnit?: number;
  currency?: string;
  documentCids?: string[];
  properties?: Record<string, any>;
}

interface AssetRegistryContextType {
  assets: ASAMetadata[];
  listings: MarketplaceListing[];
  transactions: Transaction[];
  isLoading: boolean;
  createASA: (params: CreateASAParams) => Promise<string>;
  prepareTokenization: (params: CreateASAParams) => Promise<PrepareResult>;
  signAndSubmitASA: (unsignedTxnB64: string) => Promise<{ txId: string; asaId: number }>;
  confirmTokenization: (assetRecordId: string, txId: string, asaId: number) => Promise<void>;
  updateVerificationStatus: (assetId: string, status: 'approved' | 'rejected', reason?: string) => void;
  createListing: (listing: Omit<MarketplaceListing, 'id' | 'listedAt'>) => string;
  removeListing: (listingId: string) => void;
  executePurchase: (listingId: string, units: number, buyer: string) => Promise<string>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  getAssetById: (id: string) => ASAMetadata | undefined;
  getApprovedAssets: () => ASAMetadata[];
  refreshAssets: () => Promise<void>;
}

const AssetRegistryContext = createContext<AssetRegistryContextType | undefined>(undefined);

export const useAssetRegistry = () => {
  const context = useContext(AssetRegistryContext);
  if (!context) {
    throw new Error('useAssetRegistry must be used within AssetRegistryProvider');
  }
  return context;
};

export const AssetRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, connectedWallet, algodClient, accessToken } = useAlgorand();
  const [assets, setAssets] = useState<ASAMetadata[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Wallet SDK refs for transaction signing
  const peraRef = useRef<any>(null);
  const deflyRef = useRef<any>(null);

  useEffect(() => {
    import('@perawallet/connect').then(m => {
      peraRef.current = new m.PeraWalletConnect({ chainId: 416002 });
    });
    import('@blockshake/defly-connect').then(m => {
      deflyRef.current = new m.DeflyWalletConnect({ chainId: 416002 });
    });
  }, []);

  // ── Refresh assets from backend ─────────────────────────────
  const refreshAssets = useCallback(async () => {
    if (!address) return;
    try {
      const res = await apiFetch(`${API_BASE}/tokenize/owner/${address}`);
      if (res.ok) {
        const data = await res.json();
        const list = (data.data || data || []).map((a: any) => ({
          id: a.id,
          assetId: a.asaId ? Number(a.asaId) : undefined,
          name: a.name,
          unitName: a.unitName,
          totalSupply: Number(a.totalSupply),
          decimals: a.decimals || 0,
          defaultFrozen: a.defaultFrozen || false,
          creator: address,
          createdAt: new Date(a.createdAt),
          verificationStatus: a.verificationStatus || 'pending',
          tokenizationStatus: a.tokenizationStatus || 'draft',
          category: a.category,
          ipfsCid: a.ipfsCid,
        }));
        setAssets(list);
      }
    } catch (err) {
      console.warn('Failed to fetch assets from backend:', err);
    }
  }, [address]);

  useEffect(() => {
    if (address) refreshAssets();
  }, [address, refreshAssets]);

  // ── STEP 1: Prepare (IPFS pin + unsigned txn) ───────────────
  const prepareTokenization = useCallback(async (params: CreateASAParams): Promise<PrepareResult> => {
    const res = await apiFetch(`${API_BASE}/tokenize/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Prepare failed' }));
      throw new Error(err.message || err.error || 'Failed to prepare tokenization');
    }
    const result = await res.json();
    return result.data || result;
  }, [accessToken]);

  // ── STEP 2: Sign & Submit via wallet ────────────────────────
  const signAndSubmitASA = useCallback(async (unsignedTxnB64: string): Promise<{ txId: string; asaId: number }> => {
    if (!address || !connectedWallet) throw new Error('Wallet not connected');

    const txnBytes = Uint8Array.from(atob(unsignedTxnB64), c => c.charCodeAt(0));
    const txn = algosdk.decodeUnsignedTransaction(txnBytes);

    let signedTxnBytes: Uint8Array;
    if (connectedWallet === 'pera') {
      const wallet = peraRef.current;
      if (!wallet) throw new Error('Pera wallet not initialized');
      try { await wallet.reconnectSession(); } catch { await wallet.connect(); }
      const signedTxns = await wallet.signTransaction([[{ txn }]]);
      signedTxnBytes = signedTxns[0];
    } else if (connectedWallet === 'defly') {
      const wallet = deflyRef.current;
      if (!wallet) throw new Error('Defly wallet not initialized');
      try { await wallet.reconnectSession(); } catch { await wallet.connect(); }
      const signedTxns = await wallet.signTransaction([[{ txn }]]);
      signedTxnBytes = signedTxns[0];
    } else {
      throw new Error(`Unsupported wallet: ${connectedWallet}`);
    }

    const sendResult = await algodClient.sendRawTransaction(signedTxnBytes).do();
    const txId = sendResult.txid || sendResult.txId;
    const confirmed = await algosdk.waitForConfirmation(algodClient, txId, 4);
    const asaId = Number(confirmed.assetIndex || confirmed['asset-index'] || 0);
    if (!asaId) throw new Error('ASA creation confirmed but no asset index returned');
    return { txId, asaId };
  }, [address, connectedWallet, algodClient]);

  // ── STEP 3: Confirm with backend ────────────────────────────
  const confirmTokenization = useCallback(async (assetRecordId: string, txId: string, asaId: number) => {
    const res = await apiFetch(`${API_BASE}/tokenize/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ assetRecordId, txId, asaId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Confirm failed' }));
      throw new Error(err.message || err.error || 'Failed to confirm tokenization');
    }
    await refreshAssets();
  }, [accessToken, refreshAssets]);

  // ── FULL PIPELINE ───────────────────────────────────────────
  const createASA = useCallback(async (params: CreateASAParams): Promise<string> => {
    setIsLoading(true);
    try {
      const prepResult = await prepareTokenization(params);
      const { txId, asaId } = await signAndSubmitASA(prepResult.unsignedTxn);
      await confirmTokenization(prepResult.assetRecordId, txId, asaId);

      setTransactions(prev => [{
        id: `tx_${Date.now()}`,
        type: 'create' as const,
        assetId: asaId,
        assetName: params.name,
        from: params.creator,
        timestamp: new Date(),
        txId,
        status: 'confirmed' as const,
      }, ...prev]);

      return prepResult.assetRecordId;
    } finally {
      setIsLoading(false);
    }
  }, [prepareTokenization, signAndSubmitASA, confirmTokenization]);

  // ── Legacy methods (compatibility) ─────────────────────────

  const updateVerificationStatus = useCallback((assetId: string, status: 'approved' | 'rejected', reason?: string) => {
    setAssets(prev =>
      prev.map(asset =>
        asset.id === assetId
          ? { ...asset, verificationStatus: status, verificationReason: reason }
          : asset
      )
    );
  }, []);

  const createListing = useCallback((listing: Omit<MarketplaceListing, 'id' | 'listedAt'>): string => {
    const newListing: MarketplaceListing = {
      ...listing,
      id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      listedAt: new Date(),
    };
    setListings(prev => [...prev, newListing]);
    return newListing.id;
  }, []);

  const removeListing = useCallback((listingId: string) => {
    setListings(prev => prev.filter(l => l.id !== listingId));
  }, []);

  const executePurchase = useCallback(async (listingId: string, units: number, buyer: string): Promise<string> => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) throw new Error('Listing not found');

    if (units >= listing.unitsAvailable) {
      removeListing(listingId);
    } else {
      setListings(prev =>
        prev.map(l =>
          l.id === listingId
            ? { ...l, unitsAvailable: l.unitsAvailable - units }
            : l
        )
      );
    }

    const tx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'purchase',
      assetId: listing.assetId,
      assetName: listing.assetName,
      from: listing.seller,
      to: buyer,
      amount: units,
      timestamp: new Date(),
      txId: `TX${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      status: 'confirmed',
    };
    setTransactions(prev => [tx, ...prev]);
    return tx.txId!;
  }, [listings, removeListing]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setTransactions(prev => [newTx, ...prev]);
  }, []);

  const getAssetById = useCallback((id: string) => {
    return assets.find(asset => asset.id === id);
  }, [assets]);

  const getApprovedAssets = useCallback(() => {
    return assets.filter(asset => asset.verificationStatus === 'approved');
  }, [assets]);

  const value: AssetRegistryContextType = {
    assets,
    listings,
    transactions,
    isLoading,
    createASA,
    prepareTokenization,
    signAndSubmitASA,
    confirmTokenization,
    updateVerificationStatus,
    createListing,
    removeListing,
    executePurchase,
    addTransaction,
    getAssetById,
    getApprovedAssets,
    refreshAssets,
  };

  return <AssetRegistryContext.Provider value={value}>{children}</AssetRegistryContext.Provider>;
};
