'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import AlgorandWalletButton from '@/components/algorand/AlgorandWalletButton';
import { ChainSelectorStandalone } from '@/components/algorand/ChainSelectorStandalone';

function shortenAddress(address: string) {
  if (!address) return '';
  const a = address.trim();
  if (a.length <= 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, address } = useAccount();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!address) {
        setIsAdmin(false);
        return;
      }

      try {
        const res = await fetch(`/api/admin/role/${address}`, { cache: 'no-store' });
        const json = (await res.json()) as any;
        if (!cancelled) setIsAdmin(res.ok && json?.role === 'admin');
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/algorand-demo', label: '🟣 Algorand', highlight: true, algorand: true },
    { href: '/list-asset', label: 'List Asset', requireWallet: true },
    { href: '/portfolio', label: 'Portfolio', requireWallet: true },
    { href: '/history', label: 'History', requireWallet: true },
    { href: '/sell', label: 'Sell', requireWallet: true },
    { href: '/income', label: 'Income', requireWallet: true },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <nav className="bg-[#0F1115] sticky top-0 z-40 border-b border-[#1F232B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#3B82F6] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#F5F7FA]">AssetToken</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.requireWallet && !isConnected ? '#' : item.href}
                aria-disabled={item.requireWallet && !isConnected}
                onClick={(e) => {
                  if (item.requireWallet && !isConnected) e.preventDefault();
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                  item.algorand
                    ? pathname === item.href
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-gradient-to-r from-blue-600/10 to-purple-600/10 text-blue-400 border border-blue-600/30 hover:from-blue-600/20 hover:to-purple-600/20'
                    : item.highlight
                    ? pathname === item.href
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                      : 'bg-gradient-to-r from-green-600/10 to-emerald-600/10 text-green-400 border border-green-600/30 hover:from-green-600/20 hover:to-emerald-600/20'
                    : pathname === item.href
                    ? 'bg-[#1A1D23] text-[#3B82F6]'
                    : 'text-[#B0B7C3] hover:text-[#F5F7FA] hover:bg-[#14161B]'
                } ${item.requireWallet && !isConnected ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center gap-2">
            <ChainSelectorStandalone />
            <NotificationBell />
            <AlgorandWalletButton />
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                if (!connected) {
                  return (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="px-3 py-2 rounded-md text-sm font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--panel-2)]"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain?.unsupported) {
                  return (
                    <button
                      type="button"
                      onClick={openChainModal}
                      className="px-3 py-2 rounded-md text-sm font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--panel-2)]"
                    >
                      Wrong network
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={openAccountModal}
                    className="px-3 py-2 rounded-md text-sm font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--panel-2)]"
                  >
                    {shortenAddress(account.address)}
                  </button>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </nav>
  );
}
