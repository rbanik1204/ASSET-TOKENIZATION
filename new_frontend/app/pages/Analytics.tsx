import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { useAlgorand } from '../contexts/AlgorandContext';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';
import {
  TrendingUp, Activity, Users, DollarSign, Download,
  BarChart3, Layers, ShieldCheck, Zap, ArrowUpRight,
  Sparkles, Globe, Database, Timer, FileText, Search,
} from 'lucide-react';
import { AuditExport } from '../components/AuditExport';
import { motion, useInView } from 'motion/react';
import { PageTransition } from '../components/motion/MotionSystem';
import { toast } from 'sonner';

/* ═══════════════════════════════════════════════════════════════════════════
   Design System
   ═══════════════════════════════════════════════════════════════════════════ */

const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  borderRadius: '16px',
  background: 'rgba(7,17,13,0.55)',
  backdropFilter: 'blur(20px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
  border: '1px solid rgba(0,224,138,0.10)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
  ...extra,
});

const CHART_COLORS = [
  '#00e08a', '#2dd4bf', '#60a5fa', '#a78bfa', '#facc15', '#fb923c',
];

const GLASS_TOOLTIP: React.CSSProperties = {
  borderRadius: '12px',
  background: 'rgba(7,17,13,0.85)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(0,224,138,0.20)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 16px rgba(0,224,138,0.08)',
  fontFamily: 'monospace',
  fontSize: '12px',
  padding: '10px 14px',
  color: '#f0f6f3',
};

/* ─── Demo chart data (always shown for richness) ─────────────────────── */

const DEMO_VOLUME_7D = [
  { date: 'Feb 22', count: 34, value: 128400 },
  { date: 'Feb 23', count: 48, value: 192600 },
  { date: 'Feb 24', count: 42, value: 168000 },
  { date: 'Feb 25', count: 61, value: 244200 },
  { date: 'Feb 26', count: 55, value: 219800 },
  { date: 'Feb 27', count: 73, value: 291600 },
  { date: 'Feb 28', count: 67, value: 268400 },
];

const DEMO_CATEGORY_DATA = [
  { name: 'Real Estate', value: 38, color: '#00e08a' },
  { name: 'Energy', value: 22, color: '#2dd4bf' },
  { name: 'Commodities', value: 16, color: '#60a5fa' },
  { name: 'Infrastructure', value: 14, color: '#a78bfa' },
  { name: 'Securities', value: 10, color: '#facc15' },
];

const DEMO_VERIFICATION = [
  { name: 'Approved', value: 47, fill: '#00e08a' },
  { name: 'Pending', value: 12, fill: '#facc15' },
  { name: 'Rejected', value: 3, fill: '#f87171' },
];

const DEMO_TX_TYPES = [
  { name: 'Transfer', value: 142, fill: '#00e08a' },
  { name: 'Create', value: 62, fill: '#60a5fa' },
  { name: 'Opt-In', value: 88, fill: '#a78bfa' },
  { name: 'Purchase', value: 37, fill: '#2dd4bf' },
  { name: 'Distribution', value: 24, fill: '#facc15' },
];

const DEMO_TOP_ASSETS = [
  { rank: 1, name: 'Manhattan REIT', unit: 'MNHT', supply: 10_000_000, category: 'Real Estate', change: '+3.2%' },
  { rank: 2, name: 'Solar Farm NV', unit: 'SLNV', supply: 5_000_000, category: 'Energy', change: '+1.8%' },
  { rank: 3, name: 'Gold Reserve Token', unit: 'GLDR', supply: 2_500_000, category: 'Commodities', change: '+0.4%' },
  { rank: 4, name: 'Infrastructure Bond', unit: 'INFB', supply: 1_000_000, category: 'Infrastructure', change: '+2.1%' },
  { rank: 5, name: 'Carbon Credit', unit: 'CRBC', supply: 800_000, category: 'Energy', change: '+5.6%' },
];

const DEMO_NETWORK_HEALTH = [
  { name: 'Uptime', value: 99.98, fill: '#00e08a' },
  { name: 'Block Finality', value: 96, fill: '#2dd4bf' },
  { name: 'Node Sync', value: 100, fill: '#60a5fa' },
];

/* ─── Particle field ───────────────────────────────────────────────────── */

const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    interface P { x: number; y: number; vx: number; vy: number; r: number; a: number; }
    const particles: P[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.1 - 0.05,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.25 + 0.05,
    }));

    const draw = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,224,138,${p.a})`;
        ctx.fill();
      });
      // subtle connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,224,138,${0.04 * (1 - d / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0, opacity: 0.6,
    }} />
  );
};

/* ─── TiltCard ─────────────────────────────────────────────────────────── */

const TiltCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 5;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -5;
    el.style.transform = `perspective(800px) rotateX(${y}deg) rotateY(${x}deg) scale3d(1.02,1.02,1)`;
    el.style.boxShadow = '0 8px 40px rgba(0,224,138,0.12), 0 0 24px rgba(0,224,138,0.06), inset 0 1px 0 rgba(255,255,255,0.04)';
  }, []);
  const handleLeave = useCallback(() => {
    const el = ref.current; if (!el) return;
    el.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
    el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)';
  }, []);
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ transition: 'transform 0.35s cubic-bezier(.17,.67,.35,.96), box-shadow 0.35s ease',
        willChange: 'transform', ...style }}>
      {children}
    </div>
  );
};

/* ─── CountUpNumber ────────────────────────────────────────────────────── */

const CountUpNumber: React.FC<{ value: number; duration?: number; prefix?: string; suffix?: string; decimals?: number }> = ({
  value, duration = 1.8, prefix = '', suffix = '', decimals = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, value, duration]);

  return (
    <span ref={ref}>
      {prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}{suffix}
    </span>
  );
};

/* ─── Shimmer text effect ──────────────────────────────────────────────── */

const shimmerKeyframes = `
@keyframes analytics-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes glow-breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
`;

/* ─── KPI Card ─────────────────────────────────────────────────────────── */

const KPICard: React.FC<{
  icon: React.FC<{ style?: React.CSSProperties }>;
  label: string; value: number; change: string; color: string; delay: number;
}> = ({ icon: Icon, label, value, change, color, delay }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6, ease: [.17,.67,.35,.96] }}>
    <TiltCard>
      <div style={{
        ...glass({
          padding: '26px 28px',
          position: 'relative', overflow: 'hidden',
          border: `1px solid ${color}18`,
        }),
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: -30, right: -20, width: 100, height: 100,
          borderRadius: '50%', background: `radial-gradient(circle, ${color}12, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        {/* Breathing glow dot */}
        <div style={{
          position: 'absolute', top: 18, right: 18, width: 8, height: 8,
          borderRadius: '50%', background: color,
          animation: 'glow-breathe 3s ease-in-out infinite',
          boxShadow: `0 0 8px ${color}60`,
        }} />
        {/* Reflection */}
        <div style={{
          position: 'absolute', bottom: -1, left: 20, right: 20, height: 12,
          background: `linear-gradient(to bottom, ${color}06, transparent)`,
          borderRadius: '0 0 16px 16px', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${color}10`, border: `1px solid ${color}25`,
          }}>
            <Icon style={{ width: 20, height: 20, color }} />
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'rgba(240,246,243,0.45)',
          }}>{label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{
            fontSize: 36, fontWeight: 800, color, letterSpacing: '-0.03em',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            <CountUpNumber value={value} />
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, color: change.startsWith('+') ? '#00e08a' : '#f87171',
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '3px 8px', borderRadius: '6px',
            background: change.startsWith('+') ? 'rgba(0,224,138,0.08)' : 'rgba(248,113,113,0.08)',
          }}>
            <ArrowUpRight style={{
              width: 12, height: 12,
              transform: change.startsWith('+') ? 'none' : 'rotate(90deg)',
            }} />
            {change}
          </span>
        </div>
      </div>
    </TiltCard>
  </motion.div>
);

/* ─── ChartCard wrapper ────────────────────────────────────────────────── */

const ChartCard: React.FC<{
  title: string; icon: React.FC<{ style?: React.CSSProperties }>;
  children: React.ReactNode; delay?: number; style?: React.CSSProperties;
}> = ({ title, icon: Icon, children, delay = 0, style: extraStyle }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6, ease: [.17,.67,.35,.96] }}>
      <TiltCard>
        <div style={{
          ...glass({
            padding: '28px',
            position: 'relative', overflow: 'hidden',
          }),
          ...extraStyle,
        }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,224,138,0.08)', border: '1px solid rgba(0,224,138,0.18)',
            }}>
              <Icon style={{ width: 16, height: 16, color: '#00e08a' }} />
            </div>
            <h3 style={{
              fontSize: 14, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: '#f0f6f3', margin: 0,
            }}>{title}</h3>
          </div>
          {children}
        </div>
      </TiltCard>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════ */

export const Analytics: React.FC = () => {
  const { assets, transactions } = useAssetRegistry();
  const { network } = useAlgorand();

  // Use real data if available, otherwise demo
  const hasRealData = assets.length > 0 || transactions.length > 0;

  const categoryData = useMemo(() => {
    if (assets.length === 0) return DEMO_CATEGORY_DATA;
    return assets.reduce((acc, asset) => {
      const cat = asset.category || 'other';
      const existing = acc.find(item => item.name === cat);
      if (existing) { existing.value += 1; }
      else { acc.push({ name: cat.replace('-', ' '), value: 1, color: CHART_COLORS[acc.length % CHART_COLORS.length] }); }
      return acc;
    }, [] as Array<{ name: string; value: number; color: string }>);
  }, [assets]);

  const verificationData = useMemo(() => {
    if (assets.length === 0) return DEMO_VERIFICATION;
    return [
      { name: 'Approved', value: assets.filter(a => a.verificationStatus === 'approved').length, fill: '#00e08a' },
      { name: 'Pending', value: assets.filter(a => a.verificationStatus === 'pending').length, fill: '#facc15' },
      { name: 'Rejected', value: assets.filter(a => a.verificationStatus === 'rejected').length, fill: '#f87171' },
    ].filter(i => i.value > 0);
  }, [assets]);

  const volumeData = useMemo(() => {
    if (transactions.length === 0) return DEMO_VOLUME_7D;
    return transactions.reduce((acc, tx) => {
      const d = tx.timestamp.toLocaleDateString();
      const ex = acc.find(i => i.date === d);
      if (ex) { ex.count += 1; ex.value += 1000; }
      else { acc.push({ date: d, count: 1, value: 1000 }); }
      return acc;
    }, [] as Array<{ date: string; count: number; value: number }>).slice(-7);
  }, [transactions]);

  const txTypeData = useMemo(() => {
    if (transactions.length === 0) return DEMO_TX_TYPES;
    return transactions.reduce((acc, tx) => {
      const ex = acc.find(i => i.name === tx.type);
      if (ex) { ex.value += 1; }
      else { acc.push({ name: tx.type, value: 1, fill: CHART_COLORS[acc.length % CHART_COLORS.length] }); }
      return acc;
    }, [] as Array<{ name: string; value: number; fill: string }>);
  }, [transactions]);

  const topAssets = useMemo(() => {
    if (assets.length === 0) return DEMO_TOP_ASSETS;
    return [...assets]
      .filter(a => a.verificationStatus === 'approved')
      .sort((a, b) => b.totalSupply - a.totalSupply)
      .slice(0, 5)
      .map((a, i) => ({
        rank: i + 1, name: a.name, unit: a.unitName,
        supply: a.totalSupply, category: a.category || 'Other', change: '+0.0%',
      }));
  }, [assets]);

  const stats = useMemo(() => ({
    totalAssets: assets.length || 62,
    verified: assets.filter(a => a.verificationStatus === 'approved').length || 47,
    totalTx: transactions.length || 353,
    holders: new Set(transactions.map(t => t.from)).size || 184,
  }), [assets, transactions]);

  const exportData = () => {
    const data = { assets, transactions, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `analytics-export-${Date.now()}.json`; a.click();
    toast.success('Analytics data exported');
  };

  /* ═════════════════════════════════════════════════════════════════════ */

  return (
    <PageTransition>
      {/* Inject keyframes */}
      <style>{shimmerKeyframes}</style>

      {/* Particle background */}
      <ParticleField />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 48, position: 'relative', zIndex: 1 }}>

        {/* ── Glass Hero Header ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [.17,.67,.35,.96] }}>
          <div style={{
            ...glass({
              borderRadius: '20px', padding: '36px 40px',
              position: 'relative', overflow: 'hidden',
              border: '1px solid rgba(0,224,138,0.15)',
              boxShadow: '0 0 60px rgba(0,224,138,0.06), 0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
            }),
          }}>
            {/* Ambient glows */}
            <div style={{
              position: 'absolute', top: -80, right: -40, width: 260, height: 260,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,224,138,0.07), transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: -60, left: 100, width: 200, height: 200,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,212,191,0.04), transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,224,138,0.10)', border: '1px solid rgba(0,224,138,0.25)',
                  boxShadow: '0 0 20px rgba(0,224,138,0.08)',
                }}>
                  <BarChart3 style={{ width: 26, height: 26, color: '#00e08a' }} />
                </div>
                <div>
                  <h1 style={{
                    fontSize: 28, fontWeight: 800, color: '#f0f6f3', margin: 0,
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(90deg, #f0f6f3 0%, #00e08a 50%, #f0f6f3 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'analytics-shimmer 12s linear infinite',
                  }}>
                    Analytics Dashboard
                  </h1>
                  <p style={{ fontSize: 13, color: 'rgba(240,246,243,0.40)', marginTop: 4 }}>
                    Real-time on-chain and indexer intelligence
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Status pill */}
                {!hasRealData && (
                  <div style={{
                    padding: '6px 14px', borderRadius: '20px',
                    background: 'rgba(0,224,138,0.06)', border: '1px solid rgba(0,224,138,0.18)',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'rgba(0,224,138,0.6)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Sparkles style={{ width: 12, height: 12 }} /> Demo Data
                  </div>
                )}
                {/* Live indicator */}
                <div style={{
                  padding: '6px 14px', borderRadius: '20px',
                  background: 'rgba(0,224,138,0.06)', border: '1px solid rgba(0,224,138,0.18)',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'rgba(0,224,138,0.7)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#00e08a',
                    animation: 'glow-breathe 2s ease-in-out infinite',
                    boxShadow: '0 0 6px rgba(0,224,138,0.5)',
                  }} />
                  Live
                </div>

                {/* Export */}
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={exportData}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', borderRadius: '12px', cursor: 'pointer',
                    background: 'rgba(0,224,138,0.10)', border: '1px solid rgba(0,224,138,0.25)',
                    color: '#00e08a', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                    transition: 'all 0.25s ease',
                  }}>
                  <Download style={{ width: 14, height: 14 }} /> Export
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── KPI Cards ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <KPICard icon={Layers} label="Total Assets" value={stats.totalAssets} change="+12%" color="#00e08a" delay={0.1} />
          <KPICard icon={ShieldCheck} label="Verified" value={stats.verified} change="+8%" color="#2dd4bf" delay={0.2} />
          <KPICard icon={Zap} label="Transactions" value={stats.totalTx} change="+24%" color="#60a5fa" delay={0.3} />
          <KPICard icon={Users} label="Unique Holders" value={stats.holders} change="+15%" color="#a78bfa" delay={0.4} />
        </div>

        {/* ── Charts Row 1: Volume + Category ────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>

          {/* Transaction Volume Area Chart */}
          <ChartCard title="Transaction Volume (7D)" icon={TrendingUp} delay={0.15}>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e08a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00e08a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="4 8" />
                  <XAxis dataKey="date" stroke="rgba(240,246,243,0.25)" tick={{ fontSize: 11, fill: 'rgba(240,246,243,0.35)' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(240,246,243,0.25)" tick={{ fontSize: 11, fill: 'rgba(240,246,243,0.35)' }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={GLASS_TOOLTIP} cursor={{ stroke: 'rgba(0,224,138,0.20)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="count" stroke="#00e08a" strokeWidth={2.5}
                    fill="url(#areaGreen)" animationDuration={1800} animationEasing="ease-out"
                    dot={{ fill: '#00e08a', strokeWidth: 0, r: 3 }}
                    activeDot={{ fill: '#00e08a', strokeWidth: 0, r: 6, style: { filter: 'drop-shadow(0 0 6px rgba(0,224,138,0.5))' } }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Asset Distribution Pie */}
          <ChartCard title="Asset Distribution" icon={Database} delay={0.25}>
            <div style={{ height: 280, display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      paddingAngle={3} dataKey="value"
                      stroke="rgba(7,17,13,0.8)" strokeWidth={2}
                      animationDuration={1400} animationEasing="ease-out">
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} style={{ filter: `drop-shadow(0 0 4px ${entry.color}40)` }} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={GLASS_TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
                {categoryData.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '3px', background: c.color, boxShadow: `0 0 6px ${c.color}40` }} />
                    <span style={{ fontSize: 11, color: 'rgba(240,246,243,0.50)', textTransform: 'capitalize' }}>{c.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,246,243,0.70)', marginLeft: 'auto' }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* ── Charts Row 2: Verification + Tx Types ──────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>

          {/* Verification Status */}
          <ChartCard title="Verification Status" icon={ShieldCheck} delay={0.2}>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verificationData} barCategoryGap="30%">
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="4 8" />
                  <XAxis dataKey="name" stroke="rgba(240,246,243,0.25)" tick={{ fontSize: 11, fill: 'rgba(240,246,243,0.35)' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(240,246,243,0.25)" tick={{ fontSize: 11, fill: 'rgba(240,246,243,0.35)' }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={GLASS_TOOLTIP} cursor={{ fill: 'rgba(0,224,138,0.04)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1400} animationEasing="ease-out">
                    {verificationData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} style={{ filter: `drop-shadow(0 2px 6px ${entry.fill}30)` }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Transaction Types */}
          <ChartCard title="Transaction Types" icon={Activity} delay={0.3}>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={txTypeData} layout="vertical" barCategoryGap="25%">
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="4 8" />
                  <XAxis type="number" stroke="rgba(240,246,243,0.25)" tick={{ fontSize: 11, fill: 'rgba(240,246,243,0.35)' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="rgba(240,246,243,0.25)" tick={{ fontSize: 11, fill: 'rgba(240,246,243,0.35)' }} axisLine={false} tickLine={false} width={90} />
                  <RTooltip contentStyle={GLASS_TOOLTIP} cursor={{ fill: 'rgba(0,224,138,0.04)' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={1400} animationEasing="ease-out">
                    {txTypeData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} style={{ filter: `drop-shadow(0 0 4px ${entry.fill}30)` }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* ── Network Health Radial ──────────────────────────────────── */}
        <ChartCard title="Network Health" icon={Globe} delay={0.25}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {DEMO_NETWORK_HEALTH.map((metric, i) => {
              const radialData = [{ name: metric.name, value: metric.value, fill: metric.fill }];
              return (
                <motion.div key={metric.name}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.12 }}
                  style={{ textAlign: 'center' }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="85%"
                      startAngle={90} endAngle={-270} data={radialData}
                      barSize={10}>
                      {/* background track */}
                      <RadialBar dataKey="value" background={{ fill: 'rgba(255,255,255,0.03)' }}
                        cornerRadius={10} animationDuration={1600} animationEasing="ease-out"
                        style={{ filter: `drop-shadow(0 0 6px ${metric.fill}30)` }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: -10 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: metric.fill, letterSpacing: '-0.02em' }}>
                      <CountUpNumber value={metric.value} suffix="%" decimals={metric.value % 1 !== 0 ? 2 : 0} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(240,246,243,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
                      {metric.name}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ChartCard>

        {/* ── Top Assets Table ───────────────────────────────────────── */}
        <ChartCard title="Top Assets by Supply" icon={Layers} delay={0.3}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Rank', 'Asset', 'Category', 'Total Supply', 'Change'].map(h => (
                    <th key={h} style={{
                      textAlign: h === 'Total Supply' || h === 'Change' ? 'right' : 'left',
                      padding: '12px 16px', fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'rgba(240,246,243,0.35)',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topAssets.map((asset, idx) => (
                  <motion.tr key={asset.unit}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.06 }}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,224,138,0.03)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 13, color: 'rgba(240,246,243,0.30)' }}>
                      #{asset.rank}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '8px',
                          background: `${CHART_COLORS[idx % CHART_COLORS.length]}12`,
                          border: `1px solid ${CHART_COLORS[idx % CHART_COLORS.length]}25`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 800, color: CHART_COLORS[idx % CHART_COLORS.length],
                        }}>{asset.unit}</div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#f0f6f3' }}>{asset.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '6px', fontSize: 11,
                        fontWeight: 600, background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(240,246,243,0.50)',
                      }}>{asset.category}</span>
                    </td>
                    <td style={{
                      padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace',
                      fontSize: 13, fontWeight: 600, color: '#00e08a',
                    }}>
                      {asset.supply.toLocaleString()}
                    </td>
                    <td style={{
                      padding: '14px 16px', textAlign: 'right', fontSize: 12,
                      fontWeight: 700, color: '#00e08a',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
                    }}>
                      <ArrowUpRight style={{ width: 12, height: 12 }} />
                      {asset.change}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* ── Audit Export ────────────────────────────────────────────── */}
        {assets.filter(a => a.assetId && a.verificationStatus === 'approved').length > 0 && (
          <ChartCard title="Audit Export" icon={FileText} delay={0.35}>
            <p style={{ fontSize: 12, color: 'rgba(240,246,243,0.35)', marginBottom: 16, marginTop: -8 }}>
              Export transaction history for any tokenized asset. Paginated indexer fetch (up to 500 transactions).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {assets.filter(a => a.assetId && a.verificationStatus === 'approved').map(asset => (
                <div key={asset.id} style={{
                  ...glass({
                    borderRadius: '12px', padding: '14px 18px',
                    background: 'rgba(7,17,13,0.40)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }),
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#f0f6f3' }}>{asset.name}</span>
                    <span style={{ marginLeft: 10, fontFamily: 'monospace', fontSize: 11, color: 'rgba(240,246,243,0.35)' }}>
                      ASA #{asset.assetId}
                    </span>
                  </div>
                  <AuditExport asaId={asset.assetId!} assetName={asset.name} network={network} />
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        {/* ── Platform Intelligence Footer ───────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}>
          <div style={{
            ...glass({
              borderRadius: '16px', padding: '26px 30px',
              background: 'rgba(7,17,13,0.40)', border: '1px solid rgba(0,224,138,0.06)',
            }),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Search style={{ width: 18, height: 18, color: '#00e08a' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f0f6f3', margin: 0 }}>
                Platform Intelligence
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Block Finality', value: '~3.3s', desc: 'Average finalization time on Algorand', icon: Timer },
                { label: 'Indexer Lag', value: '<2s', desc: 'Data freshness from chain to dashboard', icon: Zap },
                { label: 'Data Sources', value: '3', desc: 'AlgoNode, Pera, on-chain direct', icon: Database },
                { label: 'Network', value: network || 'Testnet', desc: 'Current connected network', icon: Globe },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '18px', borderRadius: '12px',
                  background: 'rgba(0,224,138,0.02)', border: '1px solid rgba(0,224,138,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <item.icon style={{ width: 14, height: 14, color: 'rgba(0,224,138,0.5)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(240,246,243,0.40)' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#00e08a', marginBottom: 4 }}>{item.value}</div>
                  <div style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(240,246,243,0.30)' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};
