'use client';

import React, { useState } from 'react';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';

interface AuditExportProps {
  assetId: string;
  assetName: string;
  asaId: number;
  network?: 'testnet' | 'mainnet';
}

interface TransactionRecord {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  timestamp: number;
  confirmedRound: number;
  txType: string;
  note?: string;
}

export function AuditExport({ assetId, assetName, asaId, network = 'testnet' }: AuditExportProps) {
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<Date | null>(null);

  /**
   * Fetch all transactions for the asset
   */
  const fetchAllTransactions = async (): Promise<TransactionRecord[]> => {
    const allTransactions: TransactionRecord[] = [];
    let nextToken: string | undefined = undefined;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    try {
      do {
        const url: string = `/api/indexer/asset/${asaId}/transactions?network=${network}&limit=50${nextToken ? `&nextToken=${nextToken}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch transactions');
        }

        allTransactions.push(...data.transactions);
        nextToken = data.nextToken;
        iterations++;
      } while (nextToken && iterations < maxIterations);

      return allTransactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  };

  /**
   * Convert transactions to CSV
   */
  const transactionsToCSV = (transactions: TransactionRecord[]): string => {
    const headers = [
      'Transaction ID',
      'Date & Time',
      'Sender Address',
      'Receiver Address',
      'Amount (units)',
      'Transaction Type',
      'Confirmed Round',
      'Note',
      'Explorer URL',
    ];

    const rows = transactions.map((tx) => {
      const explorerBase = network === 'testnet' ? 'https://testnet.algoexplorer.io' : 'https://algoexplorer.io';
      const explorerUrl = `${explorerBase}/tx/${tx.id}`;
      const date = new Date(tx.timestamp * 1000).toISOString();

      return [
        tx.id,
        date,
        tx.sender,
        tx.receiver,
        tx.amount.toString(),
        tx.txType.toUpperCase(),
        tx.confirmedRound.toString(),
        tx.note || '',
        explorerUrl,
      ];
    });

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return csvContent;
  };

  /**
   * Download CSV file
   */
  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Handle export button click
   */
  const handleExport = async () => {
    try {
      setExporting(true);

      // Fetch all transactions
      const transactions = await fetchAllTransactions();

      if (transactions.length === 0) {
        alert('No transactions found for this asset.');
        return;
      }

      // Convert to CSV
      const csvContent = transactionsToCSV(transactions);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `${assetName.replace(/[^a-z0-9]/gi, '_')}_ASA${asaId}_audit_${timestamp}.csv`;

      // Download
      downloadCSV(csvContent, filename);

      // Update last export time
      setLastExport(new Date());

      // Success message
      alert(
        `✅ Audit Report Exported!\n\n` +
          `Transactions: ${transactions.length}\n` +
          `File: ${filename}\n\n` +
          `The CSV file has been downloaded to your computer.`
      );
    } catch (error: any) {
      console.error('Error exporting audit report:', error);
      alert(`❌ Export Failed\n\n${error.message || 'Unable to export audit report'}`);
    } finally {
      setExporting(false);
    }
  };

  /**
   * Export JSON format
   */
  const handleExportJSON = async () => {
    try {
      setExporting(true);

      const transactions = await fetchAllTransactions();

      if (transactions.length === 0) {
        alert('No transactions found for this asset.');
        return;
      }

      const jsonContent = JSON.stringify(
        {
          assetId,
          assetName,
          asaId,
          network,
          exportDate: new Date().toISOString(),
          transactionCount: transactions.length,
          transactions: transactions.map((tx) => ({
            ...tx,
            explorerUrl: `https://${network === 'testnet' ? 'testnet.' : ''}algoexplorer.io/tx/${tx.id}`,
            dateTime: new Date(tx.timestamp * 1000).toISOString(),
          })),
        },
        null,
        2
      );

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `${assetName.replace(/[^a-z0-9]/gi, '_')}_ASA${asaId}_audit_${timestamp}.json`;

      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setLastExport(new Date());

      alert(
        `✅ JSON Audit Report Exported!\n\n` +
          `Transactions: ${transactions.length}\n` +
          `File: ${filename}`
      );
    } catch (error: any) {
      console.error('Error exporting JSON:', error);
      alert(`❌ Export Failed\n\n${error.message || 'Unable to export JSON report'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold text-[#F5F7FA] mb-1">
              📊 Audit & Compliance
            </h3>
            <p className="text-sm text-[#7C8496]">
              Export complete transaction history for audit purposes
            </p>
          </div>

          {/* Asset Info */}
          <div className="bg-[#14161B] rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[#7C8496]">Asset</p>
                <p className="font-semibold text-[#F5F7FA]">{assetName}</p>
              </div>
              <div>
                <p className="text-xs text-[#7C8496]">ASA ID</p>
                <p className="font-semibold text-[#3B82F6]">{asaId}</p>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
            >
              {exporting ? 'Exporting...' : '📥 Export CSV Report'}
            </Button>

            <Button
              onClick={handleExportJSON}
              disabled={exporting}
              variant="secondary"
              className="w-full"
            >
              {exporting ? 'Exporting...' : '📄 Export JSON Report'}
            </Button>
          </div>

          {/* Last Export */}
          {lastExport && (
            <div className="text-xs text-[#7C8496] text-center pt-2 border-t border-[#1F232B]">
              Last exported: {lastExport.toLocaleString()}
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-500/10 rounded-lg p-3">
            <p className="text-xs text-[#3B82F6]">
              ℹ️ <strong>Export includes:</strong>
              <br />• All on-chain transactions
              <br />• Sender & receiver addresses
              <br />• Transfer amounts and timestamps
              <br />• AlgoExplorer links for verification
              <br />• Complete audit trail for compliance
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
