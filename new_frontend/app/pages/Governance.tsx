import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useGovernance, Proposal } from '../contexts/GovernanceContext';
import {
  Vote, Clock, CheckCircle, XCircle, AlertCircle, Plus,
  Gavel, ShieldCheck, Users, BarChart3, Sparkles, FileText,
  ThumbsUp, ThumbsDown, Timer, Megaphone, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { PageTransition } from '../components/motion/MotionSystem';
import { toast } from 'sonner';

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
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(7,17,13,0.7)',
  backdropFilter: 'blur(8px)',
  color: '#f0f6f3',
  fontSize: '14px',
  fontWeight: 500,
  outline: 'none',
  transition: 'all 0.25s ease',
};

/* ─── Status helpers ───────────────────────────────────────────────────── */

const STATUS_META: Record<string, { color: string; glow: string; bg: string; icon: React.FC<{ style?: React.CSSProperties }> }> = {
  active:   { color: '#00e08a', glow: 'rgba(0,224,138,0.35)', bg: 'rgba(0,224,138,0.10)', icon: Clock },
  passed:   { color: '#2dd4bf', glow: 'rgba(45,212,191,0.35)', bg: 'rgba(45,212,191,0.10)', icon: CheckCircle },
  rejected: { color: '#f87171', glow: 'rgba(248,113,113,0.30)', bg: 'rgba(248,113,113,0.10)', icon: XCircle },
  expired:  { color: '#94a3b8', glow: 'rgba(148,163,184,0.20)', bg: 'rgba(148,163,184,0.08)', icon: AlertCircle },
};

const TYPE_META: Record<string, { color: string; label: string }> = {
  parameter:       { color: '#60a5fa', label: 'Parameter Change' },
  'asset-approval':{ color: '#a78bfa', label: 'Asset Approval' },
  governance:      { color: '#00e08a', label: 'Governance' },
  emergency:       { color: '#fb923c', label: 'Emergency' },
};

/* ─── Demo proposals (shown when context is empty) ─────────────────────── */

const DEMO_PROPOSALS: Proposal[] = [
  {
    id: 'demo_1', title: 'Increase Maximum Asset Fractionalization Limit',
    description: 'Raise the ceiling for fractionalized asset tokens from 1M to 10M units, enabling larger real-world assets like commercial buildings and infrastructure bonds to be tokenized on-chain with finer granularity.',
    proposer: 'ALGO7X...Q4RWYZ', createdAt: new Date('2026-02-20'),
    votingEnds: new Date('2026-03-06'), status: 'active',
    votesFor: 487200, votesAgainst: 112800, totalVotingPower: 1000000,
    quorumRequired: 510000, type: 'parameter',
    votes: [{ voter: 'ALGO7X', vote: 'for', weight: 5000, timestamp: new Date() }],
  },
  {
    id: 'demo_2', title: 'Approve Manhattan Commercial REIT Token',
    description: 'Whitelist the Manhattan Commercial REIT (MCREIT) for trading on the AssetLinked marketplace. The underlying asset is a Class-A office complex valued at $42M with verified legal encumbrance clearance.',
    proposer: 'ALGOKP...M8BLNX', createdAt: new Date('2026-02-18'),
    votingEnds: new Date('2026-03-04'), status: 'active',
    votesFor: 623400, votesAgainst: 76600, totalVotingPower: 1000000,
    quorumRequired: 510000, type: 'asset-approval',
    votes: [{ voter: 'ALGOKP', vote: 'for', weight: 8000, timestamp: new Date() }],
  },
  {
    id: 'demo_3', title: 'Implement Tiered Fee Schedule for High-Volume Traders',
    description: 'Introduce a 3-tier fee structure (Standard 0.25%, Silver 0.15%, Gold 0.08%) to incentivize institutional liquidity providers and reward volume-based market participation.',
    proposer: 'ALGOZM...Y2KFHX', createdAt: new Date('2026-02-10'),
    votingEnds: new Date('2026-02-24'), status: 'passed',
    votesFor: 742000, votesAgainst: 158000, totalVotingPower: 1000000,
    quorumRequired: 510000, type: 'governance',
    votes: [],
  },
  {
    id: 'demo_4', title: 'Emergency: Pause Trading on Suspicious Asset XFRAUD',
    description: 'Immediately halt all trading activity for the XFRAUD token pending a full audit. On-chain analysis indicates potential wash-trading patterns and unverified collateral documentation.',
    proposer: 'ALGOSF...T9PRVW', createdAt: new Date('2026-02-08'),
    votingEnds: new Date('2026-02-12'), status: 'rejected',
    votesFor: 198000, votesAgainst: 602000, totalVotingPower: 1000000,
    quorumRequired: 510000, type: 'emergency',
    votes: [],
  },
  {
    id: 'demo_5', title: 'Add Support for Cross-Chain Bridged Assets',
    description: 'Enable bridged tokens from Ethereum and Polygon to be listed and traded on the AssetLinked marketplace, expanding the universe of tokenized real-world assets available to Algorand users.',
    proposer: 'ALGOMN...W3JXKL', createdAt: new Date('2026-02-15'),
    votingEnds: new Date('2026-03-01'), status: 'active',
    votesFor: 312000, votesAgainst: 288000, totalVotingPower: 1000000,
    quorumRequired: 510000, type: 'governance',
    votes: [],
  },
];

/* ─── TiltCard ─────────────────────────────────────────────────────────── */

const TiltCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 6;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -6;
    el.style.transform = `perspective(600px) rotateX(${y}deg) rotateY(${x}deg) scale3d(1.01,1.01,1)`;
  }, []);
  const handleLeave = useCallback(() => {
    const el = ref.current; if (!el) return;
    el.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale3d(1,1,1)';
  }, []);
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ transition: 'transform 0.35s cubic-bezier(.17,.67,.35,.96)', willChange: 'transform', ...style }}
      className={className}>
      {children}
    </div>
  );
};

/* ─── StatCard ─────────────────────────────────────────────────────────── */

const StatCard: React.FC<{
  icon: React.FC<{ style?: React.CSSProperties }>;
  label: string; value: string | number; color: string; delay: number;
}> = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [.17,.67,.35,.96] }}>
    <TiltCard>
      <div style={{
        ...glass({ border: `1px solid ${color}22`, boxShadow: `0 0 20px ${color}15` }),
        padding: '24px', position: 'relative', overflow: 'hidden',
      }}>
        {/* ambient glow */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80,
          borderRadius: '50%', background: `radial-gradient(circle, ${color}18, transparent 70%)`,
          pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '12px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: `${color}14`,
            border: `1px solid ${color}30` }}>
            <Icon style={{ width: 20, height: 20, color }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'rgba(240,246,243,0.50)' }}>{label}</span>
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</div>
      </div>
    </TiltCard>
  </motion.div>
);

/* ─── Animated Vote Bar ────────────────────────────────────────────────── */

const VoteBar: React.FC<{ percentage: number; color: string; label: string; votes: number; delay?: number }> = ({
  percentage, color, label, votes, delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'rgba(240,246,243,0.7)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(240,246,243,0.5)' }}>
          {votes.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.04)',
        overflow: 'hidden', position: 'relative' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${percentage}%` } : { width: 0 }}
          transition={{ duration: 1.1, delay: delay + 0.2, ease: [.17,.67,.35,.96] }}
          style={{ height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            boxShadow: `0 0 12px ${color}50`, position: 'relative' }}
        />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════ */

export const Governance: React.FC = () => {
  const { address } = useAlgorand();
  const { proposals: ctxProposals, createProposal, castVote } = useGovernance();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'passed' | 'rejected'>('active');

  const [newProposal, setNewProposal] = useState({
    title: '', description: '',
    type: 'governance' as Proposal['type'],
    votingDays: 7, quorumPercentage: 51,
  });

  // Use demo data when context is empty
  const isDemo = ctxProposals.length === 0;
  const proposals = isDemo ? DEMO_PROPOSALS : ctxProposals;

  const filteredProposals = useMemo(() =>
    proposals.filter(p => filter === 'all' || p.status === filter),
    [proposals, filter],
  );

  const stats = useMemo(() => ({
    total: proposals.length,
    active: proposals.filter(p => p.status === 'active').length,
    passed: proposals.filter(p => p.status === 'passed').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  }), [proposals]);

  /* ── handlers ────────────────────────────────────────────────────────── */

  const handleCreateProposal = () => {
    if (!address) { toast.error('Please connect your wallet'); return; }
    const votingEnds = new Date();
    votingEnds.setDate(votingEnds.getDate() + newProposal.votingDays);
    createProposal({
      title: newProposal.title, description: newProposal.description,
      proposer: address, votingEnds, totalVotingPower: 1000000,
      quorumRequired: (newProposal.quorumPercentage / 100) * 1000000,
      type: newProposal.type,
    });
    toast.success('Proposal created successfully');
    setShowCreateModal(false);
    setNewProposal({ title: '', description: '', type: 'governance', votingDays: 7, quorumPercentage: 51 });
  };

  const handleVote = (proposalId: string, vote: 'for' | 'against') => {
    if (isDemo) { toast.info('Connect wallet to vote on live proposals'); return; }
    if (!address) { toast.error('Please connect your wallet'); return; }
    try {
      const votingWeight = Math.floor(Math.random() * 10000) + 1000;
      castVote(proposalId, address, vote, votingWeight);
      toast.success(`Vote cast: ${vote.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cast vote');
    }
  };

  /* ── filter config ───────────────────────────────────────────────────── */
  const FILTERS = [
    { key: 'all' as const, label: 'All', icon: BarChart3 },
    { key: 'active' as const, label: 'Active', icon: Clock },
    { key: 'passed' as const, label: 'Passed', icon: CheckCircle },
    { key: 'rejected' as const, label: 'Rejected', icon: XCircle },
  ];

  /* ═══════════════════════════════════════════════════════════════════════ */

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 40 }}>

        {/* ── Glass Hero Header ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [.17,.67,.35,.96] }}>
          <div style={{
            ...glass({ borderRadius: '20px', padding: '32px 36px', position: 'relative', overflow: 'hidden',
              border: '1px solid rgba(0,224,138,0.18)',
              boxShadow: '0 0 40px rgba(0,224,138,0.06), 0 8px 32px rgba(0,0,0,0.3)' }),
          }}>
            {/* ambient glow */}
            <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,224,138,0.08), transparent 70%)',
              pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: 60, width: 160, height: 160,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,212,191,0.05), transparent 70%)',
              pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '14px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,224,138,0.10)', border: '1px solid rgba(0,224,138,0.25)' }}>
                  <Gavel style={{ width: 24, height: 24, color: '#00e08a' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#f0f6f3', margin: 0 }}>
                    Governance
                  </h1>
                  <p style={{ fontSize: 13, color: 'rgba(240,246,243,0.45)', marginTop: 4 }}>
                    On-chain voting &amp; protocol governance — transparent, immutable, community-driven
                  </p>
                </div>
              </div>

              {/* Demo badge */}
              {isDemo && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{ padding: '6px 14px', borderRadius: '20px',
                    background: 'rgba(0,224,138,0.08)', border: '1px solid rgba(0,224,138,0.20)',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'rgba(0,224,138,0.7)',
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles style={{ width: 12, height: 12 }} /> Demo Governance
                </motion.div>
              )}

              {/* New Proposal CTA */}
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => address ? setShowCreateModal(true) : toast.error('Please connect your wallet')}
                style={{ display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: '14px', cursor: 'pointer',
                  background: 'rgba(0,224,138,0.12)', border: '1px solid rgba(0,224,138,0.30)',
                  color: '#00e08a', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
                  transition: 'all 0.25s ease',
                  opacity: address ? 1 : 0.5,
                }}>
                <Plus style={{ width: 16, height: 16 }} /> New Proposal
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Wallet-not-connected banner ─────────────────────────────── */}
        {!address && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ ...glass({ borderRadius: '14px', padding: '16px 22px',
              border: '1px solid rgba(0,224,138,0.15)',
              background: 'rgba(0,224,138,0.04)' }),
              display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
              color: 'rgba(240,246,243,0.6)' }}>
            <ShieldCheck style={{ width: 18, height: 18, color: '#00e08a', flexShrink: 0 }} />
            <span>Connect your wallet to create proposals and cast votes. Viewing demo governance data below.</span>
          </motion.div>
        )}

        {/* ── Stat Cards ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard icon={FileText} label="Total Proposals" value={stats.total} color="#f0f6f3" delay={0.1} />
          <StatCard icon={Clock} label="Active" value={stats.active} color="#00e08a" delay={0.2} />
          <StatCard icon={CheckCircle} label="Passed" value={stats.passed} color="#2dd4bf" delay={0.3} />
          <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="#f87171" delay={0.4} />
        </div>

        {/* ── Filter Tabs ────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}>
          <div style={{
            ...glass({ borderRadius: '14px', padding: '8px', display: 'flex', gap: 6, flexWrap: 'wrap' }),
          }}>
            {FILTERS.map(f => {
              const active = filter === f.key;
              const FIcon = f.icon;
              return (
                <motion.button key={f.key} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setFilter(f.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', borderRadius: '10px',
                    border: active ? '1px solid rgba(0,224,138,0.35)' : '1px solid transparent',
                    background: active ? 'rgba(0,224,138,0.12)' : 'transparent',
                    color: active ? '#00e08a' : 'rgba(240,246,243,0.50)',
                    fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    boxShadow: active ? '0 0 16px rgba(0,224,138,0.10)' : 'none',
                  }}>
                  <FIcon style={{ width: 15, height: 15 }} />
                  {f.label}
                  {f.key !== 'all' && (
                    <span style={{ fontSize: 11, opacity: 0.6, marginLeft: -2 }}>
                      {f.key === 'active' ? stats.active : f.key === 'passed' ? stats.passed : stats.rejected}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Proposals ──────────────────────────────────────────────── */}
        {filteredProposals.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}>
            <div style={{ ...glass({ padding: '60px 32px', textAlign: 'center' as const }) }}>
              <motion.div animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <Sparkles style={{ width: 48, height: 48, color: 'rgba(0,224,138,0.30)', margin: '0 auto 16px' }} />
              </motion.div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f0f6f3', marginBottom: 8 }}>
                No {filter === 'all' ? '' : filter} proposals found
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(240,246,243,0.40)', maxWidth: 360, margin: '0 auto' }}>
                {filter === 'all'
                  ? 'Be the first to shape the protocol — create a proposal above.'
                  : `No proposals with "${filter}" status. Try a different filter.`}
              </p>
            </div>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {filteredProposals.map((proposal, idx) => {
              const totalVotes = proposal.votesFor + proposal.votesAgainst;
              const forPct = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
              const againstPct = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;
              const quorumPct = (totalVotes / proposal.totalVotingPower) * 100;
              const hasVoted = address ? proposal.votes.some(v => v.voter === address) : false;
              const sm = STATUS_META[proposal.status] || STATUS_META.active;
              const tm = TYPE_META[proposal.type] || TYPE_META.governance;
              const SIcon = sm.icon;

              return (
                <motion.div key={proposal.id}
                  initial={{ opacity: 0, y: 30, x: idx % 2 === 0 ? -12 : 12 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ delay: 0.15 * idx, duration: 0.55, ease: [.17,.67,.35,.96] }}>
                  <TiltCard>
                    <div style={{
                      ...glass({
                        padding: '28px 30px',
                        border: `1px solid ${sm.color}25`,
                        boxShadow: `0 0 24px ${sm.glow}`,
                        position: 'relative', overflow: 'hidden',
                      }),
                    }}>
                      {/* ambient card glow */}
                      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                        borderRadius: '50%', background: `radial-gradient(circle, ${sm.color}0a, transparent 70%)`,
                        pointerEvents: 'none' }} />

                      {/* Top row: status badge + type + meta */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Title */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                            <SIcon style={{ width: 20, height: 20, color: sm.color, flexShrink: 0 }} />
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f0f6f3', margin: 0 }}>
                              {proposal.title}
                            </h3>
                          </div>
                          {/* Description */}
                          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(240,246,243,0.50)',
                            margin: '0 0 14px 30px', maxWidth: 600 }}>
                            {proposal.description}
                          </p>
                          {/* Meta row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginLeft: 30 }}>
                            {/* Type badge */}
                            <span style={{ padding: '4px 12px', borderRadius: '8px', fontSize: 11, fontWeight: 700,
                              letterSpacing: '0.04em', background: `${tm.color}14`,
                              border: `1px solid ${tm.color}30`, color: tm.color }}>
                              {tm.label}
                            </span>
                            {/* Proposer */}
                            <span style={{ fontSize: 11, color: 'rgba(240,246,243,0.35)', fontFamily: 'monospace' }}>
                              {typeof proposal.proposer === 'string' && proposal.proposer.length > 12
                                ? `${proposal.proposer.slice(0, 8)}…${proposal.proposer.slice(-6)}`
                                : proposal.proposer}
                            </span>
                            {/* End date */}
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                              color: 'rgba(240,246,243,0.35)' }}>
                              <Timer style={{ width: 12, height: 12 }} />
                              {proposal.votingEnds.toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{
                            padding: '6px 16px', borderRadius: '10px', fontSize: 12, fontWeight: 800,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            background: sm.bg, color: sm.color,
                            border: `1px solid ${sm.color}30`,
                            boxShadow: `0 0 12px ${sm.glow}`,
                          }}>
                            {proposal.status}
                          </span>
                          {hasVoted && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#00e08a',
                              display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle style={{ width: 12, height: 12 }} /> Voted
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vote Bars */}
                      <div style={{ ...glass({ borderRadius: '12px', padding: '18px 20px',
                        background: 'rgba(7,17,13,0.45)' }),
                        display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
                        <VoteBar percentage={forPct} color="#00e08a" label="For" votes={proposal.votesFor} delay={0.1 * idx} />
                        <VoteBar percentage={againstPct} color="#f87171" label="Against" votes={proposal.votesAgainst} delay={0.1 * idx + 0.15} />

                        {/* Quorum */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4,
                          display: 'flex', justifyContent: 'space-between', fontSize: 11,
                          color: 'rgba(240,246,243,0.35)' }}>
                          <span>Quorum: {quorumPct.toFixed(1)}% / {(proposal.quorumRequired / proposal.totalVotingPower * 100).toFixed(0)}% required</span>
                          <span>Total: {totalVotes.toLocaleString()} votes</span>
                        </div>
                      </div>

                      {/* Vote Buttons */}
                      {proposal.status === 'active' && !hasVoted && (
                        <div style={{ display: 'flex', gap: 12 }}>
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => handleVote(proposal.id, 'for')}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: 8, padding: '12px 20px', borderRadius: '12px', cursor: 'pointer',
                              background: 'rgba(0,224,138,0.10)', border: '1px solid rgba(0,224,138,0.30)',
                              color: '#00e08a', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
                              transition: 'all 0.25s ease' }}>
                            <ThumbsUp style={{ width: 16, height: 16 }} /> Vote For
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => handleVote(proposal.id, 'against')}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: 8, padding: '12px 20px', borderRadius: '12px', cursor: 'pointer',
                              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                              color: '#f87171', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
                              transition: 'all 0.25s ease' }}>
                            <ThumbsDown style={{ width: 16, height: 16 }} /> Vote Against
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </TiltCard>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── How Governance Works info box ───────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}>
          <div style={{
            ...glass({ borderRadius: '16px', padding: '28px 30px',
              background: 'rgba(7,17,13,0.45)', border: '1px solid rgba(0,224,138,0.08)' }),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Megaphone style={{ width: 20, height: 20, color: '#00e08a' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f0f6f3', margin: 0 }}>
                How On-Chain Governance Works
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {[
                { step: '01', title: 'Create Proposal', desc: 'Any token holder can submit a governance proposal with a title, description, and type.' },
                { step: '02', title: 'Community Review', desc: 'Proposals are open for community review during the voting period (1–30 days).' },
                { step: '03', title: 'Cast Votes', desc: 'Token holders vote For or Against. Voting weight is proportional to holdings.' },
                { step: '04', title: 'Execution', desc: 'If quorum is met and majority votes For, the proposal is passed and executed on-chain.' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '18px', borderRadius: '12px',
                  background: 'rgba(0,224,138,0.03)', border: '1px solid rgba(0,224,138,0.08)',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'rgba(0,224,138,0.20)',
                    marginBottom: 6, fontFamily: 'monospace' }}>{s.step}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f6f3', marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(240,246,243,0.40)' }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Create Proposal Modal ──────────────────────────────────── */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)',
                padding: 16 }}
              onClick={() => setShowCreateModal(false)}>

              <motion.div initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                style={{
                  ...glass({ borderRadius: '20px', padding: '32px',
                    border: '1px solid rgba(0,224,138,0.20)',
                    boxShadow: '0 0 60px rgba(0,224,138,0.08), 0 16px 48px rgba(0,0,0,0.4)',
                    width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' as const }),
                }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '12px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,224,138,0.10)', border: '1px solid rgba(0,224,138,0.25)' }}>
                    <Plus style={{ width: 20, height: 20, color: '#00e08a' }} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f0f6f3', margin: 0 }}>Create Proposal</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Title */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'rgba(240,246,243,0.50)', marginBottom: 8 }}>
                      Title *
                    </label>
                    <input type="text" value={newProposal.title}
                      onChange={(e) => setNewProposal(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Proposal title…"
                      style={glassInput}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.40)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,224,138,0.10)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'rgba(240,246,243,0.50)', marginBottom: 8 }}>
                      Description *
                    </label>
                    <textarea value={newProposal.description}
                      onChange={(e) => setNewProposal(prev => ({ ...prev, description: e.target.value }))}
                      rows={4} placeholder="Detailed description…"
                      style={{ ...glassInput, resize: 'none' as const }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.40)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,224,138,0.10)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'rgba(240,246,243,0.50)', marginBottom: 8 }}>
                      Type *
                    </label>
                    <select value={newProposal.type}
                      onChange={(e) => setNewProposal(prev => ({ ...prev, type: e.target.value as Proposal['type'] }))}
                      style={glassInput}>
                      <option value="parameter" style={{ background: '#07110d' }}>Parameter Change</option>
                      <option value="asset-approval" style={{ background: '#07110d' }}>Asset Approval</option>
                      <option value="governance" style={{ background: '#07110d' }}>Governance</option>
                      <option value="emergency" style={{ background: '#07110d' }}>Emergency</option>
                    </select>
                  </div>

                  {/* Voting period & Quorum */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'rgba(240,246,243,0.50)', marginBottom: 8 }}>
                        Voting Period (Days)
                      </label>
                      <input type="number" value={newProposal.votingDays}
                        onChange={(e) => setNewProposal(prev => ({ ...prev, votingDays: parseInt(e.target.value) || 7 }))}
                        min="1" max="30" style={glassInput}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.40)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,224,138,0.10)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'rgba(240,246,243,0.50)', marginBottom: 8 }}>
                        Quorum (%)
                      </label>
                      <input type="number" value={newProposal.quorumPercentage}
                        onChange={(e) => setNewProposal(prev => ({ ...prev, quorumPercentage: parseInt(e.target.value) || 51 }))}
                        min="1" max="100" style={glassInput}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,224,138,0.40)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,224,138,0.10)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>
                </div>

                {/* Modal actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowCreateModal(false)}
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                      color: 'rgba(240,246,243,0.6)', fontSize: 13, fontWeight: 700 }}>
                    Cancel
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleCreateProposal}
                    disabled={!newProposal.title || !newProposal.description}
                    style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', cursor: 'pointer',
                      background: 'rgba(0,224,138,0.15)', border: '1px solid rgba(0,224,138,0.35)',
                      color: '#00e08a', fontSize: 13, fontWeight: 700,
                      opacity: (!newProposal.title || !newProposal.description) ? 0.4 : 1,
                      transition: 'all 0.25s ease' }}>
                    Create Proposal
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};
