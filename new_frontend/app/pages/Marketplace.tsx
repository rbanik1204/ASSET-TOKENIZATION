import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import {
  Search, Filter, ShoppingCart, ExternalLink,
  Building2, Shield, Clock, TrendingUp, Zap,
  Layers, MapPin, Leaf, BarChart3, Gem,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BuyFractionModal } from '../components/BuyFractionModal';
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
  PageTransition,
} from '../components/motion/MotionSystem';

// ─── Demo asset data ───────────────────────────────────────────────────────
interface DemoAsset {
  id: string;
  name: string;
  unitName: string;
  category: string;
  description: string;
  pricePerUnit: number;
  unitsAvailable: number;
  totalValue: number;
  verified: boolean;
  change24h: number;
  volume24h: number;
  holders: number;
  icon: React.FC<{ style?: React.CSSProperties }>;
  accent: string;
}

const DEMO_ASSETS: DemoAsset[] = [
  {
    id: 'demo-1',
    name: 'Manhattan Tower Block B',
    unitName: 'MHTB',
    category: 'Real Estate',
    description: 'Class-A commercial office space in Midtown Manhattan. 42-floor tower, 96% occupancy rate.',
    pricePerUnit: 245.50,
    unitsAvailable: 8420,
    totalValue: 2_067_210,
    verified: true,
    change24h: 2.4,
    volume24h: 14_300,
    holders: 312,
    icon: Building2,
    accent: 'rgba(0,224,138,0.8)',
  },
  {
    id: 'demo-2',
    name: 'Solar Farm — Nevada Grid',
    unitName: 'SLNV',
    category: 'Energy',
    description: 'Utility-scale 200MW photovoltaic installation. 25-year PPA with NV Energy.',
    pricePerUnit: 87.25,
    unitsAvailable: 24_600,
    totalValue: 2_146_350,
    verified: true,
    change24h: 1.1,
    volume24h: 8_750,
    holders: 589,
    icon: Zap,
    accent: 'rgba(250,204,21,0.7)',
  },
  {
    id: 'demo-3',
    name: 'Carbon Credit Pool — Verified',
    unitName: 'CRBN',
    category: 'Carbon Credits',
    description: 'Voluntary carbon offsets from certified reforestation projects across Southeast Asia.',
    pricePerUnit: 18.40,
    unitsAvailable: 150_000,
    totalValue: 2_760_000,
    verified: true,
    change24h: -0.8,
    volume24h: 42_100,
    holders: 1_204,
    icon: Leaf,
    accent: 'rgba(34,197,94,0.7)',
  },
  {
    id: 'demo-4',
    name: 'Industrial Equipment Lease',
    unitName: 'INQL',
    category: 'Equipment',
    description: 'Fleet of CNC machines and robotic assembly arms leased to Tier-1 automotive manufacturers.',
    pricePerUnit: 520.00,
    unitsAvailable: 3_200,
    totalValue: 1_664_000,
    verified: true,
    change24h: 0.3,
    volume24h: 5_200,
    holders: 148,
    icon: Layers,
    accent: 'rgba(99,102,241,0.7)',
  },
  {
    id: 'demo-5',
    name: 'Tokyo Residential Complex',
    unitName: 'TKRC',
    category: 'Real Estate',
    description: 'Mixed-use residential tower in Shibuya. 180 units, ground-floor retail, 98% leased.',
    pricePerUnit: 312.75,
    unitsAvailable: 12_800,
    totalValue: 4_003_200,
    verified: false,
    change24h: 0.0,
    volume24h: 0,
    holders: 0,
    icon: MapPin,
    accent: 'rgba(244,63,94,0.7)',
  },
  {
    id: 'demo-6',
    name: 'Rare Earth Mining Rights',
    unitName: 'REMR',
    category: 'Commodities',
    description: 'Lithium and cobalt extraction rights in Western Australia. 15-year concession.',
    pricePerUnit: 1_240.00,
    unitsAvailable: 1_500,
    totalValue: 1_860_000,
    verified: true,
    change24h: 4.7,
    volume24h: 22_400,
    holders: 97,
    icon: Gem,
    accent: 'rgba(168,85,247,0.7)',
  },
];

// ─── Tilt card component ──────────────────────────────────────────────────
const TiltCard: React.FC<{
  children: React.ReactNode;
  asset: DemoAsset;
  index: number;
  onBuy: () => void;
  disabled: boolean;
}> = ({ children, asset, index, onBuy, disabled }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x: y * -4, y: x * 6 });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setTilt({ x: 0, y: 0 }); }}
      style={{
        perspective: '800px',
        cursor: 'pointer',
      }}
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          y: hovering ? -6 : 0,
          scale: hovering ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          borderRadius: '16px',
          background: 'rgba(7, 17, 13, 0.65)',
          backdropFilter: 'blur(16px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
          border: hovering
            ? `1px solid ${asset.accent}`
            : '1px solid rgba(0,224,138,0.12)',
          boxShadow: hovering
            ? `0 20px 50px rgba(0,0,0,0.4), 0 0 30px ${asset.accent.replace(/[\d.]+\)$/, '0.12)')}`
            : '0 4px 20px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          transformStyle: 'preserve-3d',
          transition: 'border-color 0.3s, box-shadow 0.4s',
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// ─── Stat pill ────────────────────────────────────────────────────────────
const StatPill: React.FC<{
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}> = ({ label, value, icon, highlight }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '8px',
    background: highlight ? 'rgba(0,224,138,0.06)' : 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
  }}>
    <span style={{
      fontSize: '10px',
      fontWeight: 600,
      color: 'rgba(240,246,243,0.45)',
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      {icon}
      {label}
    </span>
    <span style={{
      fontSize: '13px',
      fontWeight: 700,
      color: highlight ? '#00e08a' : '#f0f6f3',
    }}>
      {value}
    </span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MARKETPLACE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const Marketplace: React.FC = () => {
  const { address, network } = useAlgorand();
  const { getApprovedAssets, listings } = useAssetRegistry();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [buyModalListing, setBuyModalListing] = useState<typeof listings[number] | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const approvedAssets = getApprovedAssets();
  const categories = ['all', 'Real Estate', 'Energy', 'Carbon Credits', 'Equipment', 'Commodities'];

  // Merge real listings with demo data
  const realCards = listings
    .map((listing) => {
      const asset = approvedAssets.find((a) => a.assetId === listing.assetId);
      if (!asset) return null;
      return { listing, asset, isDemo: false };
    })
    .filter(Boolean);

  // Filter demo assets
  const filteredDemos = DEMO_ASSETS.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.unitName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Market overview stats
  const totalMarketCap = DEMO_ASSETS.reduce((s, a) => s + a.totalValue, 0);
  const totalVolume = DEMO_ASSETS.reduce((s, a) => s + a.volume24h, 0);
  const totalHolders = DEMO_ASSETS.reduce((s, a) => s + a.holders, 0);

  return (
    <PageTransition>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* ── Hero Header ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            borderRadius: '20px',
            padding: '36px 32px 28px',
            marginBottom: '24px',
            background: 'rgba(7,17,13,0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(0,224,138,0.12)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient gradient blobs */}
          <div style={{
            position: 'absolute', top: '-60px', right: '-40px',
            width: '260px', height: '260px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,224,138,0.06), transparent 70%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-80px', left: '20%',
            width: '300px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.04), transparent 70%)',
            filter: 'blur(50px)', pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#00e08a',
                boxShadow: '0 0 12px rgba(0,224,138,0.5)',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#00e08a',
                letterSpacing: '1.5px', textTransform: 'uppercase',
              }}>
                Live Marketplace
              </span>
            </div>
            <h1 style={{
              fontSize: '32px', fontWeight: 800, color: '#f0f6f3',
              letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: '8px',
            }}>
              Verified Asset Marketplace
            </h1>
            <p style={{
              fontSize: '14px', color: 'rgba(240,246,243,0.5)',
              maxWidth: '540px', lineHeight: 1.6,
            }}>
              Browse tokenized real-world assets with full on-chain verification.
              Purchase fractional ownership through atomic swaps on Algorand.
            </p>

            {/* Market Overview Pills */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px',
            }}>
              {[
                { label: 'Total Market Cap', value: `$${(totalMarketCap / 1_000_000).toFixed(1)}M` },
                { label: '24h Volume', value: `$${totalVolume.toLocaleString()}` },
                { label: 'Active Holders', value: totalHolders.toLocaleString() },
                { label: 'Listed Assets', value: `${DEMO_ASSETS.length}` },
              ].map((stat) => (
                <div key={stat.label} style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}>
                  <div style={{
                    fontSize: '9px', fontWeight: 600,
                    color: 'rgba(240,246,243,0.35)',
                    textTransform: 'uppercase', letterSpacing: '1px',
                    marginBottom: '2px',
                  }}>
                    {stat.label}
                  </div>
                  <div style={{
                    fontSize: '15px', fontWeight: 700, color: '#f0f6f3',
                  }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Search & Filters ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '28px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Input */}
          <div style={{
            flex: '1 1 320px',
            position: 'relative',
          }}>
            <Search style={{
              position: 'absolute', left: '16px', top: '50%',
              transform: 'translateY(-50%)',
              width: '16px', height: '16px',
              color: searchFocused ? '#00e08a' : 'rgba(240,246,243,0.3)',
              transition: 'color 0.25s',
            }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search assets by name or symbol..."
              style={{
                width: '100%',
                padding: '14px 16px 14px 44px',
                borderRadius: '12px',
                border: searchFocused
                  ? '1px solid rgba(0,224,138,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(7,17,13,0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#f0f6f3',
                fontSize: '13px',
                fontWeight: 500,
                outline: 'none',
                transition: 'all 0.3s ease',
                boxShadow: searchFocused
                  ? '0 0 20px rgba(0,224,138,0.08)'
                  : 'none',
              }}
            />
          </div>

          {/* Category Filters */}
          <div style={{
            display: 'flex', gap: '6px', alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: isActive
                      ? '1px solid rgba(0,224,138,0.35)'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: isActive
                      ? 'rgba(0,224,138,0.10)'
                      : 'rgba(255,255,255,0.02)',
                    color: isActive ? '#00e08a' : 'rgba(240,246,243,0.55)',
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.3px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.color = '#e0f5ec';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = 'rgba(240,246,243,0.55)';
                    }
                  }}
                >
                  {cat === 'all' ? 'All Assets' : cat}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Demo notice ──────────────────────────────────────────── */}
        {realCards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              marginBottom: '20px',
              borderRadius: '10px',
              background: 'rgba(0,224,138,0.04)',
              border: '1px solid rgba(0,224,138,0.12)',
              fontSize: '12px',
              color: 'rgba(240,246,243,0.55)',
            }}
          >
            <BarChart3 style={{ width: '14px', height: '14px', color: '#00e08a', flexShrink: 0 }} />
            <span>
              <strong style={{ color: '#00e08a' }}>Demo Mode</strong> — 
              Showing preview assets for demonstration. Connect wallet and list verified assets to populate live data.
            </span>
          </motion.div>
        )}

        {/* ── Asset Grid ───────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          {filteredDemos.map((asset, index) => {
            const Icon = asset.icon;
            const changeColor = asset.change24h > 0
              ? '#00e08a'
              : asset.change24h < 0
                ? '#ef4444'
                : 'rgba(240,246,243,0.4)';
            const changePrefix = asset.change24h > 0 ? '+' : '';

            return (
              <TiltCard
                key={asset.id}
                asset={asset}
                index={index}
                onBuy={() => {}}
                disabled={!address}
              >
                {/* Card top accent line */}
                <div style={{
                  height: '2px',
                  background: `linear-gradient(90deg, transparent, ${asset.accent}, transparent)`,
                  opacity: 0.5,
                }} />

                <div style={{ padding: '20px' }}>
                  {/* Header row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Icon */}
                      <div style={{
                        width: '42px', height: '42px',
                        borderRadius: '12px',
                        background: asset.accent.replace(/[\d.]+\)$/, '0.10)'),
                        border: `1px solid ${asset.accent.replace(/[\d.]+\)$/, '0.20)')}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon style={{
                          width: '20px', height: '20px',
                          color: asset.accent.replace(/[\d.]+\)$/, '1)'),
                        }} />
                      </div>
                      <div>
                        <div style={{
                          fontSize: '15px', fontWeight: 700, color: '#f0f6f3',
                          lineHeight: 1.2, marginBottom: '2px',
                        }}>
                          {asset.name}
                        </div>
                        <div style={{
                          fontSize: '11px', fontWeight: 600,
                          color: 'rgba(240,246,243,0.35)',
                          letterSpacing: '0.5px',
                        }}>
                          {asset.unitName}
                        </div>
                      </div>
                    </div>

                    {/* Verification badge */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: asset.verified
                        ? 'rgba(0,224,138,0.08)'
                        : 'rgba(250,204,21,0.08)',
                      border: asset.verified
                        ? '1px solid rgba(0,224,138,0.2)'
                        : '1px solid rgba(250,204,21,0.2)',
                    }}>
                      {asset.verified ? (
                        <Shield style={{ width: '11px', height: '11px', color: '#00e08a' }} />
                      ) : (
                        <Clock style={{ width: '11px', height: '11px', color: '#facc15' }} />
                      )}
                      <span style={{
                        fontSize: '9px', fontWeight: 700,
                        color: asset.verified ? '#00e08a' : '#facc15',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        {asset.verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Category + Change */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '12px',
                  }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'rgba(240,246,243,0.45)',
                    }}>
                      {asset.category}
                    </span>
                    {asset.change24h !== 0 && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        fontSize: '11px', fontWeight: 700, color: changeColor,
                      }}>
                        <TrendingUp style={{
                          width: '11px', height: '11px',
                          transform: asset.change24h < 0 ? 'rotate(180deg)' : 'none',
                        }} />
                        {changePrefix}{asset.change24h}%
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: '12px',
                    color: 'rgba(240,246,243,0.4)',
                    lineHeight: 1.6,
                    marginBottom: '16px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {asset.description}
                  </p>

                  {/* Stats */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '4px',
                    marginBottom: '16px',
                  }}>
                    <StatPill
                      label="Price / Unit"
                      value={`${asset.pricePerUnit.toLocaleString()} ALGO`}
                      highlight
                    />
                    <StatPill
                      label="Available"
                      value={asset.unitsAvailable.toLocaleString()}
                    />
                    <StatPill
                      label="Market Cap"
                      value={`$${(asset.totalValue / 1000).toFixed(0)}K`}
                    />
                    <StatPill
                      label="24h Volume"
                      value={asset.volume24h > 0 ? `$${asset.volume24h.toLocaleString()}` : '—'}
                    />
                  </div>

                  {/* Footer: holders + action */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '14px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(240,246,243,0.3)',
                    }}>
                      {asset.holders > 0 ? `${asset.holders} holders` : 'New listing'}
                    </span>

                    <button
                      disabled={!address || !asset.verified}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0,224,138,0.35)',
                        background: 'linear-gradient(135deg, rgba(0,224,138,0.12), rgba(0,224,138,0.04))',
                        color: '#00e08a',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: address && asset.verified ? 'pointer' : 'not-allowed',
                        opacity: address && asset.verified ? 1 : 0.4,
                        transition: 'all 0.25s ease',
                        letterSpacing: '0.3px',
                      }}
                      onMouseEnter={(e) => {
                        if (address && asset.verified) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.22), rgba(0,224,138,0.08))';
                          e.currentTarget.style.boxShadow = '0 0 16px rgba(0,224,138,0.15)';
                          e.currentTarget.style.transform = 'scale(1.04)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.12), rgba(0,224,138,0.04))';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <ShoppingCart style={{ width: '12px', height: '12px' }} />
                      {!address ? 'Connect' : !asset.verified ? 'Pending' : 'Purchase'}
                    </button>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>

        {/* ── Empty filtered state ─────────────────────────────────── */}
        {filteredDemos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center',
              padding: '60px 24px',
              borderRadius: '16px',
              background: 'rgba(7,17,13,0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Search style={{
              width: '40px', height: '40px',
              color: 'rgba(240,246,243,0.15)',
              margin: '0 auto 16px',
            }} />
            <div style={{
              fontSize: '16px', fontWeight: 700, color: '#f0f6f3',
              marginBottom: '8px',
            }}>
              No matching assets
            </div>
            <div style={{
              fontSize: '13px', color: 'rgba(240,246,243,0.4)',
            }}>
              Try adjusting your search or filter criteria
            </div>
          </motion.div>
        )}
      </div>

      {/* BuyFractionModal (real assets only) */}
      {buyModalListing && (() => {
        const asset = approvedAssets.find(a => a.assetId === buyModalListing.assetId);
        if (!asset) return null;
        return (
          <BuyFractionModal
            asset={{
              id: asset.id,
              assetId: asset.assetId,
              name: asset.name,
              unitName: asset.unitName,
              pricePerUnit: buyModalListing.pricePerUnit,
              unitsAvailable: buyModalListing.unitsAvailable,
              seller: buyModalListing.seller,
            }}
            isOpen={true}
            onClose={() => setBuyModalListing(null)}
            onSuccess={() => setBuyModalListing(null)}
          />
        );
      })()}

      {/* Keyframes */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 12px rgba(0,224,138,0.5); }
          50% { opacity: 0.5; box-shadow: 0 0 4px rgba(0,224,138,0.2); }
        }
      `}</style>
    </PageTransition>
  );
};
