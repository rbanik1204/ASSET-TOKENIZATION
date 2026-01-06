import React, { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { KYCBanner } from '@/components/kyc/KYCBanner';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <KYCBanner />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
