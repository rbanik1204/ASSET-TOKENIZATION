'use client';

import React, { useState } from 'react';
import { useAlgorandWallet } from '@/context/AlgorandWalletContext';
import { getExplorerUrl, getCurrentAlgorandNetwork, TESTNET_FAUCET_URL } from '@/config/algorand';

export default function AlgorandWalletButton() {
  const {
    isConnected,
    address,
    balance,
    network,
    connectWallet,
    disconnectWallet,
  } = useAlgorandWallet();

  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async (walletType: 'pera' | 'defly') => {
    try {
      setIsLoading(true);
      await connectWallet(walletType);
      setShowWalletMenu(false);
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setShowAccountMenu(false);
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: number | null) => {
    if (bal === null) return '0';
    // Convert to number in case it's BigInt
    const balNum = typeof bal === 'bigint' ? Number(bal) : bal;
    return (balNum / 1_000_000).toFixed(2);
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      alert('Address copied!');
    }
  };

  const openExplorer = () => {
    if (address) {
      const url = getExplorerUrl(getCurrentAlgorandNetwork(), 'address', address);
      window.open(url, '_blank');
    }
  };

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowWalletMenu(!showWalletMenu)}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connecting...' : 'Connect Algorand Wallet'}
        </button>

        {showWalletMenu && (
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] z-50">
            <div className="text-sm text-gray-500 px-3 py-2 border-b">
              Choose Wallet
            </div>
            
            <button
              onClick={() => handleConnect('pera')}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <span className="text-2xl">🟣</span>
              <span>Pera Wallet</span>
            </button>

            <button
              onClick={() => handleConnect('defly')}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <span className="text-2xl">🦋</span>
              <span>Defly Wallet</span>
            </button>

            {network === 'testnet' && (
              <>
                <div className="border-t my-2"></div>
                <a
                  href={TESTNET_FAUCET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 text-sm text-blue-600 hover:bg-gray-100 rounded"
                >
                  Get Testnet ALGO 💧
                </a>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowAccountMenu(!showAccountMenu)}
        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
      >
        <span className="text-xl">🟢</span>
        <div className="flex flex-col items-start">
          <span className="text-xs opacity-75">{network.toUpperCase()}</span>
          <span>{formatAddress(address!)}</span>
        </div>
      </button>

      {showAccountMenu && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[250px] z-50">
          <div className="px-3 py-2 border-b">
            <div className="text-sm text-gray-500">Account</div>
            <div className="font-mono text-sm mt-1 break-all">{address}</div>
          </div>

          <div className="px-3 py-2 border-b">
            <div className="text-sm text-gray-500">Balance</div>
            <div className="font-semibold text-lg mt-1">
              {formatBalance(balance)} ALGO
            </div>
          </div>

          <button
            onClick={copyAddress}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
          >
            📋 Copy Address
          </button>

          <button
            onClick={openExplorer}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
          >
            🔍 View on Explorer
          </button>

          {network === 'testnet' && (
            <a
              href={TESTNET_FAUCET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 hover:bg-gray-100 rounded text-sm"
            >
              💧 Get Testnet ALGO
            </a>
          )}

          <div className="border-t my-2"></div>

          <button
            onClick={handleDisconnect}
            className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 rounded text-sm"
          >
            🚪 Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
