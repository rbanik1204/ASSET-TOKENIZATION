'use client';

import { useAccount, useChainId } from 'wagmi';
import { ReactNode } from 'react';
import { sepolia } from 'wagmi/chains';

interface ConnectionStatusProps {
  children: ReactNode;
  requireConnection?: boolean;
  requireCorrectNetwork?: boolean;
}

export function ConnectionStatus({
  children,
  requireConnection = false,
  requireCorrectNetwork = false,
}: ConnectionStatusProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const isCorrectNetwork = chainId === sepolia.id;
  
  // Not connected state
  if (requireConnection && !isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center border-2 border-amber-500/20">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Wallet Not Connected</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please connect your wallet to access this page.
          </p>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-left mb-6">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">What you need:</p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>A Web3 wallet (MetaMask, WalletConnect, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Click "Connect Wallet" in the top right</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Approve the connection request</span>
              </li>
            </ul>
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all"
          >
            Go to Connect Wallet
          </button>
        </div>
      </div>
    );
  }
  
  // Wrong network state
  if (requireCorrectNetwork && isConnected && !isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center border-2 border-red-500/20">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Wrong Network</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            You're connected to the wrong network
          </p>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This platform requires <span className="font-semibold text-blue-600 dark:text-blue-400">Sepolia Testnet</span>
          </p>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-left mb-6">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">How to switch networks:</p>
            <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">1.</span>
                <span>Open your wallet (MetaMask, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">2.</span>
                <span>Click the network selector at the top</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">3.</span>
                <span>Select "Sepolia Test Network"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">4.</span>
                <span>Refresh this page</span>
              </li>
            </ol>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-left">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Need Sepolia ETH?</span> Get free testnet ETH from{' '}
              <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">
                sepoliafaucet.com
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
