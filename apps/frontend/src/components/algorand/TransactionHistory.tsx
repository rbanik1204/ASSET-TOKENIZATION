'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Transaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  timestamp: number;
  confirmedRound: number;
  txType: string;
  note?: string;
}

interface TransactionHistoryProps {
  asaId: number;
  network?: 'testnet' | 'mainnet';
  limit?: number;
  title?: string;
}

export function TransactionHistory({
  asaId,
  network = 'testnet',
  limit = 20,
  title = 'Recent Transactions',
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | undefined>();

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/indexer/asset/${asaId}/transactions?network=${network}&limit=${limit}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch transactions');
        }

        setTransactions(data.transactions);
        setNextToken(data.nextToken);
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(err.message || 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    }

    if (asaId) {
      fetchTransactions();
    }
  }, [asaId, network, limit]);

  const formatAddress = (address: string): string => {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTxTypeColor = (txType: string): string => {
    switch (txType) {
      case 'axfer':
        return 'text-blue-400';
      case 'pay':
        return 'text-green-400';
      case 'acfg':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

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

  if (transactions.length === 0) {
    return (
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold text-[#F5F7FA] mb-4">{title}</h3>
          <div className="text-center text-[#7C8496] py-8">
            No transactions found
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <h3 className="text-lg font-semibold text-[#F5F7FA] mb-4">{title}</h3>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-[#14161B] rounded-lg p-3 hover:bg-[#1F232B] transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono ${getTxTypeColor(tx.txType)}`}>
                    {tx.txType.toUpperCase()}
                  </span>
                  <span className="text-xs text-[#7C8496]">
                    Round #{tx.confirmedRound}
                  </span>
                </div>
                <span className="text-xs text-[#7C8496]">
                  {formatDate(tx.timestamp)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[#7C8496] mb-1">From</p>
                  <p className="font-mono text-[#F5F7FA]">{formatAddress(tx.sender)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#7C8496] mb-1">To</p>
                  <p className="font-mono text-[#F5F7FA]">{formatAddress(tx.receiver)}</p>
                </div>
              </div>

              {tx.amount > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-[#7C8496]">Amount</p>
                  <p className="text-lg font-semibold text-[#3B82F6]">
                    {tx.amount.toLocaleString()} units
                  </p>
                </div>
              )}

              {tx.note && (
                <div className="mt-2">
                  <p className="text-xs text-[#7C8496]">Note</p>
                  <p className="text-sm text-[#F5F7FA] italic">{tx.note}</p>
                </div>
              )}

              <a
                href={`https://${network === 'testnet' ? 'testnet.' : ''}algoexplorer.io/tx/${tx.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3B82F6] hover:underline mt-2 inline-block"
              >
                View on AlgoExplorer →
              </a>
            </div>
          ))}
        </div>

        {nextToken && (
          <button
            className="w-full mt-4 py-2 bg-[#14161B] hover:bg-[#1F232B] rounded-lg text-sm text-[#3B82F6] transition-colors"
            onClick={() => {
              // TODO: Implement pagination
              console.log('Load more with token:', nextToken);
            }}
          >
            Load More
          </button>
        )}
      </CardBody>
    </Card>
  );
}
