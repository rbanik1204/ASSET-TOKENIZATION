'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ConnectionStatus } from '@/components/wallet/ConnectionStatus';
import { MainLayout } from '@/components/layout/MainLayout';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { getContractsForChain, ABIS } from '@/config/contracts';
import { formatUnits } from 'viem';

type AssetStatus = 'ACTIVE' | 'SOLD' | 'WOUND_DOWN';

interface RegistryAsset {
  token: `0x${string}`;
  owner: `0x${string}`;
  metadataURI: string;
  active: boolean;
}

interface AssetMetadata {
  name?: string;
  assetDetails?: {
    name?: string;
  };
}

interface WindDownAsset {
  id: number;
  name: string;
  token: string;
  status: AssetStatus;
  soldDate?: string;
  salePrice?: string;
  totalTokens: string;
  totalSupply: bigint;
  distributedAmount?: string;
  pendingClaims?: string;
  active: boolean;
}

export default function WindDownPage() {
  const router = useRouter();
  const { chainId } = useAccount();
  const contracts = getContractsForChain(chainId || 11155111);
  
  const [assets, setAssets] = useState<WindDownAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get asset count from registry
  const { data: assetCount } = useReadContract({
    address: contracts.ASSET_REGISTRY as `0x${string}`,
    abi: ABIS.ASSET_REGISTRY,
    functionName: 'assetCount',
    query: { enabled: Boolean(contracts.ASSET_REGISTRY) },
  });

  const { writeContract, data: txHash, isPending: isWritePending } = useWriteContract();
  
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch all assets from blockchain
  useEffect(() => {
    const fetchAssets = async () => {
      if (!assetCount || !contracts.ASSET_REGISTRY) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const fetchedAssets: WindDownAsset[] = [];

      try {
        for (let i = 1; i <= Number(assetCount); i++) {
          try {
            // Fetch asset from registry
            const response = await fetch(
              `https://rpc.sepolia.org`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'eth_call',
                  params: [
                    {
                      to: contracts.ASSET_REGISTRY,
                      data: `0x5a0c6ed5${i.toString(16).padStart(64, '0')}`, // getAsset(uint256)
                    },
                    'latest',
                  ],
                  id: 1,
                }),
              }
            );

            const result = await response.json();
            if (result.error || !result.result || result.result === '0x') continue;

            // Decode the result (simplified - in production use proper ABI decoder)
            const data = result.result;
            
            // Extract token address (first 32 bytes after 0x + offset)
            const tokenAddress = `0x${data.slice(130, 170)}` as `0x${string}`;
            
            // Check if active (last byte)
            const isActive = data.slice(-1) === '1' || data.slice(-2) === '01';

            // Fetch token details
            const tokenName = await fetchTokenName(tokenAddress);
            const tokenSupply = await fetchTokenSupply(tokenAddress);

            // Determine status based on active flag
            const status: AssetStatus = !isActive ? 'WOUND_DOWN' : 'ACTIVE';

            fetchedAssets.push({
              id: i,
              name: tokenName || `Asset #${i}`,
              token: tokenAddress,
              status,
              totalTokens: formatUnits(tokenSupply, 18),
              totalSupply: tokenSupply,
              active: isActive,
            });
          } catch (err) {
            console.error(`Error fetching asset ${i}:`, err);
          }
        }

        setAssets(fetchedAssets);
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, [assetCount, contracts.ASSET_REGISTRY]);

  // Fetch token name
  const fetchTokenName = async (tokenAddress: `0x${string}`): Promise<string> => {
    try {
      const response = await fetch(`https://rpc.sepolia.org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: tokenAddress,
              data: '0x06fdde03', // name()
            },
            'latest',
          ],
          id: 1,
        }),
      });

      const result = await response.json();
      if (result.result && result.result !== '0x') {
        // Decode string from hex
        const hex = result.result.slice(2);
        const decoded = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '').trim();
        return decoded || 'Unknown Asset';
      }
    } catch (err) {
      console.error('Error fetching token name:', err);
    }
    return 'Unknown Asset';
  };

  // Fetch token supply
  const fetchTokenSupply = async (tokenAddress: `0x${string}`): Promise<bigint> => {
    try {
      const response = await fetch(`https://rpc.sepolia.org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: tokenAddress,
              data: '0x18160ddd', // totalSupply()
            },
            'latest',
          ],
          id: 1,
        }),
      });

      const result = await response.json();
      if (result.result && result.result !== '0x') {
        return BigInt(result.result);
      }
    } catch (err) {
      console.error('Error fetching token supply:', err);
    }
    return 0n;
  };

  // Refresh after transaction success
  useEffect(() => {
    if (isTxSuccess && selectedAsset) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === selectedAsset
            ? { ...a, status: 'WOUND_DOWN' as AssetStatus, active: false }
            : a
        )
      );
      setSelectedAsset(null);
      setIsProcessing(false);
    }
  }, [isTxSuccess, selectedAsset]);
  
  const handleWindDown = async (assetId: number) => {
    if (!confirm('Are you sure you want to wind down this asset? This action will deactivate the asset in the registry.')) {
      return;
    }
    
    setIsProcessing(true);
    setSelectedAsset(assetId);
    
    try {
      writeContract({
        address: contracts.ASSET_REGISTRY as `0x${string}`,
        abi: ABIS.ASSET_REGISTRY,
        functionName: 'deactivateAsset',
        args: [BigInt(assetId)],
      });
    } catch (error) {
      console.error('Wind down error:', error);
      alert('Failed to wind down asset. Please try again.');
      setIsProcessing(false);
      setSelectedAsset(null);
    }
  };
  
  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-semibold">Active</span>;
      case 'SOLD':
        return <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-semibold">Sold - Pending Wind Down</span>;
      case 'WOUND_DOWN':
        return <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-semibold">Wound Down</span>;
    }
  };
  
  return (
    <MainLayout>
      <ConnectionStatus requireConnection requireCorrectNetwork>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Admin
              </button>
              
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Asset Wind-Down Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Manage asset lifecycle completion: mark as sold, freeze tokens, and distribute final proceeds
              </p>
            </div>
            
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-900 dark:text-blue-300">
                  <p className="font-semibold mb-2">Wind-Down Process (RWA-Specific)</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Real-world asset is sold (e.g., property transaction completes)</li>
                    <li>Admin marks asset as "SOLD" and records final sale price</li>
                    <li>Final distribution amount calculated (sale price - fees - taxes)</li>
                    <li>Asset status changed to "WOUND_DOWN" - tokens are frozen</li>
                    <li>Token holders claim their pro-rata share of final proceeds</li>
                    <li>Asset removed from active marketplace (preserved in historical records)</li>
                  </ol>
                </div>
              </div>
            </div>
            
            {/* Assets Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-slate-600 dark:text-slate-400">Loading assets from blockchain...</p>
                </div>
              </div>
            ) : assets.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
                <svg className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Assets Found</p>
                <p className="text-slate-600 dark:text-slate-400">No registered assets found in the registry.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                          {asset.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                          {asset.token}
                        </p>
                      </div>
                      {getStatusBadge(asset.status)}
                    </div>
                    
                    {/* Asset Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Tokens</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {Number(asset.totalTokens).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      {asset.soldDate && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Sale Date</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {new Date(asset.soldDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      
                      {asset.salePrice && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Sale Price</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{asset.salePrice}</p>
                        </div>
                      )}
                      
                      {asset.distributedAmount && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Distributed</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{asset.distributedAmount}</p>
                        </div>
                      )}
                      
                      {asset.pendingClaims && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Pending Claims</p>
                          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{asset.pendingClaims}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Status-Specific Actions */}
                    {asset.status === 'ACTIVE' && asset.active && (
                      <div className="space-y-4">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                          <div className="flex gap-3">
                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="text-sm text-amber-900 dark:text-amber-300">
                              <p className="font-semibold mb-1">Active Asset</p>
                              <p>This asset is currently active. Deactivate it to wind down and remove from marketplace.</p>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleWindDown(asset.id)}
                          disabled={isProcessing || isWritePending || isTxLoading}
                          className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                          {(isProcessing || isWritePending || isTxLoading) && selectedAsset === asset.id ? (
                            <>
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              {isTxLoading ? 'Confirming...' : 'Processing...'}
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Deactivate Asset (Wind-Down)
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                    {(asset.status === 'WOUND_DOWN' || !asset.active) && (
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                        <div className="flex gap-3 mb-4">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-sm text-slate-700 dark:text-slate-300">
                            <p className="font-semibold mb-1">Asset Deactivated</p>
                            <p>This asset has been deactivated and removed from the marketplace. It is now in historical records only.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            )}
            
            {/* Summary Stats */}
            {!isLoading && assets.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
                <p className="text-green-100 text-sm mb-1">Active Assets</p>
                <p className="text-4xl font-bold">{assets.filter(a => a.active).length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl shadow-lg p-6 text-white">
                <p className="text-slate-100 text-sm mb-1">Deactivated Assets</p>
                <p className="text-4xl font-bold">{assets.filter(a => !a.active).length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <p className="text-blue-100 text-sm mb-1">Total Assets</p>
                <p className="text-4xl font-bold">{assets.length}</p>
              </div>
            </div>
            )}
          </div>
        </div>
      </ConnectionStatus>
    </MainLayout>
  );
}
