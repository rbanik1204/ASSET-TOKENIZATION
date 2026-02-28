import React, { useState, useRef, useCallback } from 'react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { Link } from 'react-router';
import {
  History as HistoryIcon, Search, Download, ExternalLink,
  Filter, Wallet, ArrowRight, Sparkles, ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageTransition } from '../components/motion/MotionSystem';

/* ─── Glass helpers ────────────────────────────────────────────────────── */
const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  borderRadius: '16px',
  background: 'rgba(7,17,13,0.60)',
  backdropFilter: 'blur(16px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
  border: '1px solid rgba(0,224,138,0.12)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
  ...extra,
});

/* ─── Stat card with tilt ──────────────────────────────────────────────── */
const StatCard: React.FC<{
  value: string | number;
  label: string;
  accent?: string;
  index: number;
}> = ({ value, label, accent = '#00e08a', index }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hov, setHov] = useState(false);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setTilt({ x: y * -3, y: x * 4 });
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 + index * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
      style={{ perspective: '700px' }}
    >
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y, y: hov ? -3 : 0, scale: hov ? 1.02 : 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          ...glass({
            padding: '18px 16px',
            border: hov ? `1px solid ${accent}44` : '1px solid rgba(0,224,138,0.10)',
            boxShadow: hov ? `0 12px 32px rgba(0,0,0,0.28), 0 0 14px ${accent}10` : '0 4px 18px rgba(0,0,0,0.16)',
            transition: 'border-color 0.3s, box-shadow 0.4s',
          }),
          transformStyle: 'preserve-3d' as const, cursor: 'default',
        }}
      >
        <div style={{ fontSize: '22px', fontWeight: 800, color: accent === '#00e08a' ? '#f0f6f3' : accent, letterSpacing: '-0.3px', marginBottom: '3px' }}>
          {value}
        </div>
        <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(240,246,243,0.35)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */

type TxType = 'all' | 'create' | 'transfer' | 'opt-in' | 'opt-out' | 'purchase' | 'distribution';

const getTxAccent = (type: string): string => {
  switch (type) {
    case 'purchase': case 'distribution': return '#00e08a';
    case 'create': return '#60a5fa';
    case 'transfer': return '#a78bfa';
    case 'opt-in': return '#facc15';
    case 'opt-out': return '#fb923c';
    default: return 'rgba(240,246,243,0.4)';
  }
};

export const History: React.FC = () => {
  const { address, network } = useAlgorand();
  const { transactions } = useAssetRegistry();
  const [filterType, setFilterType] = useState<TxType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'type'>('date');

  const explorerBase = network === 'mainnet'
    ? 'https://algoexplorer.io'
    : 'https://testnet.algoexplorer.io';

  const myTransactions = address
    ? transactions.filter(tx => tx.from === address || tx.to === address)
    : transactions;

  const filteredTransactions = myTransactions
    .filter(tx => {
      const matchesType = filterType === 'all' || tx.type === filterType;
      const matchesSearch =
        !searchTerm ||
        (tx.assetName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.txId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.to?.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    })
    .sort((a, b) => sortBy === 'date' ? b.timestamp.getTime() - a.timestamp.getTime() : a.type.localeCompare(b.type));

  const exportCSV = () => {
    const headers = ['ID', 'Type', 'Asset', 'From', 'To', 'Amount', 'Status', 'Date', 'TX ID', 'Explorer'];
    const rows = filteredTransactions.map(tx => [
      tx.id, tx.type.toUpperCase(), tx.assetName || 'N/A', tx.from,
      tx.to || 'N/A', tx.amount?.toString() || 'N/A', tx.status.toUpperCase(),
      tx.timestamp.toISOString(), tx.txId || 'N/A',
      tx.txId ? `${explorerBase}/tx/${tx.txId}` : 'N/A',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `algorand_transactions_${Date.now()}.csv`; a.click();
  };

  const exportJSON = () => {
    const data = { wallet: address, network, exportedAt: new Date().toISOString(), totalTransactions: filteredTransactions.length, transactions: filteredTransactions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `algorand_transactions_${Date.now()}.json`; a.click();
  };

  const txTypes: TxType[] = ['all', 'create', 'transfer', 'opt-in', 'opt-out', 'purchase', 'distribution'];

  /* ─── Wallet not connected ─────────────────────────────────────────── */
  if (!address) {
    return (
      <PageTransition>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            style={glass({ padding: '36px 28px', marginBottom: '24px', position: 'relative', overflow: 'hidden' })}
          >
            <div style={{ position: 'absolute', top: '-50px', right: '-30px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,224,138,0.06), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(240,246,243,0.2)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(240,246,243,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>History</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f0f6f3', letterSpacing: '-0.4px', marginBottom: '6px' }}>Transaction History</h1>
              <p style={{ fontSize: '13px', color: 'rgba(240,246,243,0.45)', maxWidth: '480px', lineHeight: 1.6 }}>
                Connect your Algorand wallet to view your complete on-chain activity log with audit export.
              </p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '12px', background: 'rgba(0,224,138,0.04)', border: '1px solid rgba(0,224,138,0.15)' }}
          >
            <Wallet style={{ width: '18px', height: '18px', color: '#00e08a', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'rgba(240,246,243,0.6)', lineHeight: 1.5 }}>
              <strong style={{ color: '#00e08a' }}>Wallet not connected</strong> — Connect your wallet via the navbar to view transaction history.
            </span>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  /* ─── Connected ────────────────────────────────────────────────────── */
  return (
    <PageTransition>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Hero Header ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={glass({ padding: '28px 26px 24px', marginBottom: '18px', position: 'relative', overflow: 'hidden' })}
        >
          <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,224,138,0.06), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e08a', boxShadow: '0 0 10px rgba(0,224,138,0.5)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#00e08a', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Transaction History</span>
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f0f6f3', letterSpacing: '-0.4px', marginBottom: '6px' }}>Activity Log</h1>
              <p style={{ fontSize: '13px', color: 'rgba(240,246,243,0.45)', maxWidth: '420px', lineHeight: 1.6 }}>Complete on-chain activity log with search, filters, and audit export.</p>
            </div>
            {/* Export buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={exportCSV}
                disabled={filteredTransactions.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(240,246,243,0.6)', fontSize: '11px', fontWeight: 700,
                  cursor: filteredTransactions.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: filteredTransactions.length === 0 ? 0.4 : 1,
                  transition: 'all 0.25s',
                }}
                onMouseEnter={(e) => { if (filteredTransactions.length) { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.25)'; e.currentTarget.style.color = '#00e08a'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(240,246,243,0.6)'; }}
              >
                <Download style={{ width: '12px', height: '12px' }} />
                CSV
              </button>
              <button
                onClick={exportJSON}
                disabled={filteredTransactions.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(240,246,243,0.6)', fontSize: '11px', fontWeight: 700,
                  cursor: filteredTransactions.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: filteredTransactions.length === 0 ? 0.4 : 1,
                  transition: 'all 0.25s',
                }}
                onMouseEnter={(e) => { if (filteredTransactions.length) { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.25)'; e.currentTarget.style.color = '#00e08a'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(240,246,243,0.6)'; }}
              >
                <Download style={{ width: '12px', height: '12px' }} />
                JSON
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Stat Cards ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
          <StatCard value={myTransactions.length} label="Total Transactions" index={0} accent="#00e08a" />
          <StatCard value={myTransactions.filter(t => t.status === 'confirmed').length} label="Confirmed" index={1} accent="#00e08a" />
          <StatCard value={myTransactions.filter(t => t.status === 'pending').length} label="Pending" index={2} accent="#facc15" />
          <StatCard value={myTransactions.filter(t => t.status === 'failed').length} label="Failed" index={3} accent="#f87171" />
        </div>

        {/* ── Search & Filters ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          style={glass({ padding: '18px 20px', marginBottom: '18px' })}
        >
          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'rgba(240,246,243,0.25)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by asset, TXID, address…"
              style={{
                width: '100%', padding: '10px 14px 10px 36px',
                borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(7,17,13,0.7)', backdropFilter: 'blur(8px)',
                color: '#f0f6f3', fontSize: '12px', fontWeight: 500, outline: 'none',
                transition: 'all 0.25s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,224,138,0.08)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Filter style={{ width: '12px', height: '12px', color: 'rgba(240,246,243,0.25)', flexShrink: 0 }} />
            {txTypes.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: '5px 12px', borderRadius: '7px',
                  border: filterType === t ? '1px solid rgba(0,224,138,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  background: filterType === t ? 'rgba(0,224,138,0.10)' : 'rgba(255,255,255,0.02)',
                  color: filterType === t ? '#00e08a' : 'rgba(240,246,243,0.4)',
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.3px', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {t}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              {(['date', 'type'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  style={{
                    padding: '5px 10px', borderRadius: '7px',
                    border: sortBy === s ? '1px solid rgba(0,224,138,0.30)' : '1px solid rgba(255,255,255,0.06)',
                    background: sortBy === s ? 'rgba(0,224,138,0.08)' : 'rgba(255,255,255,0.02)',
                    color: sortBy === s ? '#00e08a' : 'rgba(240,246,243,0.35)',
                    fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.3px', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  Sort: {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Transaction List ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          style={glass({ padding: '24px' })}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <HistoryIcon style={{ width: '15px', height: '15px', color: '#00e08a' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3' }}>
              {filteredTransactions.length} Transactions
            </span>
            {searchTerm && (
              <span style={{ fontSize: '10px', color: 'rgba(240,246,243,0.3)', fontWeight: 500 }}>
                (filtered from {myTransactions.length})
              </span>
            )}
          </div>

          {filteredTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(0,224,138,0.06)', border: '1px solid rgba(0,224,138,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Sparkles style={{ width: '24px', height: '24px', color: '#00e08a' }} />
              </motion.div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f0f6f3', marginBottom: '6px' }}>No transactions found</div>
              {transactions.length === 0 && (
                <p style={{ fontSize: '12px', color: 'rgba(240,246,243,0.4)', lineHeight: 1.6, maxWidth: '340px', margin: '0 auto 20px' }}>
                  Start trading in the marketplace to generate on-chain activity.
                </p>
              )}
              {transactions.length === 0 && (
                <Link to="/marketplace" style={{ textDecoration: 'none' }}>
                  <button
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '12px 22px', borderRadius: '10px',
                      border: '1px solid rgba(0,224,138,0.3)',
                      background: 'linear-gradient(135deg, rgba(0,224,138,0.14), rgba(0,224,138,0.04))',
                      color: '#00e08a', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 24px rgba(0,224,138,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <ShoppingBag style={{ width: '14px', height: '14px' }} />
                    Explore Marketplace
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <AnimatePresence>
                {filteredTransactions.map((tx, i) => {
                  const accent = getTxAccent(tx.type);
                  const statusColor = tx.status === 'confirmed' ? '#00e08a' : tx.status === 'pending' ? '#facc15' : '#f87171';
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.025, 0.3) }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        padding: '14px 16px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'border-color 0.2s',
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,224,138,0.18)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'; }}
                    >
                      {/* Left */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '7px', height: '7px', borderRadius: '50%', marginTop: '6px', flexShrink: 0,
                          background: statusColor,
                          boxShadow: `0 0 6px ${statusColor}66`,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: accent, textTransform: 'uppercase' }}>{tx.type}</span>
                            {tx.assetName && (
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#f0f6f3' }}>{tx.assetName}</span>
                            )}
                            <span style={{
                              padding: '1px 6px', borderRadius: '4px',
                              border: `1px solid ${statusColor}33`,
                              background: `${statusColor}10`,
                              fontSize: '8px', fontWeight: 700, color: statusColor,
                              textTransform: 'uppercase', letterSpacing: '0.3px',
                            }}>{tx.status}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(240,246,243,0.3)', fontFamily: 'monospace', lineHeight: 1.5 }}>
                            <div>FROM: {tx.from.slice(0, 10)}…{tx.from.slice(-6)}</div>
                            {tx.to && <div>TO: {tx.to.slice(0, 10)}…{tx.to.slice(-6)}</div>}
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div style={{ textAlign: 'right', marginLeft: '16px', flexShrink: 0 }}>
                        {tx.amount && (
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f0f6f3' }}>{tx.amount.toLocaleString()} units</div>
                        )}
                        <div style={{ fontSize: '10px', color: 'rgba(240,246,243,0.3)' }}>{tx.timestamp.toLocaleString()}</div>
                        {tx.txId && (
                          <a
                            href={`${explorerBase}/tx/${tx.txId}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              marginTop: '3px', fontSize: '9px', color: '#00e08a',
                              fontFamily: 'monospace', textDecoration: 'none',
                              opacity: 0.7, transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                          >
                            <ExternalLink style={{ width: '9px', height: '9px' }} />
                            {tx.txId.slice(0, 8)}…
                          </a>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
};
