'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import AlgorandWalletButton from '@/components/algorand/AlgorandWalletButton';
import { ChainSelectorStandalone } from '@/components/algorand/ChainSelectorStandalone';

export default function HomePage() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-[#0A0B0D]">
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-6xl font-bold mb-6 leading-tight text-[#F5F7FA]">
                Invest in Real Assets Through Blockchain
              </h1>
              <p className="text-xl text-[#B0B7C3] mb-8">
                Own fractional shares of real estate, equipment, and other high-value assets. 
                Trade instantly, earn income, and build wealth with complete transparency.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4">
                  <Link href="/marketplace">
                    <Button size="lg" variant="primary">
                      Explore Assets
                    </Button>
                  </Link>
                  <Link href="/algorand-demo">
                    <Button size="lg" variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
                      🟣 Algorand Demo
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <ChainSelectorStandalone />
                  <ConnectButton />
                  <AlgorandWalletButton />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  💡 Try Algorand: Ultra-fast (4.5s), ultra-cheap ($0.001), carbon-negative blockchain
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-[#0F1115]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-[#F5F7FA]">How It Works</h2>
            <p className="text-xl text-[#B0B7C3]">Simple, secure, and transparent investment process</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                title: 'Browse Assets',
                description: 'Explore tokenized real-world assets with detailed information and verification status.',
              },
              {
                title: 'Buy Tokens',
                description: 'Purchase fractional ownership using standardized sale flows and on-chain settlement.',
              },
              {
                title: 'Track Portfolio',
                description: 'Monitor your positions, transactions, and valuation inputs in one dashboard.',
              },
              {
                title: 'Operate',
                description: 'Manage income, sales, and liquidity with explicit confirmations and auditability.',
              },
            ].map((step, index) => (
              <div key={index} className="surface p-6 rounded-lg">
                <div className="w-9 h-9 rounded-md border border-[#1F232B] bg-[#1A1D23] flex items-center justify-center text-sm font-semibold text-[#F5F7FA]">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[#F5F7FA]">{step.title}</h3>
                <p className="mt-2 text-[#B0B7C3]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Algorand Features Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-4">
              <span className="text-2xl">🟣</span>
              <span className="text-blue-400 font-semibold">Powered by Algorand</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-[#F5F7FA]">Why Algorand for Campus Assets?</h2>
            <p className="text-xl text-[#B0B7C3]">Revolutionary blockchain purpose-built for real-world tokenization</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: '⚡',
                title: '4.5 Second Finality',
                description: 'Transactions confirm in under 5 seconds - faster than credit cards',
                stat: '4.5s',
              },
              {
                icon: '💰',
                title: 'Ultra-Low Fees',
                description: 'Only $0.001 per transaction - 1000x cheaper than Ethereum',
                stat: '$0.001',
              },
              {
                icon: '🌱',
                title: 'Carbon Negative',
                description: 'Environmentally friendly Layer-1 blockchain',
                stat: '< 0.0',
              },
              {
                icon: '🔒',
                title: 'Enterprise Security',
                description: 'Pure Proof-of-Stake with instant finality - no forks',
                stat: '100%',
              },
              {
                icon: '🪙',
                title: 'Native ASAs',
                description: 'Create campus tokens (dorm rooms, gym passes) with built-in features',
                stat: 'Layer-1',
              },
              {
                icon: '📱',
                title: 'Mobile-First',
                description: 'Seamless wallet experience with Pera & Defly on iOS/Android',
                stat: 'Easy',
              },
            ].map((feature, index) => (
              <div key={index} className="bg-[#0F1115]/80 backdrop-blur-sm p-6 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all hover:scale-105">
                <div className="text-4xl mb-3">{feature.icon}</div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-lg font-semibold text-[#F5F7FA]">{feature.title}</h3>
                  <span className="text-blue-400 font-bold text-sm">{feature.stat}</span>
                </div>
                <p className="text-sm text-[#B0B7C3]">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold text-[#F5F7FA] mb-4">Ready to Experience Algorand?</h3>
            <p className="text-[#B0B7C3] mb-6 max-w-2xl mx-auto">
              Connect your Pera or Defly wallet and try creating campus asset tokens, sending payments, 
              and experiencing the fastest blockchain for real-world assets.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/algorand-demo">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  🚀 Launch Algorand Demo
                </Button>
              </Link>
              <a href="https://bank.testnet.algorand.network/" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
                  💧 Get Free Testnet ALGO
                </Button>
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              💡 Testnet ready: Your wallet <span className="font-mono text-blue-400">CZBNQ...E6A</span> is funded and ready to go!
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-[#0A0B0D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-[#F5F7FA]">Why Choose AssetToken?</h2>
            <p className="text-xl text-[#B0B7C3]">Revolutionary benefits of blockchain-powered asset ownership</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Fractional Ownership',
                description: 'Access high-value assets with minimal capital. Own a fraction, not the entire asset.',
                icon: (
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: 'Instant Liquidity',
                description: 'Trade tokens 24/7 through automated market makers. No waiting, no brokers.',
                icon: (
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                title: 'Full Transparency',
                description: 'Every transaction, document, and ownership record is verifiable on the blockchain.',
                icon: (
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                title: 'Passive Income',
                description: 'Earn regular income from rent, leases, or asset utilization without active management.',
                icon: (
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: 'Verified Assets',
                description: 'All assets are verified by trusted oracles and backed by legal documentation.',
                icon: (
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: 'Low Fees',
                description: 'Blockchain efficiency means lower transaction costs compared to traditional platforms.',
                icon: (
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                ),
              },
            ].map((benefit, index) => (
              <div key={index} className="surface p-8 rounded-lg hover:border-[#3B82F6] transition-all duration-300 group">
                <div className="text-[#3B82F6] mb-4 group-hover:scale-110 transition-transform">{benefit.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-[#F5F7FA]">{benefit.title}</h3>
                <p className="text-[#B0B7C3]">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden bg-[#0F1115]">
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4 text-[#F5F7FA]">
            Ready to Start Investing?
          </h2>
          <p className="text-xl text-[#B0B7C3] mb-8">
            Connect your wallet and explore tokenized assets today
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/marketplace">
              <Button size="lg" variant="primary">
                View Marketplace
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-[#1F232B] text-[#F5F7FA] hover:bg-[#14161B]">
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
