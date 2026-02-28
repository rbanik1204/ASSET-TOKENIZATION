import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Wallet, Network, Bell, ChevronDown,
  LayoutDashboard, Store, Coins, Briefcase, BarChart3,
  Vote, FileText, MoreHorizontal,
} from 'lucide-react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { WalletModal } from './WalletModal';
import { motion, AnimatePresence } from 'motion/react';

// ─── Scroll-reactive hook (pure ref, no re-renders during scroll) ──────────
function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 24);
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
}

export const Header: React.FC = () => {
  const location = useLocation();
  const { connectedWallet, network, setNetwork, address, isAuthenticated, userRole, logout } = useAlgorand();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrollState();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigation = [
    { name: 'Dashboard',   path: '/',            icon: LayoutDashboard },
    { name: 'Marketplace', path: '/marketplace',  icon: Store },
    { name: 'Tokenize',    path: '/tokenize',     icon: Coins },
    { name: 'Portfolio',   path: '/portfolio',     icon: Briefcase },
    { name: 'Governance',  path: '/governance',    icon: Vote },
    { name: 'Analytics',   path: '/analytics',     icon: BarChart3 },
  ];

  const moreNav = [
    { name: 'Income',          path: '/income' },
    { name: 'History',         path: '/history' },
    { name: 'Verify Assets',   path: '/verify' },
    { name: 'KYC',             path: '/kyc' },
    { name: 'Notifications',   path: '/notifications' },
    { name: 'Admin',           path: '/admin' },
    { name: 'Documentation',   path: '/docs' },
    { name: 'Whitepaper',      path: '/whitepaper' },
    { name: 'Compliance',      path: '/compliance' },
    { name: 'FAQ',             path: '/faq' },
    { name: 'Support',         path: '/support' },
  ];

  const toggleNetwork = () => {
    setNetwork(network === 'mainnet' ? 'testnet' : 'mainnet');
  };

  return (
    <>
      {/* ── FLOATING GLASS NAVBAR ─────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          padding: scrolled ? '0 16px' : '8px 16px',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            borderRadius: scrolled ? '0 0 16px 16px' : '16px',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            /* Glassmorphism */
            background: scrolled
              ? 'rgba(3, 10, 7, 0.82)'
              : 'rgba(3, 10, 7, 0.55)',
            backdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'blur(12px) saturate(1.2)',
            WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'blur(12px) saturate(1.2)',
            /* Glowing bottom border */
            borderBottom: '1px solid rgba(0, 224, 138, 0.25)',
            borderLeft: '1px solid rgba(0, 224, 138, 0.08)',
            borderRight: '1px solid rgba(0, 224, 138, 0.08)',
            borderTop: '1px solid rgba(255, 255, 255, 0.04)',
            /* Shadow / glow */
            boxShadow: scrolled
              ? '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(0,224,138,0.15) inset, 0 12px 40px -8px rgba(0,224,138,0.08)'
              : '0 4px 24px rgba(0,0,0,0.2), 0 1px 0 rgba(0,224,138,0.10) inset',
          }}
        >
          {/* ── Top row: Logo + actions ─────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: scrolled ? '10px 20px' : '14px 20px',
              transition: 'padding 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Logo */}
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Logo mark */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(0,224,138,0.2), rgba(0,224,138,0.05))',
                  border: '1px solid rgba(0,224,138,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#00e08a',
                  letterSpacing: '-1px',
                  boxShadow: '0 0 20px rgba(0,224,138,0.1)',
                }}
              >
                A
              </div>
              <div>
                <div
                  style={{
                    fontSize: scrolled ? '14px' : '16px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    color: '#f0f6f3',
                    transition: 'font-size 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    lineHeight: 1.2,
                  }}
                >
                  Algorand Asset Protocol
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '1.5px',
                    color: 'rgba(0,224,138,0.6)',
                    textTransform: 'uppercase',
                    transition: 'opacity 0.3s',
                    opacity: scrolled ? 0 : 1,
                    height: scrolled ? 0 : '14px',
                    overflow: 'hidden',
                  }}
                >
                  Infrastructure · Tokenization
                </div>
              </div>
            </Link>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Network toggle */}
              <button
                onClick={toggleNetwork}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: network === 'testnet'
                    ? '1px solid rgba(0,224,138,0.35)'
                    : '1px solid rgba(239,68,68,0.35)',
                  background: network === 'testnet'
                    ? 'rgba(0,224,138,0.08)'
                    : 'rgba(239,68,68,0.08)',
                  color: network === 'testnet' ? '#00e08a' : '#ef4444',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  backdropFilter: 'blur(8px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.04)';
                  e.currentTarget.style.boxShadow = network === 'testnet'
                    ? '0 0 16px rgba(0,224,138,0.2)'
                    : '0 0 16px rgba(239,68,68,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Network style={{ width: '13px', height: '13px' }} />
                {network}
              </button>

              {/* Notification bell */}
              <Link
                to="/notifications"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(240,246,243,0.7)',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,224,138,0.35)';
                  e.currentTarget.style.color = '#00e08a';
                  e.currentTarget.style.background = 'rgba(0,224,138,0.06)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(0,224,138,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'rgba(240,246,243,0.7)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Bell style={{ width: '15px', height: '15px' }} />
              </Link>

              {/* Connect Wallet */}
              {!connectedWallet ? (
                <button
                  onClick={() => setWalletModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,224,138,0.4)',
                    background: 'linear-gradient(135deg, rgba(0,224,138,0.15), rgba(0,224,138,0.05))',
                    color: '#00e08a',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 0 20px rgba(0,224,138,0.08)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.25), rgba(0,224,138,0.10))';
                    e.currentTarget.style.borderColor = 'rgba(0,224,138,0.6)';
                    e.currentTarget.style.boxShadow = '0 0 28px rgba(0,224,138,0.18)';
                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,224,138,0.15), rgba(0,224,138,0.05))';
                    e.currentTarget.style.borderColor = 'rgba(0,224,138,0.4)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0,224,138,0.08)';
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  }}
                >
                  <Wallet style={{ width: '14px', height: '14px' }} />
                  Connect Wallet
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Role badge */}
                  {isAuthenticated && userRole && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: userRole === 'ADMIN' ? 'rgba(239,68,68,0.12)' :
                        userRole === 'ASSET_ISSUER' ? 'rgba(59,130,246,0.12)' :
                          userRole === 'VERIFIER' ? 'rgba(245,158,11,0.12)' : 'rgba(0,224,138,0.12)',
                      color: userRole === 'ADMIN' ? '#ef4444' :
                        userRole === 'ASSET_ISSUER' ? '#3b82f6' :
                          userRole === 'VERIFIER' ? '#f59e0b' : '#00e08a',
                      border: `1px solid ${userRole === 'ADMIN' ? 'rgba(239,68,68,0.25)' :
                        userRole === 'ASSET_ISSUER' ? 'rgba(59,130,246,0.25)' :
                          userRole === 'VERIFIER' ? 'rgba(245,158,11,0.25)' : 'rgba(0,224,138,0.25)'}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                    }}>
                      {userRole.replace('_', ' ')}
                    </span>
                  )}
                  {/* Connected address */}
                  <div
                    onClick={() => setWalletModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,224,138,0.3)',
                      background: 'rgba(0,224,138,0.06)',
                      color: '#00e08a',
                      fontSize: '12px',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      letterSpacing: '0.3px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,224,138,0.5)';
                      e.currentTarget.style.background = 'rgba(0,224,138,0.10)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,224,138,0.3)';
                      e.currentTarget.style.background = 'rgba(0,224,138,0.06)';
                    }}
                  >
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: isAuthenticated ? '#00e08a' : '#f59e0b',
                      boxShadow: `0 0 8px ${isAuthenticated ? 'rgba(0,224,138,0.5)' : 'rgba(245,158,11,0.5)'}`,
                    }} />
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Navigation row ──────────────────────────────────────── */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '0 16px 10px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.3px',
                    color: isActive ? '#00e08a' : 'rgba(240,246,243,0.65)',
                    background: isActive ? 'rgba(0,224,138,0.10)' : 'transparent',
                    border: isActive ? '1px solid rgba(0,224,138,0.2)' : '1px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#e0f5ec';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'rgba(240,246,243,0.65)';
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <Icon style={{
                    width: '14px',
                    height: '14px',
                    opacity: isActive ? 1 : 0.5,
                    transition: 'opacity 0.25s',
                  }} />
                  {item.name}
                  {/* Active underline */}
                  {isActive && (
                    <motion.div
                      layoutId="navActiveIndicator"
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '12px',
                        right: '12px',
                        height: '2px',
                        borderRadius: '1px',
                        background: '#00e08a',
                        boxShadow: '0 0 8px rgba(0,224,138,0.5)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}

            {/* MORE Dropdown */}
            <div ref={moreRef} style={{ position: 'relative', marginLeft: 'auto' }}>
              <button
                onClick={() => setMoreOpen(o => !o)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  color: moreOpen ? '#00e08a' : 'rgba(240,246,243,0.65)',
                  background: moreOpen ? 'rgba(0,224,138,0.10)' : 'transparent',
                  border: moreOpen ? '1px solid rgba(0,224,138,0.2)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!moreOpen) {
                    e.currentTarget.style.color = '#e0f5ec';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!moreOpen) {
                    e.currentTarget.style.color = 'rgba(240,246,243,0.65)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <MoreHorizontal style={{ width: '14px', height: '14px', opacity: 0.6 }} />
                More
                <ChevronDown style={{
                  width: '12px', height: '12px',
                  transition: 'transform 0.25s',
                  transform: moreOpen ? 'rotate(180deg)' : 'rotate(0)',
                }} />
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: '200px',
                      borderRadius: '12px',
                      background: 'rgba(7, 17, 13, 0.92)',
                      backdropFilter: 'blur(20px) saturate(1.4)',
                      WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
                      border: '1px solid rgba(0,224,138,0.15)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset',
                      padding: '6px',
                      zIndex: 50,
                    }}
                  >
                    {moreNav.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMoreOpen(false)}
                          style={{
                            display: 'block',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? '#00e08a' : 'rgba(240,246,243,0.7)',
                            background: isActive ? 'rgba(0,224,138,0.10)' : 'transparent',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.2px',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.color = '#e0f5ec';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'rgba(240,246,243,0.7)';
                            }
                          }}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>
      </header>

      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </>
  );
};
