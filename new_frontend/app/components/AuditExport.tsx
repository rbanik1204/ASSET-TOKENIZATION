import React, { useState } from 'react';
import { Download, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  confirmed_round?: number;
  'round-time'?: number;
  sender: string;
  'payment-transaction'?: { amount: number; receiver: string };
  'asset-transfer-transaction'?: { amount: number; receiver: string; 'asset-id': number };
  'tx-type': string;
  note?: string;
}

interface AuditExportProps {
  asaId: number;
  assetName: string;
  network?: 'testnet' | 'mainnet';
  className?: string;
}

const escapeCSV = (v: string | number | undefined) => {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
};

export const AuditExport: React.FC<AuditExportProps> = ({
  asaId,
  assetName,
  network = 'testnet',
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const explorerBase = network === 'mainnet'
    ? 'https://algoexplorer.io'
    : 'https://testnet.algoexplorer.io';

  const fetchAll = async (): Promise<Transaction[]> => {
    const all: Transaction[] = [];
    let nextToken: string | undefined;
    let pages = 0;

    while (pages < 10) {
      const params = new URLSearchParams({ limit: '50' });
      if (nextToken) params.set('next', nextToken);

      const res = await fetch(`/api/indexer/asset/${asaId}/transactions?${params}`);
      const data = await res.json();

      const txns: Transaction[] = data.transactions || [];
      all.push(...txns);

      if (!data['next-token'] || txns.length < 50) break;
      nextToken = data['next-token'];
      pages++;
    }

    setCount(all.length);
    return all;
  };

  const txnToCSVRow = (tx: Transaction) => {
    const date = tx['round-time']
      ? new Date(tx['round-time'] * 1000).toISOString()
      : '';
    const receiver =
      tx['asset-transfer-transaction']?.receiver ||
      tx['payment-transaction']?.receiver ||
      '';
    const amount =
      tx['asset-transfer-transaction']?.amount ||
      tx['payment-transaction']?.amount ||
      0;
    const note = tx.note
      ? (() => { try { return atob(tx.note); } catch { return tx.note; } })()
      : '';

    return [
      escapeCSV(tx.id),
      escapeCSV(date),
      escapeCSV(tx.sender),
      escapeCSV(receiver),
      escapeCSV(amount),
      escapeCSV(tx['tx-type'].toUpperCase()),
      escapeCSV(tx.confirmed_round),
      escapeCSV(note),
      escapeCSV(`${explorerBase}/tx/${tx.id}`),
    ].join(',');
  };

  const handleCSV = async () => {
    setLoading(true);
    try {
      const txns = await fetchAll();
      const header = 'TX ID,Date/Time,Sender,Receiver,Amount,Type,Round,Note,Explorer URL';
      const rows = txns.map(txnToCSVRow);
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${assetName.replace(/[^a-z0-9]/gi, '_')}_audit_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${txns.length} transactions as CSV`);
    } catch (err: any) {
      toast.error('CSV export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJSON = async () => {
    setLoading(true);
    try {
      const txns = await fetchAll();
      const payload = {
        assetId: asaId,
        assetName,
        network,
        exportedAt: new Date().toISOString(),
        totalTransactions: txns.length,
        transactions: txns,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${assetName.replace(/[^a-z0-9]/gi, '_')}_audit_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${txns.length} transactions as JSON`);
    } catch (err: any) {
      toast.error('JSON export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase">
        <FileText className="w-4 h-4" />
        AUDIT EXPORT
        {count !== null && <span className="text-accent font-bold">({count} txns)</span>}
      </div>
      <button
        onClick={handleCSV}
        disabled={loading}
        className="flex items-center gap-1 px-3 py-1.5 border-2 border-foreground text-xs font-bold uppercase hover:border-accent transition-colors disabled:opacity-50"
      >
        {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        CSV
      </button>
      <button
        onClick={handleJSON}
        disabled={loading}
        className="flex items-center gap-1 px-3 py-1.5 border-2 border-foreground text-xs font-bold uppercase hover:border-accent transition-colors disabled:opacity-50"
      >
        {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        JSON
      </button>
    </div>
  );
};
