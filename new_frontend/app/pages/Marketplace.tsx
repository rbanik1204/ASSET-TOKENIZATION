import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useMarketplace, type Listing, type Trade } from '../contexts/MarketplaceContext';
import {
  Search, ShoppingCart, ExternalLink, Plus,
  Building2, Shield, Clock, TrendingUp, Zap,
  Layers, Leaf, BarChart3, Gem, Activity,
  XCircle, RefreshCw, Unlock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BuyFractionModal } from '../components/BuyFractionModal';
import CreateListingModal from '../components/CreateListingModal';
import {
  PageTransition,
} from '../components/motion/MotionSystem';
import { toast } from 'sonner';

// ─── Category icon map ─────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.FC<{ style?: React.CSSProperties }>> = {
  'Real Estate': Building2,
  'Energy': Zap,
  'Carbon Credits': Leaf,
  'Equipment': Layers,
  'Commodities': Gem,
};

const CATEGORY_ACCENTS: Record<string, string> = {
  'Real Estate': 'rgba(0,224,138,0.8)',
  'Energy': 'rgba(250,204,21,0.7)',
  'Carbon Credits': 'rgba(34,197,94,0.7)',
  'Equipment': 'rgba(99,102,241,0.7)',
  'Commodities': 'rgba(168,85,247,0.7)',
};

// ─── Tilt card component ──────────────────────────────────────────────────
const TiltCard: React.FC<{
  children: React.ReactNode;
  accent: string;
  index: number;
}> = ({ children, accent, index }) => {
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
      style={{ perspective: '800px', cursor: 'pointer' }}
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
            ? `1px solid ${accent}`
            : '1px solid rgba(0,224,138,0.12)',
          boxShadow: hovering
            ? `0 20px 50px rgba(0,0,0,0.4), 0 0 30px ${accent.replace(/[\d.]+\)$/, '0.12)')}`
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
      fontSize: '10px', fontWeight: 600,
      color: 'rgba(240,246,243,0.45)',
      textTransform: 'uppercase', letterSpacing: '0.6px',
      display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      {icon}
      {label}
    </span>
    <span style={{
      fontSize: '13px', fontWeight: 700,
      color: highlight ? '#00e08a' : '#f0f6f3',
    }}>
      {value}
    </span>
  </div>
);

// ─── Trade row for recent activity ────────────────────────────────────────
const TradeRow: React.FC<{ trade: Trade }> = ({ trade }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 14px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
  }}>
    <Activity style={{ width: '14px', height: '14px', color: '#00e08a', flexShrink: 0 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#f0f6f3' }}>
        {trade.units} units @ {Number(trade.pricePerUnit).toFixed(4)} ALGO
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(240,246,243,0.35)', marginTop: '2px' }}>
        {trade.buyerAddress.slice(0, 6)}...{trade.buyerAddress.slice(-4)} →
        {' '}{new Date(trade.createdAt).toLocaleDateString()}
      </div>
    </div>
    <div style={{
      fontSize: '12px', fontWeight: 700, color: '#00e08a', whiteSpace: 'nowrap',
    }}>
      {(trade.totalAlgo / 1_000_000).toFixed(4)} A
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MARKETPLACE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const Marketplace: React.FC = () => {
  const { address, network, isAuthenticated, signTransactions } = useAlgorand();
  const {
    listings, stats, recentTrades, isLoading, error,
    fetchListings, fetchStats, fetchRecentTrades, cancelListing,
    prepareEscrow, confirmEscrow,
  } = useMarketplace();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [buyListing, setBuyListing] = useState<Listing | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [enablingTradeId, setEnablingTradeId] = useState<string | null>(null);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchListings();
      fetchStats();
      fetchRecentTrades();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchListings, fetchStats, fetchRecentTrades]);

  // Build category list from live data
  const liveCategories = Array.from(
    new Set(listings.map((l) => l.category).filter(Boolean) as string[]),
  );
  const categories = ['all', ...liveCategories];

  // Filter listings
  const filteredListings = listings.filter((l) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      l.assetName.toLowerCase().includes(term) ||
      l.unitName.toLowerCase().includes(term) ||
      String(l.asaId).includes(term);
    const matchesCategory =
      selectedCategory === 'all' || l.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCancelListing = async (listing: Listing) => {
    if (!address) return;
    if (!confirm(`Cancel listing for ${listing.assetName}? This cannot be undone.`)) return;
    try {
      await cancelListing(listing.id, address);
      toast.success('Listing cancelled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
    }
  };

  const handleEnableTrading = async (listing: Listing) => {
    if (!address) return;
    setEnablingTradeId(listing.id);
    try {
      // Step 1: Get unsigned ASA Config txn from backend
      const result = await prepareEscrow(listing.id, address);

      // Already configured?
      if (!result.unsignedTxn) {
        toast.success(result.message || 'Trading already enabled!');
        setEnablingTradeId(null);
        return;
      }

      // Step 2: Decode and sign with wallet
      const bytes = Uint8Array.from(atob(result.unsignedTxn), (c) => c.charCodeAt(0));
      const txnObj = (await import('algosdk')).default.decodeUnsignedTransaction(bytes);
      const txnGroup = [{ txn: txnObj }];
      const signed = await signTransactions(txnGroup);

      // Extract the signed txn
      const signedBytes = signed.find((s: any) => s && s.length > 0);
      if (!signedBytes) throw new Error('No signed transaction returned');

      const b = signedBytes instanceof Uint8Array ? signedBytes : new Uint8Array(signedBytes);
      const signedB64 = btoa(String.fromCharCode(...b));

      // Step 3: Submit to backend
      await confirmEscrow(listing.id, signedB64);
      toast.success(`Trading enabled for ${listing.assetName}! Buyers can now purchase.`);
    } catch (err: any) {
      if (err?.message?.includes('CONNECT_MODAL_CLOSED') || err?.message?.includes('cancelled')) {
        // User cancelled
      } else {
        console.error('Enable trading error:', err);
        toast.error(err.message || 'Failed to enable trading');
      }
    } finally {
      setEnablingTradeId(null);
    }
  };

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
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
                  Asset Marketplace
                </h1>
                <p style={{
                  fontSize: '14px', color: 'rgba(240,246,243,0.5)',
                  maxWidth: '540px', lineHeight: 1.6,
                }}>
                  Browse tokenized real-world assets. Purchase fractional ownership
                  through atomic swaps on Algorand {network === 'testnet' ? '(TestNet)' : ''}.
                </p>
              </div>

              {/* Create Listing button */}
              {isAuthenticated && address && (
                <button
                  onClick={() => setCreateModalOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px 24px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(0,224,138,0.15), rgba(0,224,138,0.05))',
                    border: '1px solid rgba(0,224,138,0.35)',
                    color: '#00e08a', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    letterSpacing: '0.4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.25), rgba(0,224,138,0.10))';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0,224,138,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.15), rgba(0,224,138,0.05))';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  List Asset
                </button>
              )}
            </div>

            {/* Market Overview Stats */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px',
            }}>
              {[
                { label: 'Active Listings', value: String(stats?.activeListings ?? filteredListings.length) },
                { label: 'Total Trades', value: String(stats?.totalTrades ?? 0) },
                { label: 'Volume', value: stats ? `${stats.totalVolumeAlgo.toFixed(2)} ALGO` : '—' },
                { label: 'Unique Sellers', value: String(stats?.uniqueSellers ?? 0) },
                { label: 'Unique Buyers', value: String(stats?.uniqueBuyers ?? 0) },
              ].map((stat) => (
                <div key={stat.label} style={{
                  padding: '8px 16px', borderRadius: '10px',
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
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#f0f6f3' }}>
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
            display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Search Input */}
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
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
              placeholder="Search assets by name, symbol, or ASA ID..."
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
                boxShadow: searchFocused ? '0 0 20px rgba(0,224,138,0.08)' : 'none',
              }}
            />
          </div>

          {/* Category Filters */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '10px 16px', borderRadius: '10px',
                    border: isActive
                      ? '1px solid rgba(0,224,138,0.35)'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: isActive
                      ? 'rgba(0,224,138,0.10)' : 'rgba(255,255,255,0.02)',
                    color: isActive ? '#00e08a' : 'rgba(240,246,243,0.55)',
                    fontSize: '11px', fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    whiteSpace: 'nowrap', letterSpacing: '0.3px',
                  }}
                >
                  {cat === 'all' ? 'All Assets' : cat}
                </button>
              );
            })}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => { fetchListings(); fetchStats(); fetchRecentTrades(); }}
            disabled={isLoading}
            style={{
              padding: '10px 14px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
              color: 'rgba(240,246,243,0.55)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', fontWeight: 600,
              transition: 'all 0.25s ease',
            }}
          >
            <RefreshCw style={{
              width: '13px', height: '13px',
              animation: isLoading ? 'spin 1s linear infinite' : 'none',
            }} />
            Refresh
          </button>
        </motion.div>

        {/* ── Error banner ─────────────────────────────────────────── */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 18px', marginBottom: '20px',
            borderRadius: '10px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '12px', color: 'rgba(240,246,243,0.7)',
          }}>
            <XCircle style={{ width: '14px', height: '14px', color: '#ef4444', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Content: Listings Grid + Recent Trades ───────────────── */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '40px', flexWrap: 'wrap' }}>

          {/* ── Listings Grid ──────────────────────────────────────── */}
          <div style={{ flex: '1 1 680px', minWidth: 0 }}>
            {isLoading && filteredListings.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 24px',
                borderRadius: '16px', background: 'rgba(7,17,13,0.5)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <RefreshCw style={{
                  width: '32px', height: '32px', color: '#00e08a',
                  margin: '0 auto 16px', animation: 'spin 1.5s linear infinite',
                }} />
                <div style={{ fontSize: '14px', color: 'rgba(240,246,243,0.5)' }}>
                  Loading marketplace listings...
                </div>
              </div>
            ) : filteredListings.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  textAlign: 'center', padding: '60px 24px',
                  borderRadius: '16px', background: 'rgba(7,17,13,0.5)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <BarChart3 style={{
                  width: '40px', height: '40px', color: 'rgba(240,246,243,0.15)',
                  margin: '0 auto 16px',
                }} />
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0f6f3', marginBottom: '8px' }}>
                  {listings.length === 0 ? 'No listings yet' : 'No matching listings'}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(240,246,243,0.4)', marginBottom: '24px' }}>
                  {listings.length === 0
                    ? 'Be the first to list a tokenized asset on the marketplace!'
                    : 'Try adjusting your search or filter criteria'}
                </div>
                {isAuthenticated && address && listings.length === 0 && (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '12px 24px', borderRadius: '10px',
                      background: 'rgba(0,224,138,0.12)',
                      border: '1px solid rgba(0,224,138,0.3)',
                      color: '#00e08a', fontSize: '13px', fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus style={{ width: '16px', height: '16px' }} />
                    Create First Listing
                  </button>
                )}
              </motion.div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '20px',
              }}>
                {filteredListings.map((listing, index) => {
                  const accent = CATEGORY_ACCENTS[listing.category || ''] || 'rgba(0,224,138,0.8)';
                  const Icon = CATEGORY_ICONS[listing.category || ''] || Gem;
                  const isMine = address === listing.sellerAddress;
                  const fillPct = listing.originalQuantity > 0
                    ? ((listing.originalQuantity - listing.remainingQuantity) / listing.originalQuantity) * 100
                    : 0;

                  return (
                    <TiltCard key={listing.id} accent={accent} index={index}>
                      {/* Card top accent line */}
                      <div style={{
                        height: '2px',
                        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                        opacity: 0.5,
                      }} />

                      <div style={{ padding: '20px' }}>
                        {/* Header row */}
                        <div style={{
                          display: 'flex', alignItems: 'flex-start',
                          justifyContent: 'space-between', marginBottom: '14px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '12px',
                              background: accent.replace(/[\d.]+\)$/, '0.10)'),
                              border: `1px solid ${accent.replace(/[\d.]+\)$/, '0.20)')}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Icon style={{
                                width: '20px', height: '20px',
                                color: accent.replace(/[\d.]+\)$/, '1)'),
                              }} />
                            </div>
                            <div>
                              <div style={{
                                fontSize: '15px', fontWeight: 700, color: '#f0f6f3',
                                lineHeight: 1.2, marginBottom: '2px',
                              }}>
                                {listing.assetName}
                              </div>
                              <div style={{
                                fontSize: '11px', fontWeight: 600,
                                color: 'rgba(240,246,243,0.35)',
                                letterSpacing: '0.5px',
                              }}>
                                {listing.unitName} • ASA #{listing.asaId}
                              </div>
                            </div>
                          </div>

                          {/* Status badge */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '4px 10px', borderRadius: '6px',
                            background: listing.status === 'active'
                              ? 'rgba(0,224,138,0.08)'
                              : listing.status === 'partial'
                                ? 'rgba(250,204,21,0.08)'
                                : 'rgba(100,100,100,0.08)',
                            border: listing.status === 'active'
                              ? '1px solid rgba(0,224,138,0.2)'
                              : listing.status === 'partial'
                                ? '1px solid rgba(250,204,21,0.2)'
                                : '1px solid rgba(100,100,100,0.2)',
                          }}>
                            {listing.status === 'active' ? (
                              <Shield style={{ width: '11px', height: '11px', color: '#00e08a' }} />
                            ) : (
                              <Clock style={{ width: '11px', height: '11px', color: '#facc15' }} />
                            )}
                            <span style={{
                              fontSize: '9px', fontWeight: 700,
                              color: listing.status === 'active' ? '#00e08a'
                                : listing.status === 'partial' ? '#facc15' : '#999',
                              textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                              {listing.status === 'partial' ? `${fillPct.toFixed(0)}% Filled` : listing.status}
                            </span>
                          </div>
                        </div>

                        {/* Category */}
                        {listing.category && (
                          <div style={{ marginBottom: '12px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '5px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              fontSize: '10px', fontWeight: 600,
                              color: 'rgba(240,246,243,0.45)',
                            }}>
                              {listing.category}
                            </span>
                          </div>
                        )}

                        {/* Description */}
                        {listing.description && (
                          <p style={{
                            fontSize: '12px', color: 'rgba(240,246,243,0.4)',
                            lineHeight: 1.6, marginBottom: '16px',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {listing.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: '4px',
                          marginBottom: '16px',
                        }}>
                          <StatPill
                            label="Price / Unit"
                            value={`${Number(listing.pricePerUnit).toFixed(4)} ALGO`}
                            highlight
                          />
                          <StatPill
                            label="Available"
                            value={`${listing.remainingQuantity.toLocaleString()} / ${listing.originalQuantity.toLocaleString()}`}
                          />
                          <StatPill
                            label="Total Value"
                            value={`${(listing.remainingQuantity * Number(listing.pricePerUnit)).toFixed(2)} ALGO`}
                          />
                          <StatPill
                            label="Min Purchase"
                            value={`${listing.minPurchase} units`}
                          />
                        </div>

                        {/* Fill progress bar */}
                        {fillPct > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{
                              height: '4px', borderRadius: '2px',
                              background: 'rgba(255,255,255,0.06)',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%', borderRadius: '2px',
                                background: `linear-gradient(90deg, ${accent}, ${accent.replace(/[\d.]+\)$/, '0.5)')})`,
                                width: `${fillPct}%`,
                                transition: 'width 0.5s ease',
                              }} />
                            </div>
                          </div>
                        )}

                        {/* Footer: seller + action */}
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '14px',
                          borderTop: '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <span style={{
                            fontSize: '10px', color: 'rgba(240,246,243,0.3)',
                            fontFamily: 'monospace',
                          }}>
                            {isMine ? '(Your listing)' : `${listing.sellerAddress.slice(0, 6)}...${listing.sellerAddress.slice(-4)}`}
                          </span>

                          {isMine ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleEnableTrading(listing)}
                                disabled={enablingTradeId === listing.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '5px',
                                  padding: '8px 14px', borderRadius: '8px',
                                  border: '1px solid rgba(99,102,241,0.35)',
                                  background: 'rgba(99,102,241,0.08)',
                                  color: '#818cf8',
                                  fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                                  transition: 'all 0.25s ease',
                                  opacity: enablingTradeId === listing.id ? 0.5 : 1,
                                }}
                              >
                                {enablingTradeId === listing.id ? (
                                  <RefreshCw style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <Unlock style={{ width: '11px', height: '11px' }} />
                                )}
                                {enablingTradeId === listing.id ? 'Enabling...' : 'Enable Trading'}
                              </button>
                              <button
                                onClick={() => handleCancelListing(listing)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '5px',
                                  padding: '8px 14px', borderRadius: '8px',
                                  border: '1px solid rgba(239,68,68,0.35)',
                                  background: 'rgba(239,68,68,0.08)',
                                  color: '#ef4444',
                                  fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                                  transition: 'all 0.25s ease',
                                }}
                              >
                                <XCircle style={{ width: '11px', height: '11px' }} />
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setBuyListing(listing)}
                              disabled={!address}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 18px', borderRadius: '8px',
                                border: '1px solid rgba(0,224,138,0.35)',
                                background: 'linear-gradient(135deg, rgba(0,224,138,0.12), rgba(0,224,138,0.04))',
                                color: '#00e08a',
                                fontSize: '11px', fontWeight: 700,
                                cursor: address ? 'pointer' : 'not-allowed',
                                opacity: address ? 1 : 0.4,
                                transition: 'all 0.25s ease',
                                letterSpacing: '0.3px',
                              }}
                              onMouseEnter={(e) => {
                                if (address) {
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
                              {!address ? 'Connect' : 'Purchase'}
                            </button>
                          )}
                        </div>
                      </div>
                    </TiltCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Recent Trades Sidebar ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              flex: '0 0 320px', minWidth: '280px',
              borderRadius: '16px',
              background: 'rgba(7,17,13,0.55)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(0,224,138,0.08)',
              padding: '20px',
              alignSelf: 'flex-start',
              position: 'sticky',
              top: '100px',
              maxHeight: 'calc(100vh - 120px)',
              overflow: 'auto',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '16px',
            }}>
              <Activity style={{ width: '14px', height: '14px', color: '#00e08a' }} />
              <span style={{
                fontSize: '12px', fontWeight: 700, color: '#f0f6f3',
                textTransform: 'uppercase', letterSpacing: '1px',
              }}>
                Recent Trades
              </span>
            </div>

            {recentTrades.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '30px 10px',
                color: 'rgba(240,246,243,0.3)', fontSize: '12px',
              }}>
                No trades yet. Be the first buyer!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentTrades.slice(0, 15).map((trade) => (
                  <TradeRow key={trade.id} trade={trade} />
                ))}
              </div>
            )}

            {/* Platform info */}
            <div style={{
              marginTop: '20px', paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                fontSize: '10px', color: 'rgba(240,246,243,0.3)',
                lineHeight: 1.6,
              }}>
                <div>Platform Fee: <strong style={{ color: '#00e08a' }}>2.5%</strong></div>
                <div>Settlement: <strong style={{ color: '#00e08a' }}>Atomic Swap</strong></div>
                <div>Network: <strong style={{ color: '#00e08a' }}>{network === 'testnet' ? 'Algorand TestNet' : 'Algorand MainNet'}</strong></div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Buy Modal ──────────────────────────────────────────── */}
      {buyListing && (
        <BuyFractionModal
          listing={{
            id: buyListing.id,
            asaId: buyListing.asaId,
            assetName: buyListing.assetName,
            unitName: buyListing.unitName,
            pricePerUnit: Number(buyListing.pricePerUnit),
            remainingQuantity: buyListing.remainingQuantity,
            minPurchase: buyListing.minPurchase,
            sellerAddress: buyListing.sellerAddress,
            platformFeeBps: buyListing.platformFeeBps,
          }}
          isOpen={true}
          onClose={() => setBuyListing(null)}
          onSuccess={() => {
            setBuyListing(null);
            fetchListings();
            fetchStats();
            fetchRecentTrades();
          }}
        />
      )}

      {/* ── Create Listing Modal ───────────────────────────────── */}
      <CreateListingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Keyframes */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 12px rgba(0,224,138,0.5); }
          50% { opacity: 0.5; box-shadow: 0 0 4px rgba(0,224,138,0.2); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageTransition>
  );
};
