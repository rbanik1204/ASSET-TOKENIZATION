'use client';

import React, { useState } from 'react';

export type BlockchainType = 'ethereum' | 'algorand';

interface ChainSelectorProps {
  currentChain: BlockchainType;
  onChainChange: (chain: BlockchainType) => void;
}

export default function ChainSelector({ currentChain, onChainChange }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const chains = [
    {
      id: 'ethereum' as BlockchainType,
      name: 'Ethereum',
      icon: '⟠',
      description: 'Sepolia Testnet',
      color: 'blue',
    },
    {
      id: 'algorand' as BlockchainType,
      name: 'Algorand',
      icon: '△',
      description: 'Fast & Low Cost',
      color: 'purple',
    },
  ];

  const currentChainData = chains.find((c) => c.id === currentChain);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="text-2xl">{currentChainData?.icon}</span>
        <div className="flex flex-col items-start">
          <span className="font-medium text-sm">{currentChainData?.name}</span>
          <span className="text-xs text-gray-500">{currentChainData?.description}</span>
        </div>
        <span className="ml-2">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[250px] z-50">
          <div className="text-xs text-gray-500 px-3 py-2 border-b font-medium">
            SELECT BLOCKCHAIN
          </div>

          {chains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => {
                onChainChange(chain.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 transition-colors ${
                currentChain === chain.id
                  ? 'bg-blue-50 border border-blue-300'
                  : 'hover:bg-gray-100'
              }`}
            >
              <span className="text-3xl">{chain.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{chain.name}</div>
                <div className="text-xs text-gray-500">{chain.description}</div>
              </div>
              {currentChain === chain.id && (
                <span className="text-green-600 text-xl">✓</span>
              )}
            </button>
          ))}

          <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600">
            <strong>Multi-chain Platform:</strong> Switch between Ethereum and Algorand for different features and cost optimization.
          </div>
        </div>
      )}
    </div>
  );
}
