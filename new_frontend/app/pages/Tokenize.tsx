import React, { useState, useRef, useCallback } from 'react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { useNavigate } from 'react-router';
import {
  FileText, Lock, CheckCircle, Wallet,
  Building2, Zap, Leaf, Cpu, Gem, BarChart3,
  Shield, ArrowRight, Layers, Send, Search,
} from 'lucide-react';
import { motion } from 'motion/react';
import { PageTransition } from '../components/motion/MotionSystem';
import { toast } from 'sonner';

// ─── Shared styles ────────────────────────────────────────────────────────
const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  borderRadius: '16px',
  background: 'rgba(7,17,13,0.60)',
  backdropFilter: 'blur(16px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
  border: '1px solid rgba(0,224,138,0.12)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
  ...extra,
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(7,17,13,0.7)',
  backdropFilter: 'blur(8px)',
  color: '#f0f6f3',
  fontSize: '13px',
  fontWeight: 500,
  outline: 'none',
  transition: 'all 0.25s ease',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: 'rgba(240,246,243,0.45)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  marginBottom: '6px',
};

const btnPrimary: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  padding: '14px 24px',
  borderRadius: '12px',
  border: '1px solid rgba(0,224,138,0.4)',
  background: 'linear-gradient(135deg, rgba(0,224,138,0.18), rgba(0,224,138,0.06))',
  color: '#00e08a',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.3px',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
  boxShadow: '0 0 20px rgba(0,224,138,0.08)',
};

// ─── Demo preview cards data ──────────────────────────────────────────────
interface DemoToken {
  name: string;
  unitName: string;
  category: string;
  totalSupply: string;
  fractionSize: string;
  status: 'Demo' | 'Pending' | 'Verified';
  icon: React.FC<{ style?: React.CSSProperties }>;
  accent: string;
  description: string;
}

const DEMO_TOKENS: DemoToken[] = [
  {
    name: 'Warehouse — Phase 1',
    unitName: 'WHS1',
    category: 'Real Estate',
    totalSupply: '500,000',
    fractionSize: '$10 / unit',
    status: 'Verified',
    icon: Building2,
    accent: 'rgba(0,224,138,0.8)',
    description: 'Industrial logistics hub — 240,000 sq ft, triple-net lease, 12-year term.',
  },
  {
    name: 'Solar Microgrid — Austin',
    unitName: 'SLAU',
    category: 'Energy',
    totalSupply: '1,000,000',
    fractionSize: '$5 / unit',
    status: 'Pending',
    icon: Zap,
    accent: 'rgba(250,204,21,0.7)',
    description: 'Distributed solar + battery storage across 14 commercial rooftops.',
  },
  {
    name: 'Reforestation Credits',
    unitName: 'RFST',
    category: 'Carbon Credits',
    totalSupply: '2,000,000',
    fractionSize: '$2 / unit',
    status: 'Demo',
    icon: Leaf,
    accent: 'rgba(34,197,94,0.7)',
    description: 'Voluntary offsets from old-growth reforestation in Central America.',
  },
  {
    name: 'AI Compute Cluster',
    unitName: 'AICC',
    category: 'Equipment',
    totalSupply: '100,000',
    fractionSize: '$50 / unit',
    status: 'Verified',
    icon: Cpu,
    accent: 'rgba(99,102,241,0.7)',
    description: 'GPU farm lease — 512× H100, co-located in Tier-IV data center.',
  },
];

// ─── Flow steps ───────────────────────────────────────────────────────────
const FLOW_STEPS = [
  { label: 'Connect Wallet', icon: Wallet, desc: 'Link your Algorand wallet' },
  { label: 'Define Asset', icon: FileText, desc: 'Set name, supply, metadata' },
  { label: 'Mint ASA', icon: Layers, desc: 'Deploy on-chain token' },
  { label: 'Verify', icon: Shield, desc: 'Submit for compliance review' },
];

// ─── Tilt card ────────────────────────────────────────────────────────────
const TiltCard: React.FC<{
  children: React.ReactNode;
  accent: string;
  index: number;
}> = ({ children, accent, index }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hov, setHov] = useState(false);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setTilt({ x: y * -3.5, y: x * 5 });
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.09, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
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
          scale: hov ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{
          ...glass({
            border: hov ? `1px solid ${accent}` : '1px solid rgba(0,224,138,0.10)',
            boxShadow: hov
              ? `0 18px 44px rgba(0,0,0,0.35), 0 0 24px ${accent.replace(/[\d.]+\)$/, '0.10)')}`
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const Tokenize: React.FC = () => {
  const { address, network } = useAlgorand();
  const { createASA } = useAssetRegistry();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    unitName: '',
    totalSupply: '',
    decimals: '0',
    url: '',
    category: 'real-estate',
    description: '',
    defaultFrozen: false,
    manager: address || '',
    reserve: address || '',
    freeze: address || '',
    clawback: address || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');

  const categories = [
    'real-estate', 'commodities', 'securities',
    'collectibles', 'carbon-credits', 'other',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }
    setStep('review');
  };

  const confirmCreation = async () => {
    setIsSubmitting(true);
    try {
      await createASA({
        name: formData.name,
        unitName: formData.unitName,
        totalSupply: parseInt(formData.totalSupply),
        decimals: parseInt(formData.decimals),
        url: formData.url,
        category: formData.category,
        description: formData.description,
        defaultFrozen: formData.defaultFrozen,
        manager: formData.manager || undefined,
        reserve: formData.reserve || undefined,
        freeze: formData.freeze || undefined,
        clawback: formData.clawback || undefined,
        creator: address,
      });
      setStep('success');
      toast.success('Asset created successfully!');
    } catch (error) {
      toast.error('Failed to create asset');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── SUCCESS SCREEN ─────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <PageTransition>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 0' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            style={glass({ padding: '48px 32px', textAlign: 'center' })}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(0,224,138,0.12)',
              border: '1px solid rgba(0,224,138,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 30px rgba(0,224,138,0.15)',
            }}>
              <CheckCircle style={{ width: '28px', height: '28px', color: '#00e08a' }} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#f0f6f3', marginBottom: '8px' }}>
              Asset Created
            </h2>
            <p style={{
              fontSize: '13px', color: 'rgba(240,246,243,0.5)',
              marginBottom: '28px', lineHeight: 1.6,
            }}>
              Your Algorand Standard Asset has been deployed and submitted for verification review.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/verify')}
                style={{ ...btnPrimary, width: 'auto', padding: '12px 24px' }}
              >
                <Search style={{ width: '14px', height: '14px' }} />
                View Status
              </button>
              <button
                onClick={() => {
                  setStep('form');
                  setFormData({
                    name: '', unitName: '', totalSupply: '', decimals: '0', url: '',
                    category: 'real-estate', description: '', defaultFrozen: false,
                    manager: address || '', reserve: address || '',
                    freeze: address || '', clawback: address || '',
                  });
                }}
                style={{
                  padding: '12px 24px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(240,246,243,0.7)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
              >
                Create Another
              </button>
            </div>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  // ─── REVIEW SCREEN ──────────────────────────────────────────────────────
  if (step === 'review') {
    const fields = [
      { label: 'Asset Name', value: formData.name },
      { label: 'Unit Name', value: formData.unitName },
      { label: 'Total Supply', value: parseInt(formData.totalSupply).toLocaleString() },
      { label: 'Decimals', value: formData.decimals },
      { label: 'Category', value: formData.category.replace('-', ' ') },
      { label: 'Network', value: network },
    ];

    return (
      <PageTransition>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={glass({ padding: '32px', marginBottom: '20px' })}
          >
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f0f6f3', marginBottom: '6px' }}>
              Review & Confirm
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(240,246,243,0.45)' }}>
              Verify all details before deploying to the Algorand blockchain.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={glass({ padding: '24px', marginBottom: '20px' })}
          >
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
            }}>
              {fields.map((f) => (
                <div key={f.label}>
                  <div style={{ ...labelStyle, marginBottom: '4px' }}>{f.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3', textTransform: 'capitalize' as const }}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>

            {formData.description && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={labelStyle}>Description</div>
                <div style={{ fontSize: '13px', color: 'rgba(240,246,243,0.6)', lineHeight: 1.6 }}>
                  {formData.description}
                </div>
              </div>
            )}

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ ...labelStyle, marginBottom: '8px' }}>Role Addresses</div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
                fontSize: '11px', fontFamily: 'monospace', color: 'rgba(240,246,243,0.4)',
              }}>
                <div>Manager: {formData.manager?.slice(0, 8) || 'None'}…</div>
                <div>Reserve: {formData.reserve?.slice(0, 8) || 'None'}…</div>
                <div>Freeze: {formData.freeze?.slice(0, 8) || 'None'}…</div>
                <div>Clawback: {formData.clawback?.slice(0, 8) || 'None'}…</div>
              </div>
            </div>
          </motion.div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setStep('form')}
              style={{
                flex: 1, padding: '14px', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(240,246,243,0.7)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.25s',
              }}
            >
              Back to Edit
            </button>
            <button
              onClick={confirmCreation}
              disabled={isSubmitting}
              style={{
                ...btnPrimary,
                flex: 1,
                opacity: isSubmitting ? 0.5 : 1,
                cursor: isSubmitting ? 'wait' : 'pointer',
              }}
            >
              <Send style={{ width: '14px', height: '14px' }} />
              {isSubmitting ? 'Deploying…' : 'Confirm & Deploy'}
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN PAGE — FORM (wallet connected) OR PREVIEW (wallet not connected)
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <PageTransition>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Hero Header ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            ...glass({ padding: '32px 28px 26px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }),
          }}
        >
          {/* Ambient blobs */}
          <div style={{
            position: 'absolute', top: '-50px', right: '-30px',
            width: '220px', height: '220px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,224,138,0.05), transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#00e08a',
                boxShadow: '0 0 10px rgba(0,224,138,0.5)',
              }} />
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#00e08a',
                letterSpacing: '1.5px', textTransform: 'uppercase',
              }}>
                Asset Creation Studio
              </span>
            </div>
            <h1 style={{
              fontSize: '28px', fontWeight: 800, color: '#f0f6f3',
              letterSpacing: '-0.4px', marginBottom: '6px',
            }}>
              {address ? 'Create Algorand Standard Asset' : 'Tokenize Real-World Assets'}
            </h1>
            <p style={{
              fontSize: '13px', color: 'rgba(240,246,243,0.45)',
              maxWidth: '520px', lineHeight: 1.6,
            }}>
              {address
                ? 'Define asset parameters, deploy on-chain, and submit for compliance verification.'
                : 'Connect your wallet to deploy real assets on Algorand. Preview example assets below.'}
            </p>
          </div>
        </motion.div>

        {/* ── Wallet banner (soft, not a block) ────────────────────── */}
        {!address && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 20px',
              marginBottom: '24px',
              borderRadius: '12px',
              background: 'rgba(0,224,138,0.04)',
              border: '1px solid rgba(0,224,138,0.15)',
            }}
          >
            <Wallet style={{ width: '18px', height: '18px', color: '#00e08a', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'rgba(240,246,243,0.6)', lineHeight: 1.5 }}>
              <strong style={{ color: '#00e08a' }}>Wallet not connected</strong> — 
              Connect your Algorand wallet to create and deploy real tokenized assets.
              Browse demo examples below to understand the system.
            </span>
          </motion.div>
        )}

        {/* ── Tokenization Flow Steps ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          {FLOW_STEPS.map((s, i) => {
            const Icon = s.icon;
            const isComplete = address ? i === 0 : false;
            const isCurrent = address ? i === 1 : i === 0;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 + i * 0.07 }}
                style={{
                  ...glass({
                    padding: '18px 16px',
                    border: isCurrent
                      ? '1px solid rgba(0,224,138,0.3)'
                      : isComplete
                        ? '1px solid rgba(0,224,138,0.2)'
                        : '1px solid rgba(255,255,255,0.05)',
                    background: isCurrent
                      ? 'rgba(0,224,138,0.06)'
                      : 'rgba(7,17,13,0.5)',
                  }),
                  position: 'relative',
                }}
              >
                {/* Step number */}
                <div style={{
                  position: 'absolute', top: '10px', right: '12px',
                  fontSize: '10px', fontWeight: 700,
                  color: isComplete ? '#00e08a' : 'rgba(240,246,243,0.15)',
                }}>
                  {isComplete ? '✓' : `0${i + 1}`}
                </div>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px',
                  background: isCurrent
                    ? 'rgba(0,224,138,0.12)'
                    : isComplete
                      ? 'rgba(0,224,138,0.08)'
                      : 'rgba(255,255,255,0.03)',
                  border: isCurrent
                    ? '1px solid rgba(0,224,138,0.25)'
                    : '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '10px',
                }}>
                  <Icon style={{
                    width: '16px', height: '16px',
                    color: isCurrent || isComplete ? '#00e08a' : 'rgba(240,246,243,0.25)',
                  }} />
                </div>
                <div style={{
                  fontSize: '12px', fontWeight: 700,
                  color: isCurrent ? '#f0f6f3' : isComplete ? '#00e08a' : 'rgba(240,246,243,0.4)',
                  marginBottom: '3px',
                }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(240,246,243,0.3)',
                  lineHeight: 1.4,
                }}>
                  {s.desc}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* WALLET CONNECTED → CREATION FORM                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {address ? (
          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              style={glass({ padding: '24px', marginBottom: '16px' })}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '18px',
              }}>
                <FileText style={{ width: '16px', height: '16px', color: '#00e08a' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3' }}>
                  Basic Information
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Asset Name *</label>
                  <input
                    type="text" name="name" value={formData.name}
                    onChange={handleChange} required maxLength={32}
                    placeholder="e.g., Downtown Office Tower A"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,224,138,0.08)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Unit Name *</label>
                  <input
                    type="text" name="unitName" value={formData.unitName}
                    onChange={handleChange} required maxLength={8}
                    placeholder="e.g., DTOA"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,224,138,0.08)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Total Supply *</label>
                  <input
                    type="number" name="totalSupply" value={formData.totalSupply}
                    onChange={handleChange} required min="1"
                    placeholder="e.g., 1000000"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,224,138,0.08)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Decimals</label>
                  <input
                    type="number" name="decimals" value={formData.decimals}
                    onChange={handleChange} min="0" max="19"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,224,138,0.08)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Category *</label>
                  <select
                    name="category" value={formData.category}
                    onChange={handleChange} required
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} style={{ background: '#07110d' }}>
                        {cat.replace('-', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    name="description" value={formData.description}
                    onChange={handleChange} rows={3}
                    placeholder="Detailed description of the asset..."
                    style={{ ...inputStyle, resize: 'none' as const }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,224,138,0.08)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Metadata URL</label>
                  <input
                    type="url" name="url" value={formData.url}
                    onChange={handleChange} placeholder="https://..."
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,224,138,0.08)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Advanced Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={glass({ padding: '24px', marginBottom: '20px' })}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '18px',
              }}>
                <Lock style={{ width: '16px', height: '16px', color: 'rgba(240,246,243,0.4)' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3' }}>
                  Advanced Settings
                </span>
                <span style={{
                  fontSize: '10px', color: 'rgba(240,246,243,0.3)',
                  marginLeft: '4px', fontWeight: 500,
                }}>Optional</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {(['manager', 'reserve', 'freeze', 'clawback'] as const).map((role) => (
                  <div key={role}>
                    <label style={labelStyle}>{role} Address</label>
                    <input
                      type="text"
                      name={role}
                      value={formData[role]}
                      onChange={handleChange}
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <button type="submit" style={btnPrimary}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.28), rgba(0,224,138,0.10))';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0,224,138,0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.18), rgba(0,224,138,0.06))';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0,224,138,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <ArrowRight style={{ width: '16px', height: '16px' }} />
                Proceed to Review
              </button>
            </motion.div>
          </form>
        ) : (
          /* ═══════════════════════════════════════════════════════════ */
          /* WALLET NOT CONNECTED → DEMO PREVIEW CARDS                 */
          /* ═══════════════════════════════════════════════════════════ */
          <>
            {/* Section label */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <BarChart3 style={{ width: '14px', height: '14px', color: 'rgba(240,246,243,0.25)' }} />
              <span style={{
                fontSize: '12px', fontWeight: 600,
                color: 'rgba(240,246,243,0.35)',
                letterSpacing: '0.5px',
              }}>
                Example Tokenizable Assets — Preview Mode
              </span>
            </motion.div>

            {/* Demo cards grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              {DEMO_TOKENS.map((token, i) => {
                const Icon = token.icon;
                const statusColor = token.status === 'Verified'
                  ? '#00e08a'
                  : token.status === 'Pending'
                    ? '#facc15'
                    : 'rgba(240,246,243,0.35)';
                return (
                  <TiltCard key={token.unitName} accent={token.accent} index={i}>
                    {/* Top accent */}
                    <div style={{
                      height: '2px',
                      background: `linear-gradient(90deg, transparent, ${token.accent}, transparent)`,
                      opacity: 0.5,
                    }} />

                    <div style={{ padding: '20px' }}>
                      {/* Header */}
                      <div style={{
                        display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between', marginBottom: '12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '10px',
                            background: token.accent.replace(/[\d.]+\)$/, '0.10)'),
                            border: `1px solid ${token.accent.replace(/[\d.]+\)$/, '0.20)')}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon style={{
                              width: '18px', height: '18px',
                              color: token.accent.replace(/[\d.]+\)$/, '1)'),
                            }} />
                          </div>
                          <div>
                            <div style={{
                              fontSize: '14px', fontWeight: 700, color: '#f0f6f3',
                              lineHeight: 1.2, marginBottom: '2px',
                            }}>
                              {token.name}
                            </div>
                            <div style={{
                              fontSize: '10px', fontWeight: 600,
                              color: 'rgba(240,246,243,0.3)',
                              letterSpacing: '0.5px',
                            }}>
                              {token.unitName} · {token.category}
                            </div>
                          </div>
                        </div>
                        {/* Status badge */}
                        <div style={{
                          padding: '3px 8px', borderRadius: '5px',
                          border: `1px solid ${statusColor}33`,
                          background: `${statusColor}10`,
                          fontSize: '9px', fontWeight: 700,
                          color: statusColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          {token.status}
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{
                        fontSize: '11px', color: 'rgba(240,246,243,0.35)',
                        lineHeight: 1.5, marginBottom: '14px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {token.description}
                      </p>

                      {/* Stats */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '6px 10px', borderRadius: '6px',
                          background: 'rgba(0,224,138,0.04)',
                          border: '1px solid rgba(255,255,255,0.03)',
                        }}>
                          <span style={{ fontSize: '10px', color: 'rgba(240,246,243,0.4)', fontWeight: 600 }}>
                            Total Supply
                          </span>
                          <span style={{ fontSize: '12px', color: '#f0f6f3', fontWeight: 700 }}>
                            {token.totalSupply}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '6px 10px', borderRadius: '6px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.03)',
                        }}>
                          <span style={{ fontSize: '10px', color: 'rgba(240,246,243,0.4)', fontWeight: 600 }}>
                            Fraction Price
                          </span>
                          <span style={{ fontSize: '12px', color: '#00e08a', fontWeight: 700 }}>
                            {token.fractionSize}
                          </span>
                        </div>
                      </div>

                      {/* CTA */}
                      <button
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '6px', width: '100%',
                          padding: '10px 16px', borderRadius: '8px',
                          border: '1px solid rgba(0,224,138,0.25)',
                          background: 'linear-gradient(135deg, rgba(0,224,138,0.08), rgba(0,224,138,0.02))',
                          color: '#00e08a', fontSize: '11px', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.25s ease',
                          letterSpacing: '0.2px', opacity: 0.8,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.boxShadow = '0 0 14px rgba(0,224,138,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.8';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <Wallet style={{ width: '12px', height: '12px' }} />
                        Connect Wallet to Create
                      </button>
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
};
