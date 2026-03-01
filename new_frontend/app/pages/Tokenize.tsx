import React, { useState, useRef, useCallback } from 'react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry, type PrepareResult } from '../contexts/AssetRegistryContext';
import { useKyc } from '../contexts/KycContext';
import { useNavigate } from 'react-router';
import {
  FileText, Lock, CheckCircle, Wallet,
  Building2, Zap, Leaf, Cpu, Gem, BarChart3,
  Shield, ShieldCheck, ArrowRight, Layers, Send, Search,
  Upload, Link2, Globe, Loader2, Trash2, File, AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { PageTransition } from '../components/motion/MotionSystem';
import { toast } from 'sonner';
import { uploadDocuments, type UploadedDocument } from '../config/firebase';

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
  { label: 'Pin to IPFS', icon: Upload, desc: 'ARC-3 metadata on IPFS' },
  { label: 'Mint ASA', icon: Layers, desc: 'Sign & deploy on-chain' },
  { label: 'Verify Link', icon: Link2, desc: 'ASA ↔ IPFS ↔ DB record' },
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
  const { createASA, prepareTokenization, signAndSubmitASA, confirmTokenization } = useAssetRegistry();
  const { isVerified: kycVerified, kycStatus } = useKyc();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    unitName: '',
    totalSupply: '',
    decimals: '0',
    pricePerUnit: '',
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
  const [step, setStep] = useState<'form' | 'review' | 'minting' | 'success'>('form');

  // Pipeline progress state
  const [mintStep, setMintStep] = useState<'preparing' | 'signing' | 'confirming' | 'done'>('preparing');
  const [prepResult, setPrepResult] = useState<PrepareResult | null>(null);
  const [mintResult, setMintResult] = useState<{ txId: string; asaId: number; recordId: string } | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  // Document upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ fileIndex: number; percent: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'real-estate', 'energy', 'commodities', 'infrastructure',
    'securities', 'other',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Document upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file
    const allowed = files.filter(f => {
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name} exceeds 10 MB limit`);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...allowed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeUploadedDoc = (index: number) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadDocuments = async () => {
    if (!address || selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress(null);
    try {
      const docs = await uploadDocuments(selectedFiles, address, (fileIndex, percent) => {
        setUploadProgress({ fileIndex, percent });
      });
      setUploadedDocs(prev => [...prev, ...docs]);
      setSelectedFiles([]);
      toast.success(`${docs.length} document(s) uploaded successfully`);
    } catch (err: any) {
      toast.error(err.message || 'Document upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (uploadedDocs.length === 0) {
      toast.error('Please upload at least one supporting document (e.g., property deed, certificate)');
      return;
    }
    setStep('review');
  };

  const confirmCreation = async () => {
    if (!address) return;
    setIsSubmitting(true);
    setStep('minting');
    setMintStep('preparing');
    setMintError(null);

    try {
      // ── STEP 1: Prepare — IPFS pin + unsigned txn ─────
      toast.info('Pinning ARC-3 metadata to IPFS...');
      const prep = await prepareTokenization({
        name: formData.name,
        unitName: formData.unitName,
        totalSupply: parseInt(formData.totalSupply),
        decimals: parseInt(formData.decimals),
        pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : undefined,
        url: formData.url,
        category: formData.category,
        description: formData.description,
        defaultFrozen: formData.defaultFrozen,
        manager: formData.manager || undefined,
        reserve: formData.reserve || undefined,
        freeze: formData.freeze || undefined,
        clawback: formData.clawback || undefined,
        creator: address,
        supportingDocuments: uploadedDocs.map(d => ({
          name: d.name,
          url: d.url,
          type: d.type,
          size: d.size,
        })),
      });
      setPrepResult(prep);
      toast.success(`IPFS pinned — CID: ${prep.ipfs.cid.slice(0, 12)}...`);

      // ── STEP 2: Sign with wallet ──────────────────────
      setMintStep('signing');
      toast.info('Please sign the transaction in your wallet...');
      const { txId, asaId } = await signAndSubmitASA(prep.unsignedTxn);
      toast.success(`ASA created on-chain — ID: ${asaId}`);

      // ── STEP 3: Confirm — link ASA ↔ IPFS ↔ DB ───────
      setMintStep('confirming');
      toast.info('Linking ASA to database record...');
      await confirmTokenization(prep.assetRecordId, txId, asaId);

      setMintResult({ txId, asaId, recordId: prep.assetRecordId });
      setMintStep('done');
      setStep('success');
      toast.success('Asset fully tokenized on Algorand!');
    } catch (error: any) {
      const msg = error?.message || 'Tokenization failed';
      setMintError(msg);
      toast.error(msg);
      console.error('Tokenization error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── MINTING PROGRESS SCREEN ─────────────────────────────────────────
  if (step === 'minting') {
    const steps = [
      { key: 'preparing', label: 'Pinning ARC-3 Metadata to IPFS', icon: Upload },
      { key: 'signing', label: 'Sign Transaction in Wallet', icon: Wallet },
      { key: 'confirming', label: 'Linking ASA ↔ IPFS ↔ DB Record', icon: Link2 },
    ];
    const stageOrder = ['preparing', 'signing', 'confirming', 'done'];
    const currentIdx = stageOrder.indexOf(mintStep);

    return (
      <PageTransition>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 0' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={glass({ padding: '48px 32px', textAlign: 'center' })}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(0,224,138,0.12)',
              border: '1px solid rgba(0,224,138,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'spin 2s linear infinite',
            }}>
              <Loader2 style={{ width: '28px', height: '28px', color: '#00e08a', animation: 'spin 1s linear infinite' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f0f6f3', marginBottom: '24px' }}>
              Tokenizing Asset...
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              {steps.map((s, i) => {
                const isDone = currentIdx > i;
                const isCurrent = stageOrder[i] === mintStep;
                const Icon = s.icon;
                return (
                  <div key={s.key} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', borderRadius: '10px',
                    background: isCurrent ? 'rgba(0,224,138,0.06)' : 'rgba(255,255,255,0.02)',
                    border: isCurrent ? '1px solid rgba(0,224,138,0.2)' : '1px solid rgba(255,255,255,0.04)',
                    transition: 'all 0.3s',
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: isDone ? 'rgba(0,224,138,0.12)' : 'rgba(255,255,255,0.03)',
                      border: isDone ? '1px solid rgba(0,224,138,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isDone
                        ? <CheckCircle style={{ width: '16px', height: '16px', color: '#00e08a' }} />
                        : isCurrent
                          ? <Loader2 style={{ width: '16px', height: '16px', color: '#00e08a', animation: 'spin 1s linear infinite' }} />
                          : <Icon style={{ width: '16px', height: '16px', color: 'rgba(240,246,243,0.2)' }} />}
                    </div>
                    <span style={{
                      fontSize: '13px', fontWeight: 600,
                      color: isDone ? '#00e08a' : isCurrent ? '#f0f6f3' : 'rgba(240,246,243,0.35)',
                    }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {mintError && (
              <div style={{
                marginTop: '20px', padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontSize: '12px', textAlign: 'left',
              }}>
                <strong>Error:</strong> {mintError}
                <button
                  onClick={() => { setStep('review'); setMintError(null); }}
                  style={{
                    display: 'block', marginTop: '8px', padding: '6px 14px',
                    borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Go Back & Retry
                </button>
              </div>
            )}

            {prepResult && (
              <div style={{
                marginTop: '16px', padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(0,224,138,0.04)', border: '1px solid rgba(0,224,138,0.1)',
                fontSize: '11px', color: 'rgba(240,246,243,0.5)', textAlign: 'left',
              }}>
                IPFS CID: <span style={{ color: '#00e08a', fontFamily: 'monospace' }}>{prepResult.ipfs.cid}</span>
              </div>
            )}
          </motion.div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </PageTransition>
    );
  }

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
              Asset Fully Tokenized
            </h2>
            <p style={{
              fontSize: '13px', color: 'rgba(240,246,243,0.5)',
              marginBottom: '20px', lineHeight: 1.6,
            }}>
              Your Algorand Standard Asset has been minted on-chain, metadata pinned to IPFS,
              and linked to the platform database.
            </p>

            {/* On-chain details */}
            {mintResult && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '6px',
                marginBottom: '24px', textAlign: 'left',
                padding: '16px', borderRadius: '12px',
                background: 'rgba(0,224,138,0.04)',
                border: '1px solid rgba(0,224,138,0.12)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(240,246,243,0.4)', fontWeight: 600 }}>ASA ID</span>
                  <span style={{ fontSize: '12px', color: '#00e08a', fontWeight: 700, fontFamily: 'monospace' }}>
                    {mintResult.asaId}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(240,246,243,0.4)', fontWeight: 600 }}>TX ID</span>
                  <span style={{ fontSize: '11px', color: '#f0f6f3', fontFamily: 'monospace' }}>
                    {mintResult.txId.slice(0, 16)}...
                  </span>
                </div>
                {prepResult && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(240,246,243,0.4)', fontWeight: 600 }}>IPFS CID</span>
                    <span style={{ fontSize: '11px', color: '#f0f6f3', fontFamily: 'monospace' }}>
                      {prepResult.ipfs.cid.slice(0, 16)}...
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(240,246,243,0.4)', fontWeight: 600 }}>Network</span>
                  <span style={{ fontSize: '11px', color: '#f0f6f3', fontWeight: 600, textTransform: 'uppercase' }}>
                    {network}
                  </span>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <a
                    href={`https://testnet.algoexplorer.io/asset/${mintResult.asaId}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', textAlign: 'center',
                      background: 'rgba(0,224,138,0.08)', border: '1px solid rgba(0,224,138,0.2)',
                      color: '#00e08a', fontSize: '10px', fontWeight: 700, textDecoration: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    }}
                  >
                    <Globe style={{ width: '12px', height: '12px' }} /> Explorer
                  </a>
                  {prepResult && (
                    <a
                      href={prepResult.ipfs.gatewayUrl}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', textAlign: 'center',
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                        color: '#818cf8', fontSize: '10px', fontWeight: 700, textDecoration: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      }}
                    >
                      <Upload style={{ width: '12px', height: '12px' }} /> IPFS Metadata
                    </a>
                  )}
                </div>
              </div>
            )}

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
                  setMintResult(null);
                  setPrepResult(null);
                  setFormData({
                    name: '', unitName: '', totalSupply: '', decimals: '0', pricePerUnit: '', url: '',
                    category: 'real-estate', description: '', defaultFrozen: false,
                    manager: address || '', reserve: address || '',
                    freeze: address || '', clawback: address || '',
                  });
                  setUploadedDocs([]);
                  setSelectedFiles([]);
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
      { label: 'Price Per Token', value: formData.pricePerUnit ? `${parseFloat(formData.pricePerUnit)} ALGO` : '—' },
      { label: 'Total Asset Value', value: formData.pricePerUnit && formData.totalSupply ? `${(parseFloat(formData.totalSupply) * parseFloat(formData.pricePerUnit)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ALGO` : '—' },
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

            {/* Uploaded documents */}
            {uploadedDocs.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ ...labelStyle, marginBottom: '8px' }}>
                  Supporting Documents ({uploadedDocs.length})
                </div>
                {uploadedDocs.map((doc, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', marginBottom: '4px',
                    borderRadius: '6px', background: 'rgba(0,224,138,0.04)',
                    border: '1px solid rgba(0,224,138,0.1)',
                  }}>
                    <CheckCircle style={{ width: '12px', height: '12px', color: '#00e08a', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#f0f6f3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(240,246,243,0.3)' }}>
                      {(doc.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginTop: '8px', padding: '8px 10px',
                  borderRadius: '6px', background: 'rgba(255,170,50,0.04)',
                  border: '1px solid rgba(255,170,50,0.1)',
                }}>
                  <AlertCircle style={{ width: '12px', height: '12px', color: '#ffaa32', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: 'rgba(240,246,243,0.5)' }}>
                    Documents will be reviewed by an admin. Asset will appear on marketplace only after approval.
                  </span>
                </div>
              </div>
            )}
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
              disabled={isSubmitting || !kycVerified}
              title={!kycVerified ? 'Complete KYC verification first' : undefined}
              style={{
                ...btnPrimary,
                flex: 1,
                opacity: (isSubmitting || !kycVerified) ? 0.5 : 1,
                cursor: isSubmitting ? 'wait' : !kycVerified ? 'not-allowed' : 'pointer',
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

        {/* ── KYC Gate Banner ──────────────────────────────────────── */}
        {address && !kycVerified && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              borderRadius: '12px',
              background: 'rgba(255,170,50,0.06)',
              border: '1px solid rgba(255,170,50,0.25)',
            }}
          >
            <ShieldCheck style={{ width: '20px', height: '20px', color: '#ffaa32', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '13px', color: 'rgba(240,246,243,0.7)', lineHeight: 1.5 }}>
                <strong style={{ color: '#ffaa32' }}>
                  {kycStatus?.status === 'PENDING' ? 'KYC Pending Review' : 'KYC Verification Required'}
                </strong>
                {' — '}
                {kycStatus?.status === 'PENDING'
                  ? 'Your identity verification is under review. You will be able to tokenize once approved.'
                  : kycStatus?.status === 'REJECTED'
                    ? 'Your KYC was rejected. Please re-submit with valid information.'
                    : 'Complete biometric identity verification before creating tokenized assets.'}
              </span>
            </div>
            <button
              onClick={() => navigate('/kyc')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: 'rgba(255,170,50,0.15)',
                border: '1px solid rgba(255,170,50,0.3)',
                color: '#ffaa32',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
              }}
            >
              {kycStatus?.status === 'PENDING' ? 'VIEW STATUS' : kycStatus?.status === 'REJECTED' ? 'RETRY KYC' : 'START KYC'}
            </button>
          </motion.div>
        )}

        {/* ── Tokenization Flow Steps ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '10px',
            marginBottom: '32px',
          }}
        >
          {FLOW_STEPS.map((s, i) => {
            const Icon = s.icon;
            // Determine which step we're on
            let activeStep = 0;
            if (address) activeStep = 1;
            if (step === 'review') activeStep = 2;
            if (step === 'minting' && mintStep === 'preparing') activeStep = 2;
            if (step === 'minting' && mintStep === 'signing') activeStep = 3;
            if (step === 'minting' && mintStep === 'confirming') activeStep = 4;
            if (step === 'success') activeStep = 5;
            const isComplete = i < activeStep;
            const isCurrent = i === activeStep;
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
                <div>
                  <label style={labelStyle}>Price Per Token (ALGO) *</label>
                  <input
                    type="number" name="pricePerUnit" value={formData.pricePerUnit}
                    onChange={handleChange} required min="0" step="0.001"
                    placeholder="e.g., 10"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,224,138,0.08)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                {formData.totalSupply && formData.pricePerUnit && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: 'rgba(0,224,138,0.05)',
                      border: '1px solid rgba(0,224,138,0.15)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(240,246,243,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Total Asset Value
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#00e08a' }}>
                        {(parseFloat(formData.totalSupply) * parseFloat(formData.pricePerUnit)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ALGO
                      </span>
                    </div>
                  </div>
                )}
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

            {/* ── Supporting Documents ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
              style={glass({ padding: '24px', marginBottom: '20px' })}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '6px',
              }}>
                <Upload style={{ width: '16px', height: '16px', color: '#00e08a' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f6f3' }}>
                  Supporting Documents
                </span>
                <span style={{
                  fontSize: '10px', color: '#00e08a',
                  marginLeft: '4px', fontWeight: 700,
                  background: 'rgba(0,224,138,0.1)',
                  padding: '2px 8px', borderRadius: '4px',
                }}>REQUIRED</span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(240,246,243,0.4)', marginBottom: '16px', lineHeight: 1.5 }}>
                Upload property deeds, certificates, legal documents, or any supporting evidence.
                Documents will be reviewed by an admin before your asset is approved for marketplace listing.
              </p>

              {/* Upload area */}
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(0,224,138,0.2)',
                  borderRadius: '12px',
                  padding: '28px 20px',
                  textAlign: 'center',
                  cursor: isUploading ? 'wait' : 'pointer',
                  background: 'rgba(0,224,138,0.02)',
                  transition: 'all 0.25s',
                  marginBottom: '14px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)'; e.currentTarget.style.background = 'rgba(0,224,138,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.2)'; e.currentTarget.style.background = 'rgba(0,224,138,0.02)'; }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <Upload style={{ width: '24px', height: '24px', color: 'rgba(0,224,138,0.5)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(240,246,243,0.6)' }}>
                  Click to select files
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(240,246,243,0.3)', marginTop: '4px' }}>
                  PDF, DOC, JPG, PNG — Max 10 MB each
                </div>
              </div>

              {/* Pending files (not yet uploaded) */}
              {selectedFiles.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(240,246,243,0.45)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Ready to Upload ({selectedFiles.length})
                  </div>
                  {selectedFiles.map((file, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', marginBottom: '6px',
                      borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <File style={{ width: '14px', height: '14px', color: 'rgba(240,246,243,0.4)', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#f0f6f3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(240,246,243,0.3)', flexShrink: 0 }}>
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '4px', display: 'flex',
                        }}
                      >
                        <Trash2 style={{ width: '13px', height: '13px', color: 'rgba(255,100,100,0.6)' }} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleUploadDocuments}
                    disabled={isUploading}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      width: '100%', padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,224,138,0.3)',
                      background: 'rgba(0,224,138,0.08)',
                      color: '#00e08a',
                      fontSize: '12px', fontWeight: 700,
                      cursor: isUploading ? 'wait' : 'pointer',
                      marginTop: '8px',
                      transition: 'all 0.25s',
                    }}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                        Uploading {uploadProgress ? `(${uploadProgress.percent}%)` : '...'}
                      </>
                    ) : (
                      <>
                        <Upload style={{ width: '14px', height: '14px' }} />
                        Upload {selectedFiles.length} Document{selectedFiles.length > 1 ? 's' : ''} to Firebase
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Already uploaded documents */}
              {uploadedDocs.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#00e08a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Uploaded Documents ({uploadedDocs.length})
                  </div>
                  {uploadedDocs.map((doc, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', marginBottom: '6px',
                      borderRadius: '8px', background: 'rgba(0,224,138,0.04)',
                      border: '1px solid rgba(0,224,138,0.15)',
                    }}>
                      <CheckCircle style={{ width: '14px', height: '14px', color: '#00e08a', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#f0f6f3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(240,246,243,0.3)', flexShrink: 0 }}>
                        {(doc.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeUploadedDoc(i); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '4px', display: 'flex',
                        }}
                      >
                        <Trash2 style={{ width: '13px', height: '13px', color: 'rgba(255,100,100,0.6)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Warning if no docs uploaded */}
              {uploadedDocs.length === 0 && selectedFiles.length === 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px', borderRadius: '8px',
                  background: 'rgba(255,170,50,0.06)',
                  border: '1px solid rgba(255,170,50,0.15)',
                }}>
                  <AlertCircle style={{ width: '14px', height: '14px', color: '#ffaa32', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: 'rgba(240,246,243,0.5)' }}>
                    At least one supporting document is required. Admin will review before marketplace approval.
                  </span>
                </div>
              )}
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
