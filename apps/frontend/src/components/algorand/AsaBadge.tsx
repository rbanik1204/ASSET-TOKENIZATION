'use client';

import React from 'react';
import Link from 'next/link';

interface AsaBadgeProps {
  asaId: number;
  network?: 'testnet' | 'mainnet';
  className?: string;
  showFull?: boolean;
}

/**
 * ASA Badge Component
 * Displays Algorand Standard Asset ID with link to AlgoExplorer
 */
export function AsaBadge({ asaId, network = 'testnet', className = '', showFull = false }: AsaBadgeProps) {
  const explorerUrl = `https://${network === 'testnet' ? 'testnet.' : ''}algoexplorer.io/asset/${asaId}`;

  return (
    <Link
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg hover:border-blue-500 transition-all group ${className}`}
    >
      {/* Algorand Logo */}
      <span className="text-lg">🟣</span>

      {/* ASA ID */}
      <div className="flex flex-col">
        <span className="text-[10px] text-[#6B7280] uppercase tracking-wide">
          {network === 'testnet' ? 'TestNet ASA' : 'ASA'}
        </span>
        <span className="text-sm font-mono font-semibold text-white group-hover:text-blue-400 transition-colors">
          {showFull ? asaId : `#${asaId}`}
        </span>
      </div>

      {/* External Link Icon */}
      <svg
        className="w-4 h-4 text-[#6B7280] group-hover:text-blue-400 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </Link>
  );
}

interface AsaStatusProps {
  asaId?: number;
  creating?: boolean;
  error?: string;
}

/**
 * ASA Status Indicator
 * Shows creation status or displays badge
 */
export function AsaStatus({ asaId, creating, error }: AsaStatusProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
        <span className="text-red-400">⚠️ ASA Error</span>
        <span className="text-[#6B7280] text-xs">{error}</span>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
        <span className="text-blue-400">Creating ASA...</span>
      </div>
    );
  }

  if (asaId) {
    return <AsaBadge asaId={asaId} />;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
      <span className="text-yellow-400">⏳ No ASA</span>
    </div>
  );
}

interface AsaInfoCardProps {
  asaId: number;
  assetName: string;
  unitName: string;
  totalSupply: number;
  decimals: number;
  manager?: string;
  freeze?: string;
  clawback?: string;
  network?: 'testnet' | 'mainnet';
}

/**
 * Detailed ASA Information Card
 */
export function AsaInfoCard({
  asaId,
  assetName,
  unitName,
  totalSupply,
  decimals,
  manager,
  freeze,
  clawback,
  network = 'testnet',
}: AsaInfoCardProps) {
  const explorerUrl = `https://${network === 'testnet' ? 'testnet.' : ''}algoexplorer.io/asset/${asaId}`;

  const infoItems = [
    { label: 'Total Supply', value: totalSupply.toLocaleString(), icon: '🪙' },
    { label: 'Decimals', value: decimals, icon: '📊' },
    { label: 'Unit Name', value: unitName, icon: '🏷️' },
  ];

  const addresses = [
    { label: 'Manager', value: manager, icon: '👤' },
    { label: 'Freeze', value: freeze, icon: '🔒' },
    { label: 'Clawback', value: clawback, icon: '↩️' },
  ];

  const formatAddress = (addr?: string) => {
    if (!addr) return 'Not set';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="bg-[#0F1115] border border-[#1F232B] rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{assetName}</h3>
          <p className="text-sm text-[#6B7280]">Algorand Standard Asset</p>
        </div>
        <AsaBadge asaId={asaId} network={network} showFull />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-4">
        {infoItems.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center gap-1 text-[#6B7280] text-xs">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <p className="text-white font-medium">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Addresses */}
      <div className="border-t border-[#1F232B] pt-4 space-y-2">
        <h4 className="text-sm font-medium text-[#B0B7C3]">Control Addresses</h4>
        {addresses.map((addr) => (
          <div key={addr.label} className="flex items-center justify-between text-sm">
            <span className="text-[#6B7280] flex items-center gap-1">
              <span>{addr.icon}</span>
              {addr.label}
            </span>
            <span className="text-white font-mono text-xs">
              {formatAddress(addr.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Explorer Link */}
      <Link
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-sm font-medium transition-all"
      >
        <span>View on AlgoExplorer</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </Link>
    </div>
  );
}

export default AsaBadge;
