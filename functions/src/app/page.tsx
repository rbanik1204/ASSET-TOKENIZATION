'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

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
              <div className="flex flex-wrap gap-4">
                <Link href="/marketplace">
                  <Button size="lg" variant="primary">
                    Explore Assets
                  </Button>
                </Link>
                <ConnectButton />
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
