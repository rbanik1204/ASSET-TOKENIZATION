import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ASAMetadata {
  id: string;
  assetId?: number;
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
  verificationReason?: string;
  category?: string;
  description?: string;
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

interface AssetRegistryContextType {
  assets: ASAMetadata[];
  listings: MarketplaceListing[];
  transactions: Transaction[];
  createASA: (metadata: Omit<ASAMetadata, 'id' | 'createdAt' | 'verificationStatus'>) => Promise<string>;
  updateVerificationStatus: (assetId: string, status: 'approved' | 'rejected', reason?: string) => void;
  createListing: (listing: Omit<MarketplaceListing, 'id' | 'listedAt'>) => string;
  removeListing: (listingId: string) => void;
  executePurchase: (listingId: string, units: number, buyer: string) => Promise<string>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  getAssetById: (id: string) => ASAMetadata | undefined;
  getApprovedAssets: () => ASAMetadata[];
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
  const [assets, setAssets] = useState<ASAMetadata[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const createASA = useCallback(async (metadata: Omit<ASAMetadata, 'id' | 'createdAt' | 'verificationStatus'>): Promise<string> => {
    const newAsset: ASAMetadata = {
      ...metadata,
      id: `asa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      verificationStatus: 'pending',
      assetId: Math.floor(Math.random() * 1000000) + 100000, // Simulated asset ID
    };

    setAssets(prev => [...prev, newAsset]);

    // Add transaction record
    const tx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'create',
      assetId: newAsset.assetId,
      assetName: newAsset.name,
      from: metadata.creator,
      timestamp: new Date(),
      txId: `TX${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      status: 'confirmed',
    };
    setTransactions(prev => [tx, ...prev]);

    return newAsset.id;
  }, []);

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

    // Update listing or remove if fully purchased
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

    // Add transaction
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
    createASA,
    updateVerificationStatus,
    createListing,
    removeListing,
    executePurchase,
    addTransaction,
    getAssetById,
    getApprovedAssets,
  };

  return <AssetRegistryContext.Provider value={value}>{children}</AssetRegistryContext.Provider>;
};
