'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/**
 * Standalone Chain Selector Component
 * Shows current chain and allows quick switching between Ethereum and Algorand demos
 */
export function ChainSelectorStandalone() {
  const [isOpen, setIsOpen] = useState(false);

  const chains = [
    {
      id: 'ethereum',
      name: 'Ethereum',
      icon: '⟠',
      description: 'Sepolia Testnet',
      href: '/marketplace',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'algorand',
      name: 'Algorand',
      icon: '🟣',
      description: 'Fast & Low Cost',
      href: '/algorand-demo',
      color: 'from-blue-600 to-purple-600',
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[#1A1D23] border border-[#1F232B] rounded-lg hover:bg-[#14161B] transition-colors text-sm"
      >
        <span className="text-lg">⛓️</span>
        <span className="font-medium text-[#B0B7C3]">Chain</span>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 left-0 bg-[#0F1115] border border-[#1F232B] rounded-lg shadow-xl p-2 min-w-[220px] z-50">
            <div className="text-xs text-[#6B7280] px-3 py-2 border-b border-[#1F232B] font-medium">
              Select Blockchain
            </div>
            {chains.map((chain) => (
              <Link
                key={chain.id}
                href={chain.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-3 hover:bg-[#1A1D23] rounded transition-colors group"
              >
                <span className="text-2xl">{chain.icon}</span>
                <div className="flex flex-col flex-1">
                  <span className="font-medium text-[#F5F7FA] group-hover:text-white">
                    {chain.name}
                  </span>
                  <span className="text-xs text-[#6B7280]">{chain.description}</span>
                </div>
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${chain.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
