'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AssetCard } from '@/components/assets/AssetCard';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';

type MarketplaceAssetCard = {
  id: string;
  tokenAddress: string;
  name: string;
  location: string;
  assetType: string;
  verified: boolean;
  verificationSummary: string[];
  oracleStatus?: 'verified' | 'missing-feed' | 'stale-data' | 'reserve-deviation' | 'unknown';
  imageUrl: string | null;
  pricePerToken: { quote: string; amount: string; amountNumber: number | null };
  availableSupply: { amount: string; amountNumber: number | null };
  marketCap: { quote: string; amount: string; amountNumber: number | null };
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

export default function MarketplacePage() {
  const [assets, setAssets] = useState<MarketplaceAssetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'newest'>('newest');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [liquidOnly, setLiquidOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/marketplace/assets', { cache: 'no-store' });
        const json = (await res.json()) as MarketplaceResponse;
        if (cancelled) return;
        setAssets(Array.isArray(json?.assets) ? json.assets : []);
        setStale(Boolean(json?.stale));
        setUpdatedAt(typeof json?.updatedAt === 'string' ? json.updatedAt : null);
        setWarning(typeof json?.warning === 'string' ? json.warning : null);
        setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load Marketplace data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.tokenAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((asset) => asset.assetType === selectedType);
    }

    // Verified filter
    if (verifiedOnly) {
      filtered = filtered.filter((asset) => asset.verified);
    }

    // Liquid filter
    if (liquidOnly) {
      filtered = filtered.filter((asset) => (asset.availableSupply.amountNumber ?? 0) > 0);
    }

    // Price range filter (only when price numeric is available)
    const min = minPrice.trim() ? Number(minPrice) : NaN;
    const max = maxPrice.trim() ? Number(maxPrice) : NaN;
    if (Number.isFinite(min)) {
      filtered = filtered.filter((asset) => (asset.pricePerToken.amountNumber ?? -1) >= min);
    }
    if (Number.isFinite(max)) {
      filtered = filtered.filter((asset) => (asset.pricePerToken.amountNumber ?? Number.POSITIVE_INFINITY) <= max);
    }

    // Sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.pricePerToken.amountNumber ?? Number.POSITIVE_INFINITY) - (b.pricePerToken.amountNumber ?? Number.POSITIVE_INFINITY);
        case 'price-high':
          return (b.pricePerToken.amountNumber ?? -1) - (a.pricePerToken.amountNumber ?? -1);
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [assets, searchTerm, selectedType, verifiedOnly, liquidOnly, minPrice, maxPrice, sortBy]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Asset Marketplace</h1>
          <p className="text-lg text-[#B0B7C3]">
            Browse tokenized real-world assets with traceable data sources
          </p>
        </div>

        {stale && (warning || updatedAt) && (
          <div className="mb-6">
            <Alert
              type="warning"
              message={warning || `Showing last known data (as of ${updatedAt}).`}
            />
          </div>
        )}

        {loadError && (
          <div className="mb-6">
            <Alert type="error" message={loadError} />
          </div>
        )}

        {/* Filters */}
        <div className="surface rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Input
                type="text"
                placeholder="Search assets by name, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Asset Type */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2.5 surface rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#F5F7FA] border-[#1F232B]"
              >
                <option value="all" className="bg-[#14161B]">All Types</option>
                <option value="real-estate" className="bg-[#14161B]">Real Estate</option>
                <option value="equipment" className="bg-[#14161B]">Equipment</option>
                <option value="vehicle" className="bg-[#14161B]">Vehicles</option>
                <option value="art" className="bg-[#14161B]">Art</option>
                <option value="other" className="bg-[#14161B]">Other</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2.5 surface rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#F5F7FA] border-[#1F232B]"
              >
                <option value="newest" className="bg-[#14161B]">Newest First</option>
                <option value="price-low" className="bg-[#14161B]">Price: Low to High</option>
                <option value="price-high" className="bg-[#14161B]">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 text-[#3B82F6] rounded focus:ring-2 focus:ring-[#3B82F6]"
              />
              <span className="text-sm text-[#B0B7C3]">Verified Assets Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={liquidOnly}
                onChange={(e) => setLiquidOnly(e.target.checked)}
                className="w-4 h-4 text-[#3B82F6] rounded focus:ring-2 focus:ring-[#3B82F6]"
              />
              <span className="text-sm text-[#B0B7C3]">Availability &gt; 0</span>
            </label>

            <div className="flex items-center gap-2">
              <div className="w-32">
                <Input
                  type="number"
                  placeholder="Min price"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  placeholder="Max price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-[#B0B7C3]">
            Showing <span className="font-semibold text-[#3B82F6]">{filteredAssets.length}</span> assets
          </p>
        </div>

        {/* Loading State */}
        {loading && <LoadingSpinner />}

        {/* Empty State */}
        {!loading && filteredAssets.length === 0 && (
          <Alert
            type="info"
            message="No verified assets are publicly available yet. Assets appear only after the backend/on-chain verification pipeline is complete (admin approval, oracle verification, token deployed, AMM pool deployed with liquidity). Metadata alone can never publish an asset."
          />
        )}

        {/* Asset Grid */}
        {!loading && filteredAssets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
