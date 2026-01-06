import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#0F1115] border-t border-[#1F232B] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#3B82F6] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-bold text-[#F5F7FA]">AssetToken</span>
            </div>
            <p className="text-sm text-[#7C8496]">
              Democratizing access to real-world assets through blockchain technology.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-[#F5F7FA] font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/marketplace" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Marketplace</Link></li>
              <li><Link href="/list-asset" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">List Asset</Link></li>
              <li><Link href="/portfolio" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Portfolio</Link></li>
              <li><Link href="/sell" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Sell Assets</Link></li>
              <li><Link href="/income" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Income</Link></li>
              <li><Link href="/history" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">History</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-[#F5F7FA] font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/documentation" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Documentation</Link></li>
              <li><Link href="/whitepaper" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Whitepaper</Link></li>
              <li><Link href="/faq" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">FAQ</Link></li>
              <li><Link href="/support" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Support</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[#F5F7FA] font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/compliance" className="text-[#B0B7C3] hover:text-[#F5F7FA] transition-colors">Compliance</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1F232B] mt-8 pt-8 text-sm text-center text-[#7C8496]">
          <p>&copy; 2026 AssetToken Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
