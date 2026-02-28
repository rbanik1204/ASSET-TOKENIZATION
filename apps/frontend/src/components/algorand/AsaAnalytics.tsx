'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Badge } from '../ui/Badge';

interface AsaAnalyticsProps {
  asaId: number;
  network?: 'testnet' | 'mainnet';
}

interface AssetInfo {
  asaId: number;
  totalSupply: number;
  circulatingSupply: number;
  holderCount: number;
  verified: boolean;
  reserves?: number;
}

export function AsaAnalytics({ asaId, network = 'testnet' }: AsaAnalyticsProps) {
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string>('');

  useEffect(() => {
    async function fetchAssetInfo() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/indexer/asset/${asaId}?network=${network}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch asset info');
        }

        setAssetInfo(data.asset);
        setExplorerUrl(data.explorerUrl);
      } catch (err: any) {
        console.error('Error fetching ASA analytics:', err);
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    if (asaId) {
      fetchAssetInfo();
    }
  }, [asaId, network]);

  if (loading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <div className="text-red-400 text-sm">⚠️ {error}</div>
        </CardBody>
      </Card>
    );
  }

  if (!assetInfo) {
    return null;
  }

  const circulationPercentage = assetInfo.totalSupply > 0
    ? ((assetInfo.circulatingSupply / assetInfo.totalSupply) * 100).toFixed(2)
    : '0';

  return (
    <Card>
      <CardBody>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#F5F7FA]">
              🟣 On-Chain Analytics
            </h3>
            <Badge variant="info" size="sm">
              {network === 'testnet' ? 'TestNet' : 'MainNet'}
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Supply */}
            <div className="bg-[#14161B] rounded-lg p-3">
              <p className="text-xs text-[#7C8496] mb-1">Total Supply</p>
              <p className="text-xl font-bold text-[#F5F7FA]">
                {assetInfo.totalSupply.toLocaleString()}
              </p>
            </div>

            {/* Circulating Supply */}
            <div className="bg-[#14161B] rounded-lg p-3">
              <p className="text-xs text-[#7C8496] mb-1">Circulating</p>
              <p className="text-xl font-bold text-[#3B82F6]">
                {assetInfo.circulatingSupply.toLocaleString()}
              </p>
              <p className="text-xs text-[#7C8496] mt-1">
                {circulationPercentage}% in circulation
              </p>
            </div>

            {/* Holder Count */}
            <div className="bg-[#14161B] rounded-lg p-3">
              <p className="text-xs text-[#7C8496] mb-1">Holders</p>
              <p className="text-xl font-bold text-[#10B981]">
                {assetInfo.holderCount.toLocaleString()}
              </p>
            </div>

            {/* Reserves */}
            {assetInfo.reserves !== undefined && (
              <div className="bg-[#14161B] rounded-lg p-3">
                <p className="text-xs text-[#7C8496] mb-1">Reserves</p>
                <p className="text-xl font-bold text-[#F59E0B]">
                  {assetInfo.reserves.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Explorer Link */}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2 bg-[#14161B] hover:bg-[#1F232B] rounded-lg text-sm text-[#3B82F6] transition-colors"
          >
            View on AlgoExplorer →
          </a>
        </div>
      </CardBody>
    </Card>
  );
}
