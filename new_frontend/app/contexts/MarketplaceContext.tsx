import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import algosdk from 'algosdk';
import { useAlgorand } from './AlgorandContext';
import { API_BASE, apiFetch } from '../config/api';

// ── Types ─────────────────────────────────────────────────────

export type ListingStatus = 'active' | 'partial' | 'filled' | 'cancelled' | 'expired';

export interface Listing {
  id: string;
  assetId: string;
  asaId: number;
  assetName: string;
  unitName: string;
  category: string | null;
  sellerAddress: string;
  buyerAddress: string | null;
  pricePerUnit: number;
  originalQuantity: number;
  remainingQuantity: number;
  minPurchase: number;
  platformFeeBps: number;
  listingType: 'sell' | 'buy';
  description: string | null;
  status: ListingStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  listingId: string;
  asaId: number;
  buyerAddress: string;
  sellerAddress: string;
  units: number;
  pricePerUnit: number;
  totalAlgo: number;
  platformFee: number;
  sellerProceeds: number;
  groupTxId: string | null;
  confirmedRound: number | null;
  status: 'pending' | 'signed' | 'confirmed' | 'failed';
  network: string;
  createdAt: string;
}

export interface MarketplaceStats {
  totalListings: number;
  activeListings: number;
  totalTrades: number;
  totalVolumeMicro: number;
  totalVolumeAlgo: number;
  totalFeesMicro: number;
  uniqueSellers: number;
  uniqueBuyers: number;
}

export interface BuySummary {
  units: number;
  pricePerUnit: number;
  subtotal: number;
  platformFee: number;
  totalCost: number;
  sellerProceeds: number;
}

export interface PrepareBuyResult {
  tradeId: string;
  unsignedTxns: string[];
  buyerSignIndices: number[];
  summary: BuySummary;
}

interface CreateListingParams {
  assetId: string;
  asaId: number;
  assetName: string;
  unitName: string;
  sellerAddress: string;
  pricePerUnit: number;
  quantity: number;
  minPurchase?: number;
  category?: string;
  description?: string;
  expiresAt?: string;
}

interface MarketplaceContextType {
  listings: Listing[];
  stats: MarketplaceStats | null;
  recentTrades: Trade[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchListings: (filters?: Record<string, string>) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchRecentTrades: (limit?: number) => Promise<void>;
  createListing: (params: CreateListingParams) => Promise<Listing>;
  cancelListing: (listingId: string, sellerAddress: string) => Promise<void>;
  prepareBuy: (listingId: string, buyerAddress: string, units: number) => Promise<PrepareBuyResult>;
  confirmBuy: (tradeId: string, signedTxns: string[]) => Promise<{ trade: Trade; listing: Listing; explorerUrl: string }>;
  getTradeHistory: (address: string) => Promise<Trade[]>;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return ctx;
}

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken } = useAlgorand();

  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Helper: auth headers ─────────────────────────────────────
  const authHeaders = useCallback(
    (extra?: Record<string, string>): Record<string, string> => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...extra,
    }),
    [accessToken],
  );

  // ── FETCH LISTINGS ───────────────────────────────────────────
  const fetchListings = useCallback(
    async (filters?: Record<string, string>) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: '1', limit: '100', ...filters });
        const res = await apiFetch(`${API_BASE}/marketplace?${params}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch listings');
        const json = await res.json();
        const data = json.data?.data ?? json.data ?? json ?? [];
        setListings(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('fetchListings error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [authHeaders],
  );

  // ── FETCH STATS ──────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/marketplace/stats`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const json = await res.json();
      setStats(json.data ?? json);
    } catch (err: any) {
      console.error('fetchStats error:', err);
    }
  }, [authHeaders]);

  // ── FETCH RECENT TRADES ──────────────────────────────────────
  const fetchRecentTrades = useCallback(
    async (limit = 20) => {
      try {
        const res = await apiFetch(`${API_BASE}/marketplace/trades/recent?limit=${limit}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch trades');
        const json = await res.json();
        const data = json.data ?? json;
        setRecentTrades(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('fetchRecentTrades error:', err);
      }
    },
    [authHeaders],
  );

  // ── CREATE LISTING ───────────────────────────────────────────
  const createListing = useCallback(
    async (params: CreateListingParams): Promise<Listing> => {
      const res = await apiFetch(`${API_BASE}/marketplace/create`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Create listing failed' }));
        throw new Error(err.message || err.error || 'Failed to create listing');
      }
      const json = await res.json();
      const listing = json.data ?? json;
      // Refresh listings after creation
      fetchListings();
      return listing;
    },
    [authHeaders, fetchListings],
  );

  // ── CANCEL LISTING ───────────────────────────────────────────
  const cancelListing = useCallback(
    async (listingId: string, sellerAddress: string) => {
      const res = await apiFetch(`${API_BASE}/marketplace/${listingId}/cancel`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ sellerAddress }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Cancel failed' }));
        throw new Error(err.message || err.error || 'Failed to cancel listing');
      }
      // Refresh after cancel
      fetchListings();
    },
    [authHeaders, fetchListings],
  );

  // ── PREPARE BUY (Step 1: Get unsigned atomic swap txns) ──────
  const prepareBuy = useCallback(
    async (listingId: string, buyerAddress: string, units: number): Promise<PrepareBuyResult> => {
      const res = await apiFetch(`${API_BASE}/marketplace/buy/prepare`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ listingId, buyerAddress, units }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Prepare buy failed' }));
        throw new Error(err.message || err.error || 'Failed to prepare purchase');
      }
      const json = await res.json();
      return json.data ?? json;
    },
    [authHeaders],
  );

  // ── CONFIRM BUY (Step 2: Submit signed txns) ────────────────
  const confirmBuy = useCallback(
    async (tradeId: string, signedTxns: string[]): Promise<{ trade: Trade; listing: Listing; explorerUrl: string }> => {
      const res = await apiFetch(`${API_BASE}/marketplace/buy/confirm`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ tradeId, signedTxns }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Confirm buy failed' }));
        throw new Error(err.message || err.error || 'Transaction confirmation failed');
      }
      const json = await res.json();
      // Refresh listings & trades after successful buy
      fetchListings();
      fetchRecentTrades();
      return json.data ?? json;
    },
    [authHeaders, fetchListings, fetchRecentTrades],
  );

  // ── TRADE HISTORY ────────────────────────────────────────────
  const getTradeHistory = useCallback(
    async (address: string): Promise<Trade[]> => {
      const res = await apiFetch(`${API_BASE}/marketplace/trades/${address}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch trade history');
      const json = await res.json();
      const data = json.data ?? json;
      return Array.isArray(data) ? data : [];
    },
    [authHeaders],
  );

  // ── Auto-fetch on mount ──────────────────────────────────────
  const hasInitRef = useRef(false);
  useEffect(() => {
    if (!hasInitRef.current) {
      hasInitRef.current = true;
      fetchListings();
      fetchStats();
      fetchRecentTrades();
    }
  }, []);

  return (
    <MarketplaceContext.Provider
      value={{
        listings,
        stats,
        recentTrades,
        isLoading,
        error,
        fetchListings,
        fetchStats,
        fetchRecentTrades,
        createListing,
        cancelListing,
        prepareBuy,
        confirmBuy,
        getTradeHistory,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};
