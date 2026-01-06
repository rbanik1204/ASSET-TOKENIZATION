'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectionStatus } from '@/components/wallet/ConnectionStatus';
import { MainLayout } from '@/components/layout/MainLayout';

type PortfolioAsset = {
  id: string;
  name: string;
  token: string;
  balance: string;
  currentPrice: string;
  ammLiquidity: string;
  finalSalePrice: string | null;
  finalSaleAvailable: boolean;
};

export default function SellPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [sellMethod, setSellMethod] = useState<'AMM' | 'FINAL_SALE'>('AMM');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch real portfolio data
  useEffect(() => {
    if (!address) {
      setPortfolioAssets([]);
      setLoading(false);
      return;
    }
    
    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/portfolio/${address}`);
        const data = await response.json();
        
        if (data.holdings && Array.isArray(data.holdings)) {
          const assets: PortfolioAsset[] = data.holdings
            .filter((h: any) => parseFloat(h.balance || '0') > 0)
            .map((holding: any) => ({
              id: holding.assetId || holding.token,
              name: holding.name || 'Unknown Asset',
              token: holding.token,
              balance: holding.balance || '0',
              currentPrice: '$0.00', // TODO: Fetch from AMM or price feed
              ammLiquidity: '0 ETH', // TODO: Fetch from AMM pool
              finalSalePrice: null, // TODO: Fetch from FinalSale contract
              finalSaleAvailable: false, // TODO: Check FinalSale contract
            }));
          setPortfolioAssets(assets);
        } else {
          setPortfolioAssets([]);
        }
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
        setPortfolioAssets([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolio();
  }, [address]);
  
  const selectedAssetData = portfolioAssets.find(a => a.id === selectedAsset);
  
  const calculateAMMOutput = () => {
    if (!selectedAssetData || !amount) return '0';
    const price = parseFloat(selectedAssetData.currentPrice.replace('$', ''));
    const slippageMultiplier = 1 - (parseFloat(slippage) / 100);
    return (parseFloat(amount) * price * slippageMultiplier).toFixed(2);
  };
  
  const calculateFinalSaleOutput = () => {
    if (!selectedAssetData || !amount || !selectedAssetData.finalSalePrice) return '0';
    const price = parseFloat(selectedAssetData.finalSalePrice.replace('$', ''));
    return (parseFloat(amount) * price).toFixed(2);
  };
  
  const handleSell = async () => {
    if (!selectedAsset || !amount) return;
    
    setIsProcessing(true);
    
    try {
      // In production: execute actual blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Successfully sold ${amount} tokens via ${sellMethod === 'AMM' ? 'AMM Pool' : 'Final Sale'}!`);
      router.push('/portfolio');
    } catch (error) {
      console.error('Sell error:', error);
      alert('Failed to sell tokens. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <MainLayout>
      <ConnectionStatus requireConnection requireCorrectNetwork>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Sell Assets
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Exit your position through AMM swaps or final sale redemption
              </p>
            </div>
            
            {/* Exit Method Selector */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Choose Exit Method</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setSellMethod('AMM')}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    sellMethod === 'AMM'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    {sellMethod === 'AMM' && (
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">Selected</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">AMM Pool Swap</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Instant exit at market price with slippage protection
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded font-medium">⚡ Instant</span>
                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-medium">~1-3% Slippage</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setSellMethod('FINAL_SALE')}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    sellMethod === 'FINAL_SALE'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-green-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {sellMethod === 'FINAL_SALE' && (
                      <span className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded">Selected</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Final Sale Redemption</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Redeem at fixed exit price (if asset liquidated)
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded font-medium">Fixed Price</span>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded font-medium">No Slippage</span>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Sell Form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                {sellMethod === 'AMM' ? 'Swap Tokens for ETH' : 'Redeem Tokens'}
              </h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : portfolioAssets.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <svg className="w-20 h-20 text-slate-300 dark:text-slate-700 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    No assets to sell
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
                    You don't have any asset tokens in your portfolio yet. Purchase tokens from the marketplace to get started.
                  </p>
                  <button
                    onClick={() => router.push('/marketplace')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Browse Marketplace
                  </button>
                </div>
              ) : (
              <div className="space-y-6">
                {/* Asset Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Asset
                  </label>
                  <select
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose an asset...</option>
                    {portfolioAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} - Balance: {asset.balance} tokens
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedAssetData && (
                  <>
                    {/* Asset Info Card */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Your Balance:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAssetData.balance} tokens</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Current Price:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAssetData.currentPrice}</span>
                      </div>
                      {sellMethod === 'AMM' && (
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">AMM Liquidity:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedAssetData.ammLiquidity}</span>
                        </div>
                      )}
                      {sellMethod === 'FINAL_SALE' && (
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Redemption Price:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {selectedAssetData.finalSaleAvailable ? selectedAssetData.finalSalePrice : 'Not Available'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Amount Input */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Amount to Sell
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          max={selectedAssetData.balance}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => setAmount(selectedAssetData.balance)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                    
                    {/* Slippage (AMM only) */}
                    {sellMethod === 'AMM' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Slippage Tolerance: {slippage}%
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={slippage}
                          onChange={(e) => setSlippage(e.target.value)}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span>0.1%</span>
                          <span>5%</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Estimated Output */}
                    {amount && (
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">You will receive:</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                          ${sellMethod === 'AMM' ? calculateAMMOutput() : calculateFinalSaleOutput()}
                        </p>
                        {sellMethod === 'AMM' && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Minimum received after {slippage}% slippage: ${(parseFloat(calculateAMMOutput()) * 0.99).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Warning for Final Sale */}
                    {sellMethod === 'FINAL_SALE' && !selectedAssetData.finalSaleAvailable && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex gap-3">
                          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="text-sm text-amber-800 dark:text-amber-300">
                            <p className="font-semibold mb-1">Final Sale Not Available</p>
                            <p>This asset has not been liquidated yet. Use AMM pool to sell instead.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Button */}
                    <button
                      onClick={handleSell}
                      disabled={
                        !amount || 
                        parseFloat(amount) <= 0 || 
                        parseFloat(amount) > parseFloat(selectedAssetData.balance) ||
                        isProcessing ||
                        (sellMethod === 'FINAL_SALE' && !selectedAssetData.finalSaleAvailable)
                      }
                      className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          Sell {amount || '0'} Tokens
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
              )}
            </div>
            
            {/* Info Section */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Exit Methods Explained</h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span><strong>AMM Pool:</strong> Instant exit at current market price. Best for active trading and liquid assets.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span><strong>Final Sale:</strong> Available when asset is sold/liquidated. Redeem at predetermined exit price with no slippage.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span><strong>Fees:</strong> AMM charges 1% swap fee. Final sale may have small gas fees only.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </ConnectionStatus>
    </MainLayout>
  );
}
