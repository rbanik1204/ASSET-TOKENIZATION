'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectionStatus } from '@/components/wallet/ConnectionStatus';
import { MainLayout } from '@/components/layout/MainLayout';

type TransactionType = 'BUY' | 'SELL' | 'CLAIM' | 'TRANSFER';
type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

interface Transaction {
  id: string;
  type: TransactionType;
  assetName: string;
  assetToken: string;
  amount: string;
  value: string;
  fee: string;
  status: TransactionStatus;
  timestamp: string;
  txHash: string;
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  
  useEffect(() => {
    if (!address || !isConnected) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    
    // Fetch real transaction history from blockchain
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/history/${address}`);
        const data = await response.json();
        
        if (data.transactions && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        } else {
          setTransactions([]);
        }
      } catch (error) {
        console.error('Failed to fetch transaction history:', error);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, [address, isConnected]);
  
  const filteredTransactions = transactions.filter(tx => 
    filterType === 'ALL' || tx.type === filterType
  );
  
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      return parseFloat(b.value.replace(/[$,]/g, '')) - parseFloat(a.value.replace(/[$,]/g, ''));
    }
  });
  
  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'BUY':
        return (
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        );
      case 'SELL':
        return (
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        );
      case 'CLAIM':
        return (
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'TRANSFER':
        return (
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        );
    }
  };
  
  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">Success</span>;
      case 'PENDING':
        return <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">Pending</span>;
      case 'FAILED':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">Failed</span>;
    }
  };
  
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Asset', 'Amount', 'Value', 'Fee', 'Status', 'Tx Hash'];
    const rows = sortedTransactions.map(tx => [
      new Date(tx.timestamp).toLocaleString(),
      tx.type,
      tx.assetName,
      tx.amount,
      tx.value,
      tx.fee,
      tx.status,
      tx.txHash,
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transaction-history-${Date.now()}.csv`;
    link.click();
  };
  
  const totalValue = transactions
    .filter(tx => tx.status === 'SUCCESS')
    .reduce((sum, tx) => sum + parseFloat(tx.value.replace(/[$,]/g, '')), 0);
  
  const totalFees = transactions
    .filter(tx => tx.status === 'SUCCESS')
    .reduce((sum, tx) => sum + parseFloat(tx.fee.replace(/[$,]/g, '')), 0);
  
  return (
    <MainLayout>
      <ConnectionStatus requireConnection requireCorrectNetwork>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Transaction History
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                View all your asset transactions, claims, and transfers
              </p>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Transactions</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{transactions.length}</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Value</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">${totalValue.toLocaleString()}</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Fees Paid</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">${totalFees.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Filters & Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Filter by Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as TransactionType | 'ALL')}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ALL">All Types</option>
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                    <option value="CLAIM">Claim</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'value')}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="date">Date (Newest First)</option>
                    <option value="value">Value (Highest First)</option>
                  </select>
                </div>
                
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Export
                  </label>
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
            
            {/* Transactions List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : sortedTransactions.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <svg className="w-20 h-20 text-slate-300 dark:text-slate-700 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    No transactions yet
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Your on-chain activity will appear here once you buy, sell, claim, or transfer asset tokens.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {sortedTransactions.map((tx) => (
                    <div key={tx.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-start gap-4">
                        {getTypeIcon(tx.type)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {tx.type} - {tx.assetName}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {new Date(tx.timestamp).toLocaleString()}
                              </p>
                            </div>
                            {getStatusBadge(tx.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Amount</p>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{tx.amount} tokens</p>
                            </div>
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Value</p>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{tx.value}</p>
                            </div>
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Fee</p>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{tx.fee}</p>
                            </div>
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Tx Hash</p>
                              <a
                                href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {tx.txHash.slice(0, 10)}...
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ConnectionStatus>
    </MainLayout>
  );
}
