import React, { useState, useRef, useCallback } from 'react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { Link } from 'react-router';
import {
  Wallet, TrendingUp, ArrowUpRight, ExternalLink, RefreshCw, Coins,
  Building2, Zap, HardHat, Shield, Clock, ShoppingBag,
  ArrowRight, Activity, DollarSign, Gem, Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { PageTransition } from '../components/motion/MotionSystem';

/* ═══════════════════════════════════════════════════════════════════════════
   Design System — reusable glass helpers
   ═══════════════════════════════════════════════════════════════════════════ */

const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  borderRadius: '16px',
  background: 'rgba(7,17,13,0.60)',
  backdropFilter: 'blur(16px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
  border: '1px solid rgba(0,224,138,0.12)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
  ...extra,
});

const glassInput: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(7,17,13,0.7)',
  backdropFilter: 'blur(8px)',
  color: '#f0f6f3',
  fontSize: '12px',
  fontWeight: 500,
  outline: 'none',
  transition: 'all 0.25s ease',
};

/* ─── Demo ASA data for empty state ────────────────────────────────────── */

interface DemoHolding {
  name: string;
  unitName: string;
  category: string;
  units: string;
  value: string;
  change: string;
  changeUp: boolean;
  status: 'Verified' | 'Pending';
  icon: React.FC<{ style?: React.CSSProperties }>;
  accent: string;
}

const DEMO_HOLDINGS: DemoHolding[] = [
  {
    name: 'Manhattan Penthouse — Frac.',
    unitName: 'MNHT',
    category: 'Real Estate',
    units: '2,500',
    value: '$12,500.00',
    change: '+3.2%',
    changeUp: true,
    status: 'Verified',
    icon: Building2,
    accent: 'rgba(0,224,138,0.8)',
  },
  {
    name: 'Solar Farm — Nevada',
    unitName: 'SLNV',
    category: 'Renewable Energy',
    units: '10,000',
    value: '$8,400.00',
    change: '+1.8%',
    changeUp: true,
    status: 'Verified',
    icon: Zap,
    accent: 'rgba(250,204,21,0.7)',
  },
  {
    name: 'Infrastructure Bond — TX',
    unitName: 'INFTX',
    category: 'Infrastructure',
    units: '5,000',
    value: '$5,250.00',
    change: '-0.4%',
    changeUp: false,
    status: 'Pending',
    icon: HardHat,
    accent: 'rgba(99,102,241,0.7)',
  },
];

/* ─── TiltCard (mouse-tracked parallax lift) ───────────────────────────── */

const TiltCard: React.FC<{
  children: React.ReactNode;
  accent: string;
  index: number;
  delay?: number;
}> = ({ children, accent, index, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hov, setHov] = useState(false);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setTilt({ x: y * -3, y: x * 5 });
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay + index * 0.09, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
      style={{ perspective: '800px', cursor: 'default' }}
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          y: hov ? -5 : 0,
          scale: hov ? 1.018 : 1,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          ...glass({
            border: hov ? `1px solid ${accent}` : '1px solid rgba(0,224,138,0.10)',
            boxShadow: hov
              ? `0 18px 44px rgba(0,0,0,0.35), 0 0 20px ${accent.replace(/[\d.]+\)$/, '0.08)')}`
              : '0 4px 20px rgba(0,0,0,0.18)',
            transition: 'border-color 0.3s, box-shadow 0.4s',
          }),
          overflow: 'hidden',
          transformStyle: 'preserve-3d' as const,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
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
      transition={{ delay: 0.22 + index * 0.09, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
      style={{ perspective: '700px' }}
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          y: hov ? -4 : 0,
          scale: hov ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          ...glass({
            padding: '22px 20px',
            border: hov ? `1px solid ${accent}44` : '1px solid rgba(0,224,138,0.10)',
            boxShadow: hov
              ? `0 14px 36px rgba(0,0,0,0.3), 0 0 18px ${accent}12`
              : '0 4px 20px rgba(0,0,0,0.18)',
            transition: 'border-color 0.3s, box-shadow 0.4s',
          }),
          transformStyle: 'preserve-3d' as const,
          cursor: 'default',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '11px',
            background: `${accent}14`,
            border: `1px solid ${accent}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s',
            boxShadow: hov ? `0 0 14px ${accent}18` : 'none',
          }}>
            <Icon style={{ width: '18px', height: '18px', color: accent, transition: 'transform 0.4s', transform: hov ? 'scale(1.15)' : 'scale(1)' }} />
          </div>
        </div>
        <div style={{
          fontSize: '26px', fontWeight: 800, color: '#f0f6f3',
          letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '4px',
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '10px', fontWeight: 600,
          color: 'rgba(240,246,243,0.35)',
          textTransform: 'uppercase', letterSpacing: '0.8px',
        }}>
          {label}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

interface AlgorandHolding {
  id: number;
  amount: number;
  name: string;
  unitName: string;
}

export const Portfolio: React.FC = () => {
  const { address, balance, assets, network } = useAlgorand();
  const { assets: registeredAssets, transactions } = useAssetRegistry();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  const myTxns = transactions.filter(tx => tx.from === address || tx.to === address);

  const enrichedHoldings = assets.map((holding: AlgorandHolding) => {
    const registered = registeredAssets.find(a => a.assetId === holding.id);
    return { ...holding, registered };
  });

  const explorerBase = network === 'mainnet'
    ? 'https://algoexplorer.io'
    : 'https://testnet.algoexplorer.io';

  /* ─── Wallet not connected ─────────────────────────────────────────── */
  if (!address) {
    return (
      <PageTransition>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{
              ...glass({ padding: '36px 28px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }),
            }}
          >
            <div style={{
              position: 'absolute', top: '-50px', right: '-30px',
              width: '220px', height: '220px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,224,138,0.06), transparent 70%)',
              filter: 'blur(40px)', pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'rgba(240,246,243,0.2)',
                }} />
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: 'rgba(240,246,243,0.35)',
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                }}>
                  Portfolio
                </span>
              </div>
              <h1 style={{
                fontSize: '28px', fontWeight: 800, color: '#f0f6f3',
                letterSpacing: '-0.4px', marginBottom: '6px',
              }}>
                Your Asset Dashboard
              </h1>
              <p style={{
                fontSize: '13px', color: 'rgba(240,246,243,0.45)',
                maxWidth: '480px', lineHeight: 1.6,
              }}>
                Connect your Algorand wallet to view holdings, track performance, and manage your tokenized assets.
              </p>
            </div>
          </motion.div>

          {/* Wallet CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 20px', marginBottom: '24px', borderRadius: '12px',
              background: 'rgba(0,224,138,0.04)',
              border: '1px solid rgba(0,224,138,0.15)',
            }}
          >
            <Wallet style={{ width: '18px', height: '18px', color: '#00e08a', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'rgba(240,246,243,0.6)', lineHeight: 1.5 }}>
              <strong style={{ color: '#00e08a' }}>Wallet not connected</strong> —
              Connect your wallet via the navbar to unlock your personal portfolio. Preview demo holdings below.
            </span>
          </motion.div>

          {/* Demo stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
            <StatCard icon={DollarSign} value="$26,150" label="Total Value (Demo)" index={0} accent="#00e08a" />
            <StatCard icon={Gem} value="3" label="Assets Held (Demo)" index={1} accent="#facc15" />
            <StatCard icon={Activity} value="+2.4%" label="Portfolio Change (Demo)" index={2} accent="#22c55e" />
          </div>

          {/* Demo holdings label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}
          >
            <Sparkles style={{ width: '13px', height: '13px', color: 'rgba(240,246,243,0.25)' }} />
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: 'rgba(240,246,243,0.3)',
              letterSpacing: '0.5px',
            }}>
              Demo Holdings — Preview Mode
            </span>
          </motion.div>

          {/* Demo holding cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
            {DEMO_HOLDINGS.map((h, i) => {
              const Icon = h.icon;
              const statusColor = h.status === 'Verified' ? '#00e08a' : '#facc15';
              return (
                <TiltCard key={h.unitName} accent={h.accent} index={i} delay={0.45}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
                    {/* Left */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '11px',
                        background: h.accent.replace(/[\d.]+\)$/, '0.10)'),
                        border: `1px solid ${h.accent.replace(/[\d.]+\)$/, '0.20)')}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon style={{
                          width: '19px', height: '19px',
                          color: h.accent.replace(/[\d.]+\)$/, '1)'),
                        }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3', marginBottom: '2px' }}>
                          {h.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(240,246,243,0.35)', fontWeight: 600, letterSpacing: '0.3px' }}>
                          {h.unitName} · {h.category}
                        </div>
                      </div>
                    </div>

                    {/* Middle — units + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f0f6f3' }}>{h.units}</div>
                        <div style={{ fontSize: '9px', color: 'rgba(240,246,243,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Units</div>
                      </div>
                      <div style={{
                        padding: '3px 8px', borderRadius: '5px',
                        border: `1px solid ${statusColor}33`,
                        background: `${statusColor}10`,
                        fontSize: '9px', fontWeight: 700,
                        color: statusColor,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        {h.status === 'Verified'
                          ? <Shield style={{ width: '9px', height: '9px' }} />
                          : <Clock style={{ width: '9px', height: '9px' }} />}
                        {h.status}
                      </div>
                    </div>

                    {/* Right — value */}
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#f0f6f3' }}>{h.value}</div>
                      <div style={{
                        fontSize: '11px', fontWeight: 700,
                        color: h.changeUp ? '#00e08a' : '#f87171',
                      }}>
                        {h.change}
                      </div>
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </div>

          {/* Quick link */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Link to="/marketplace" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  ...glass({
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    border: '1px solid rgba(0,224,138,0.15)',
                    transition: 'all 0.3s',
                  }),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,224,138,0.35)';
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.25), 0 0 16px rgba(0,224,138,0.06)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,224,138,0.15)';
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShoppingBag style={{ width: '16px', height: '16px', color: '#00e08a' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f0f6f3' }}>Explore Marketplace</div>
                    <div style={{ fontSize: '10px', color: 'rgba(240,246,243,0.35)' }}>Browse verified tokenized assets</div>
                  </div>
                </div>
                <ArrowRight style={{ width: '16px', height: '16px', color: 'rgba(240,246,243,0.3)' }} />
              </div>
            </Link>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     WALLET CONNECTED — REAL PORTFOLIO
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <PageTransition>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Glass Hero Header ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            ...glass({ padding: '28px 26px 24px', marginBottom: '18px', position: 'relative', overflow: 'hidden' }),
          }}
        >
          {/* Ambient glow */}
          <div style={{
            position: 'absolute', top: '-60px', right: '-40px',
            width: '250px', height: '250px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,224,138,0.06), transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-40px', left: '20%',
            width: '160px', height: '160px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,224,138,0.03), transparent 70%)',
            filter: 'blur(30px)', pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#00e08a',
                  boxShadow: '0 0 10px rgba(0,224,138,0.5)',
                  animation: 'pulse 2.5s ease-in-out infinite',
                }} />
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: '#00e08a',
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                }}>
                  My Portfolio
                </span>
              </div>
              <h1 style={{
                fontSize: '26px', fontWeight: 800, color: '#f0f6f3',
                letterSpacing: '-0.4px', marginBottom: '6px',
              }}>
                Asset Dashboard
              </h1>
              {/* Wallet badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 10px', borderRadius: '6px',
                background: 'rgba(0,224,138,0.06)',
                border: '1px solid rgba(0,224,138,0.12)',
              }}>
                <Wallet style={{ width: '11px', height: '11px', color: '#00e08a' }} />
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(240,246,243,0.5)', fontWeight: 600 }}>
                  {address.slice(0, 8)}…{address.slice(-6)}
                </span>
              </div>
            </div>

            {/* Action pills */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={`${explorerBase}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px',
                  border: '1px solid rgba(0,224,138,0.2)',
                  background: 'rgba(0,224,138,0.06)',
                  color: '#00e08a', fontSize: '11px', fontWeight: 700,
                  textDecoration: 'none', cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,224,138,0.12)';
                  e.currentTarget.style.boxShadow = '0 0 14px rgba(0,224,138,0.10)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,224,138,0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <ExternalLink style={{ width: '12px', height: '12px' }} />
                Explorer
              </a>
              <button
                onClick={refresh}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(240,246,243,0.6)', fontSize: '11px', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.25s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,224,138,0.25)';
                  e.currentTarget.style.color = '#00e08a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'rgba(240,246,243,0.6)';
                }}
              >
                <RefreshCw style={{ width: '12px', height: '12px' }} />
                Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Metric Cards ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <StatCard icon={Coins} value={balance.toFixed(4)} label="ALGO Balance" index={0} accent="#00e08a" />
          <StatCard icon={TrendingUp} value={assets.length} label="Assets Held" index={1} accent="#22c55e" />
          <StatCard icon={Activity} value={myTxns.length} label="Total Transactions" index={2} accent="#facc15" />
        </div>

        {/* ── ASA Holdings ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          style={glass({ padding: '24px', marginBottom: '18px' })}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gem style={{ width: '15px', height: '15px', color: '#00e08a' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3' }}>
                ASA Holdings
              </span>
              <span style={{
                padding: '2px 7px', borderRadius: '5px',
                background: 'rgba(0,224,138,0.08)',
                border: '1px solid rgba(0,224,138,0.15)',
                fontSize: '10px', fontWeight: 700, color: '#00e08a',
              }}>
                {assets.length}
              </span>
            </div>
          </div>

          {assets.length === 0 ? (
            /* ── Friendly empty state ──────────────────────────────── */
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(0,224,138,0.06)',
                  border: '1px solid rgba(0,224,138,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Sparkles style={{ width: '24px', height: '24px', color: '#00e08a' }} />
              </motion.div>
              <div style={{
                fontSize: '15px', fontWeight: 700, color: '#f0f6f3', marginBottom: '6px',
              }}>
                No assets yet — your portfolio awaits
              </div>
              <p style={{
                fontSize: '12px', color: 'rgba(240,246,243,0.4)',
                lineHeight: 1.6, maxWidth: '340px', margin: '0 auto 20px',
              }}>
                Tokenized real-world assets, carbon credits, and fractional ownership — all on Algorand. Start exploring the marketplace.
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
                    boxShadow: '0 0 16px rgba(0,224,138,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.22), rgba(0,224,138,0.08))';
                    e.currentTarget.style.boxShadow = '0 0 24px rgba(0,224,138,0.12)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.14), rgba(0,224,138,0.04))';
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(0,224,138,0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <ShoppingBag style={{ width: '14px', height: '14px' }} />
                  Explore Marketplace
                </button>
              </Link>
            </div>
          ) : (
            /* ── Real holdings list ────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {enrichedHoldings.map((holding, index) => {
                const vStatus = holding.registered?.verificationStatus;
                const statusColor = vStatus === 'approved' ? '#00e08a' : vStatus === 'pending' ? '#facc15' : '#f87171';
                return (
                  <motion.div
                    key={holding.id}
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.42 + index * 0.06 }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.25s',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,224,138,0.20)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(0,224,138,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                    }}
                  >
                    {/* Identity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '9px',
                        background: 'rgba(0,224,138,0.08)',
                        border: '1px solid rgba(0,224,138,0.18)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 800, color: '#00e08a',
                        letterSpacing: '0.3px',
                      }}>
                        {(holding.unitName || 'ASA').slice(0, 3)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f0f6f3' }}>
                          {holding.name || `ASA #${holding.id}`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{
                            fontSize: '10px', color: 'rgba(240,246,243,0.35)', fontFamily: 'monospace', fontWeight: 600,
                          }}>
                            #{holding.id} · {holding.unitName}
                          </span>
                          {vStatus && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              padding: '1px 6px', borderRadius: '4px',
                              background: `${statusColor}10`,
                              border: `1px solid ${statusColor}25`,
                              fontSize: '8px', fontWeight: 700,
                              color: statusColor,
                              textTransform: 'uppercase', letterSpacing: '0.3px',
                            }}>
                              {vStatus === 'approved' ? <Shield style={{ width: '7px', height: '7px' }} /> : <Clock style={{ width: '7px', height: '7px' }} />}
                              {vStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Value + explorer */}
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#f0f6f3' }}>
                          {holding.amount.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(240,246,243,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          units
                        </div>
                      </div>
                      <a
                        href={`${explorerBase}/asset/${holding.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', justify: 'center',
                          width: '28px', height: '28px', borderRadius: '7px',
                          background: 'rgba(0,224,138,0.06)',
                          border: '1px solid rgba(0,224,138,0.12)',
                          color: '#00e08a',
                          transition: 'all 0.25s',
                          textDecoration: 'none',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0,224,138,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0,224,138,0.06)';
                        }}
                      >
                        <ExternalLink style={{ width: '12px', height: '12px' }} />
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Recent Activity ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46 }}
          style={glass({ padding: '24px', marginBottom: '18px' })}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity style={{ width: '15px', height: '15px', color: '#00e08a' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3' }}>
                Recent Activity
              </span>
            </div>
            <Link
              to="/history"
              style={{
                fontSize: '11px', fontWeight: 700, color: '#00e08a',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'opacity 0.2s', opacity: 0.8,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
            >
              View All <ArrowRight style={{ width: '11px', height: '11px' }} />
            </Link>
          </div>

          {myTxns.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '24px 0',
              fontSize: '12px', color: 'rgba(240,246,243,0.3)',
            }}>
              No transactions yet — activity will appear here once you interact with the blockchain.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {myTxns.slice(0, 5).map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.04 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,224,138,0.15)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.04)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: tx.status === 'confirmed' ? '#00e08a' : '#f87171',
                      boxShadow: tx.status === 'confirmed' ? '0 0 6px rgba(0,224,138,0.4)' : '0 0 6px rgba(248,113,113,0.4)',
                    }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f0f6f3', textTransform: 'capitalize' }}>
                        {tx.type}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(240,246,243,0.3)' }}>
                        {tx.assetName || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {tx.amount && (
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f0f6f3' }}>{tx.amount} units</div>
                    )}
                    <div style={{ fontSize: '10px', color: 'rgba(240,246,243,0.3)' }}>
                      {tx.timestamp.toLocaleDateString()}
                    </div>
                    {tx.txId && (
                      <a
                        href={`${explorerBase}/tx/${tx.txId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '9px', color: '#00e08a', fontFamily: 'monospace', textDecoration: 'none' }}
                      >
                        {tx.txId.slice(0, 8)}…
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Quick Links ────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { to: '/marketplace', label: 'Buy More Assets', desc: 'Browse verified marketplace listings', icon: ShoppingBag },
            { to: '/income', label: 'Claim Income', desc: 'Proportional income distribution', icon: DollarSign },
            { to: '/history', label: 'Full History', desc: 'All transactions with audit export', icon: Activity },
          ].map((link, i) => {
            const LIcon = link.icon;
            return (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.54 + i * 0.07 }}
              >
                <Link to={link.to} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      ...glass({
                        padding: '16px 18px',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                      }),
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,224,138,0.25)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.25), 0 0 12px rgba(0,224,138,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,224,138,0.12)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <LIcon style={{ width: '14px', height: '14px', color: '#00e08a' }} />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#f0f6f3' }}>
                          {link.label}
                        </span>
                      </div>
                      <ArrowUpRight style={{ width: '13px', height: '13px', color: 'rgba(240,246,243,0.25)' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(240,246,243,0.35)' }}>
                      {link.desc}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
};
