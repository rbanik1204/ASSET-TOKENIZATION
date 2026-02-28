'use client';

import React, { useState } from 'react';
import { Card, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AsaBadge } from '../algorand/AsaBadge';
import { BuyFractionModal } from '../algorand/BuyFractionModal';

interface AssetCardProps {
  asset: {
    id: string;
    name: string;
    location: string;
    assetType: string;
    verified: boolean;
    verificationSummary: string[];
    oracleStatus?: 'verified' | 'missing-feed' | 'stale-data' | 'reserve-deviation' | 'unknown';
    imageUrl: string | null;
    pricePerToken: { quote: string; amount: string };
    availableSupply: { amount: string };
    marketCap: { quote: string; amount: string };
    asaId?: number;
    asaNetwork?: 'testnet' | 'mainnet';
  };
}

export function AssetCard({ asset }: AssetCardProps) {
  const [showBuyModal, setShowBuyModal] = useState(false);
  
  const verifiedTitle = asset.verificationSummary?.length
    ? asset.verificationSummary.join('\n')
    : 'Verified asset';

  const getOracleStatusBadge = () => {
    if (!asset.oracleStatus || asset.oracleStatus === 'verified') return null;
    
    const statusConfig = {
      'missing-feed': { text: '⚠ No Oracle Feed', color: 'bg-amber-500/10 text-amber-500', title: 'No oracle feed configured for this asset' },
      'stale-data': { text: '⚠ Stale Data', color: 'bg-orange-500/10 text-orange-500', title: 'Oracle data is outdated (>1 hour old)' },
      'reserve-deviation': { text: '⚠ Reserve Mismatch', color: 'bg-red-500/10 text-red-500', title: 'Reserves do not match supply within acceptable range' },
      'unknown': { text: '? Unknown', color: 'bg-gray-500/10 text-gray-500', title: 'Unable to verify oracle status' },
    };

    const config = statusConfig[asset.oracleStatus];
    if (!config) return null;

    return (
      <div className={`absolute bottom-3 left-3 px-2 py-1 rounded text-xs font-medium ${config.color}`} title={config.title}>
        {config.text}
      </div>
    );
  };

  return (
    <>
      <div onClick={(e) => {
        // Only navigate if not clicking the buy button
        if (!(e.target as HTMLElement).closest('button')) {
          window.location.href = `/assets/${asset.id}`;
        }
      }} style={{cursor: 'pointer'}}>
        <Card hover className="overflow-hidden group">
          {/* Asset Image */}
          <div className="relative h-48 bg-[#14161B]">
            {asset.imageUrl ? (
              <img
                src={asset.imageUrl}
                alt={asset.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#7C8496]">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
          
          {/* Verification Badge */}
          <div className="absolute top-3 right-3">
            {asset.verified && (
              <Badge variant="success" size="sm" className="cursor-help" >
                <span title={verifiedTitle} aria-label={verifiedTitle}>
                ✓ Verified
                </span>
              </Badge>
            )}
          </div>

          {/* Oracle Status Badge */}
          {getOracleStatusBadge()}
        </div>

        <CardBody className="space-y-3">
          {/* Asset Name & Location */}
          <div>
            <h3 className="text-lg font-semibold text-[#F5F7FA] mb-1">{asset.name}</h3>
            <p className="text-sm text-[#7C8496] flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {asset.location}
            </p>
          </div>

          {/* Asset Type */}
          <div>
            <Badge variant="info" size="sm">
              {asset.assetType.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Price & Supply */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1F232B]">
            <div>
              <p className="text-xs text-[#7C8496]">Price per Token</p>
              <p className="text-lg font-semibold text-[#3B82F6]">
                {asset.pricePerToken.amount} {asset.pricePerToken.quote}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#7C8496]">Available</p>
              <p className="text-lg font-semibold text-[#F5F7FA]">
                {asset.availableSupply.amount}
              </p>
            </div>
          </div>

          {/* Market Cap */}
          <div className="pt-2 border-t border-[#1F232B]">
            <p className="text-xs text-[#7C8496]">Market Cap</p>
            <p className="text-xl font-bold text-[#3B82F6]">
              {asset.marketCap.amount} {asset.marketCap.quote}
            </p>
          </div>

          {/* Algorand ASA Badge */}
          {asset.asaId && (
            <div className="pt-3 border-t border-[#1F232B]">
              <AsaBadge 
                asaId={asset.asaId} 
                network={asset.asaNetwork || 'testnet'}
              />
            </div>
          )}

          {/* Buy Button */}
          {asset.asaId && (
            <div className="pt-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowBuyModal(true);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-medium transition-all"
              >
                Buy Fraction
              </button>
            </div>
          )}
        </CardBody>
        </Card>
      </div>

      {/* Buy Fraction Modal */}
      {showBuyModal && asset.asaId && (
        <BuyFractionModal
          asset={{
            id: asset.id,
            name: asset.name,
            asaId: asset.asaId,
            pricePerUnit: parseFloat(asset.pricePerToken.amount),
            availableSupply: parseInt(asset.availableSupply.amount),
            asaNetwork: asset.asaNetwork
          }}
          isOpen={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          onSuccess={() => {
            // Reload asset data
            console.log('Purchase successful, reloading...');
          }}
        />
      )}
    </>
  );
}
