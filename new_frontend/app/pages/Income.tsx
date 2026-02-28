import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { Link } from 'react-router';
import {
  DollarSign, Wallet, RefreshCw, ExternalLink, CheckCircle,
  TrendingUp, Info, ShoppingBag, ArrowRight, Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { PageTransition } from '../components/motion/MotionSystem';
import { toast } from 'sonner';

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

const labelSt: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600,
  color: 'rgba(240,246,243,0.35)',
  textTransform: 'uppercase', letterSpacing: '0.8px',
  marginBottom: '4px',
};

/* ─── Stat card with tilt ──────────────────────────────────────────────── */
const StatCard: React.FC<{
  icon: React.FC<{ style?: React.CSSProperties }>;
  value: string | number;
  label: string;
  accent?: string;
  index: number;
}> = ({ icon: Icon, value, label, accent = '#00e08a', index }) => {
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
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 + index * 0.09, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
      style={{ perspective: '700px' }}
    >
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y, y: hov ? -4 : 0, scale: hov ? 1.02 : 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          ...glass({
            padding: '22px 20px',
            border: hov ? `1px solid ${accent}44` : '1px solid rgba(0,224,138,0.10)',
            boxShadow: hov ? `0 14px 36px rgba(0,0,0,0.3), 0 0 18px ${accent}12` : '0 4px 20px rgba(0,0,0,0.18)',
            transition: 'border-color 0.3s, box-shadow 0.4s',
          }),
          transformStyle: 'preserve-3d' as const, cursor: 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '11px',
            background: `${accent}14`, border: `1px solid ${accent}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s', boxShadow: hov ? `0 0 14px ${accent}18` : 'none',
          }}>
            <Icon style={{ width: '18px', height: '18px', color: accent, transition: 'transform 0.4s', transform: hov ? 'scale(1.15)' : 'scale(1)' }} />
          </div>
        </div>
        <div style={{ fontSize: '26px', fontWeight: 800, color: '#f0f6f3', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '4px' }}>
          {value}
        </div>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(240,246,243,0.35)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */

interface IncomeAsset {
  id: string;
  assetId?: number;
  name: string;
  unitName: string;
  claimableAmount: number;
  totalEarned: number;
  userBalance: number;
  totalSupply: number;
}

export const Income: React.FC = () => {
  const { address, network, assets: walletAssets } = useAlgorand();
  const { assets: registeredAssets, addTransaction } = useAssetRegistry();
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [incomeData, setIncomeData] = useState<IncomeAsset[]>([]);
  const [totalClaimable, setTotalClaimable] = useState(0);
  const [totalClaimed, setTotalClaimed] = useState(0);

  const explorerBase = network === 'mainnet'
    ? 'https://algoexplorer.io'
    : 'https://testnet.algoexplorer.io';

  useEffect(() => {
    if (!address) return;
    loadIncomeData();
  }, [address, network, walletAssets]);

  const loadIncomeData = async () => {
    setLoading(true);
    try {
      const holdings = walletAssets.filter(a => {
        const reg = registeredAssets.find(r => r.assetId === a.id);
        return reg && reg.verificationStatus === 'approved';
      });
      const incomeItems: IncomeAsset[] = [];
      let totalClaimableAcc = 0;
      for (const holding of holdings) {
        const reg = registeredAssets.find(r => r.assetId === holding.id);
        if (!reg) continue;
        try {
          const stateRes = await fetch(`/api/income/contract-state?asaId=${holding.id}`);
          let claimable = 0;
          let totalEarned = 0;
          if (stateRes.ok) {
            const state = await stateRes.json();
            const totalDeposited = state.totalDeposited || 0;
            const alreadyClaimed = state.claimed?.[address] || 0;
            if (reg.totalSupply > 0 && holding.amount > 0) {
              const proportionalShare = (holding.amount / reg.totalSupply) * totalDeposited;
              claimable = Math.max(0, proportionalShare - alreadyClaimed) / 1_000_000;
              totalEarned = proportionalShare / 1_000_000;
            }
          }
          totalClaimableAcc += claimable;
          incomeItems.push({
            id: reg.id, assetId: holding.id, name: holding.name,
            unitName: holding.unitName, claimableAmount: claimable,
            totalEarned, userBalance: holding.amount, totalSupply: reg.totalSupply,
          });
        } catch { /* skip */ }
      }
      setIncomeData(incomeItems);
      setTotalClaimable(totalClaimableAcc);
    } catch (err) { console.error('Error loading income data:', err); }
    finally { setLoading(false); }
  };

  const handleClaim = async (asset: IncomeAsset) => {
    if (!address) { toast.error('Connect your wallet first'); return; }
    if (asset.claimableAmount <= 0) { toast.error('No claimable income for this asset'); return; }
    setClaiming(asset.id);
    try {
      const holderMnemonic = prompt(
        `Claim ${asset.claimableAmount.toFixed(6)} ALGO from ${asset.name}?\n\nEnter your 25-word mnemonic (DEMO MODE):`
      );
      if (!holderMnemonic) { toast.error('Claim cancelled'); return; }
      const response = await fetch('/api/income/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderMnemonic, holderBalance: asset.userBalance, asaId: asset.assetId }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Claimed ${asset.claimableAmount.toFixed(6)} ALGO from ${asset.name}!`);
        addTransaction({
          type: 'distribution', assetId: asset.assetId, assetName: asset.name,
          from: 'income-contract', to: address, amount: asset.claimableAmount,
          txId: result.txId, status: 'confirmed',
        });
        setTotalClaimed(prev => prev + asset.claimableAmount);
        if (result.explorerUrl) window.open(result.explorerUrl, '_blank');
        await loadIncomeData();
      } else { throw new Error(result.error || 'Claim failed'); }
    } catch (err: any) { toast.error(err.message || 'Failed to claim income'); }
    finally { setClaiming(null); }
  };

  const handleClaimAll = async () => {
    const claimable = incomeData.filter(a => a.claimableAmount > 0);
    if (claimable.length === 0) { toast.error('No claimable income'); return; }
    for (const asset of claimable) { await handleClaim(asset); }
  };

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
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(240,246,243,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Income</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f0f6f3', letterSpacing: '-0.4px', marginBottom: '6px' }}>Income Distribution</h1>
              <p style={{ fontSize: '13px', color: 'rgba(240,246,243,0.45)', maxWidth: '480px', lineHeight: 1.6 }}>
                Connect your Algorand wallet to view and claim proportional income from your verified ASA holdings.
              </p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', marginBottom: '24px', borderRadius: '12px', background: 'rgba(0,224,138,0.04)', border: '1px solid rgba(0,224,138,0.15)' }}
          >
            <Wallet style={{ width: '18px', height: '18px', color: '#00e08a', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'rgba(240,246,243,0.6)', lineHeight: 1.5 }}>
              <strong style={{ color: '#00e08a' }}>Wallet not connected</strong> — Connect your wallet via the navbar to view claimable income.
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
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#00e08a', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Income Distribution</span>
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f0f6f3', letterSpacing: '-0.4px', marginBottom: '6px' }}>Claim Earnings</h1>
              <p style={{ fontSize: '13px', color: 'rgba(240,246,243,0.45)', maxWidth: '420px', lineHeight: 1.6 }}>Proportional income from your verified ASA holdings on Algorand.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={loadIncomeData}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(240,246,243,0.6)', fontSize: '11px', fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer', transition: 'all 0.25s',
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.25)'; e.currentTarget.style.color = '#00e08a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(240,246,243,0.6)'; }}
              >
                <RefreshCw style={{ width: '12px', height: '12px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                Refresh
              </button>
              {totalClaimable > 0 && (
                <button
                  onClick={handleClaimAll}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '10px',
                    border: '1px solid rgba(0,224,138,0.3)',
                    background: 'linear-gradient(135deg, rgba(0,224,138,0.18), rgba(0,224,138,0.06))',
                    color: '#00e08a', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.3s',
                    boxShadow: '0 0 16px rgba(0,224,138,0.06)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 24px rgba(0,224,138,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 16px rgba(0,224,138,0.06)'; }}
                >
                  <DollarSign style={{ width: '12px', height: '12px' }} />
                  Claim All ({totalClaimable.toFixed(4)} ALGO)
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Stat Cards ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <StatCard icon={DollarSign} value={totalClaimable.toFixed(6)} label="Total Claimable (ALGO)" index={0} accent="#00e08a" />
          <StatCard icon={CheckCircle} value={totalClaimed.toFixed(6)} label="Claimed This Session" index={1} accent="#22c55e" />
          <StatCard icon={TrendingUp} value={incomeData.length} label="Income-Bearing Assets" index={2} accent="#facc15" />
        </div>

        {/* ── Income Assets List ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          style={glass({ padding: '24px', marginBottom: '18px' })}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <DollarSign style={{ width: '15px', height: '15px', color: '#00e08a' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3' }}>Claimable Income by Asset</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <RefreshCw style={{ width: '24px', height: '24px', color: 'rgba(240,246,243,0.3)', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '12px', color: 'rgba(240,246,243,0.35)' }}>Loading income data…</div>
            </div>
          ) : incomeData.length === 0 ? (
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
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f0f6f3', marginBottom: '6px' }}>No income-bearing assets yet</div>
              <p style={{ fontSize: '12px', color: 'rgba(240,246,243,0.4)', lineHeight: 1.6, maxWidth: '340px', margin: '0 auto 20px' }}>
                Purchase verified assets in the marketplace to earn proportional income distributions.
              </p>
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
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {incomeData.map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.07 }}
                  style={{
                    padding: '18px 20px', borderRadius: '12px',
                    background: asset.claimableAmount > 0 ? 'rgba(0,224,138,0.04)' : 'rgba(255,255,255,0.02)',
                    border: asset.claimableAmount > 0 ? '1px solid rgba(0,224,138,0.20)' : '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.25s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,224,138,0.30)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = asset.claimableAmount > 0 ? 'rgba(0,224,138,0.20)' : 'rgba(255,255,255,0.05)'; }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3' }}>{asset.name}</span>
                        <span style={{
                          padding: '2px 7px', borderRadius: '5px',
                          background: 'rgba(0,224,138,0.08)', border: '1px solid rgba(0,224,138,0.15)',
                          fontSize: '9px', fontWeight: 700, color: '#00e08a', textTransform: 'uppercase', letterSpacing: '0.3px',
                        }}>{asset.unitName}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(240,246,243,0.3)', fontFamily: 'monospace' }}>ASA #{asset.assetId}</div>
                    </div>
                    {asset.claimableAmount > 0 ? (
                      <button
                        onClick={() => handleClaim(asset)}
                        disabled={claiming === asset.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '10px 18px', borderRadius: '10px',
                          border: '1px solid rgba(0,224,138,0.35)',
                          background: 'linear-gradient(135deg, rgba(0,224,138,0.18), rgba(0,224,138,0.06))',
                          color: '#00e08a', fontSize: '11px', fontWeight: 700,
                          cursor: claiming === asset.id ? 'wait' : 'pointer',
                          opacity: claiming === asset.id ? 0.5 : 1,
                          transition: 'all 0.3s',
                          boxShadow: '0 0 16px rgba(0,224,138,0.06)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 24px rgba(0,224,138,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 16px rgba(0,224,138,0.06)'; }}
                      >
                        {claiming === asset.id
                          ? <RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
                          : <DollarSign style={{ width: '12px', height: '12px' }} />}
                        Claim {asset.claimableAmount.toFixed(6)} ALGO
                      </button>
                    ) : (
                      <span style={{
                        padding: '6px 12px', borderRadius: '7px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.02)',
                        fontSize: '10px', fontWeight: 600, color: 'rgba(240,246,243,0.3)',
                      }}>Nothing to claim</span>
                    )}
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {[
                      { l: 'Your Balance', v: `${asset.userBalance.toLocaleString()} units` },
                      { l: 'Total Supply', v: asset.totalSupply.toLocaleString() },
                      { l: 'Your Share', v: `${asset.totalSupply > 0 ? ((asset.userBalance / asset.totalSupply) * 100).toFixed(4) : '0'}%` },
                      { l: 'Total Earned', v: `${asset.totalEarned.toFixed(6)} ALGO`, accent: true },
                    ].map(s => (
                      <div key={s.l} style={{
                        padding: '8px 10px', borderRadius: '8px',
                        background: 'rgba(0,224,138,0.03)', border: '1px solid rgba(255,255,255,0.03)',
                      }}>
                        <div style={labelSt}>{s.l}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: s.accent ? '#00e08a' : '#f0f6f3' }}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Explorer link */}
                  {asset.assetId && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <a
                        href={`${explorerBase}/asset/${asset.assetId}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '10px', color: '#00e08a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.7, transition: 'opacity 0.2s' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                      >
                        <ExternalLink style={{ width: '10px', height: '10px' }} />
                        View on AlgoExplorer
                      </a>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Info Box ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={glass({ padding: '22px 24px' })}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Info style={{ width: '14px', height: '14px', color: '#00e08a' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0f6f3' }}>How Income Distribution Works</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'rgba(240,246,243,0.4)', lineHeight: 1.6 }}>
            <p>Income is distributed proportionally based on your ASA token holdings relative to total supply.</p>
            <p>Asset managers deposit ALGO into the on-chain income distribution contract.</p>
            <p>Your claimable amount = (Your Balance / Total Supply) × Total Deposited.</p>
            <p>All distributions are executed via atomic transactions on Algorand for trustless settlement.</p>
            <p>Transaction finality is ~3.7 seconds with $0.001 fees.</p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};
