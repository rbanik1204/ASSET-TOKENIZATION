import React, { useState } from 'react';
import { Outlet } from 'react-router';
import { Header } from './components/Header';
import { InteractiveCoinHero } from './components/InteractiveCoinHero';
import { DemoDataLoader } from './components/DemoDataLoader';
import { SystemInfo } from './components/SystemInfo';
import { ScrollReveal } from './components/motion/MotionSystem';
import { LoadingScreen } from './components/LoadingScreen';
import { motion } from 'motion/react';

export const Layout: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    // Small delay before showing content for smooth transition
    setTimeout(() => setShowContent(true), 100);
  };

  return (
    <>
      {isLoading && <LoadingScreen onComplete={handleLoadingComplete} duration={2800} />}
      
      <motion.div 
        className="min-h-screen bg-background text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: showContent ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
      {/* Cinematic video background — fixed, sits behind everything */}
      <InteractiveCoinHero />

      <DemoDataLoader />
      <SystemInfo />
      <div className="relative" style={{ zIndex: 20 }}>
        <Header />
      </div>
      <main className="container mx-auto px-4 py-8 relative" style={{ zIndex: 10 }}>
        <Outlet />
      </main>
      <footer className="border-t-2 border-foreground/20 mt-16 py-6 relative bg-card/50 backdrop-blur-md" style={{ zIndex: 10 }}>
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-accent uppercase font-bold mb-2">PROTOCOL</div>
                <div className="text-sm space-y-1">
                  <div>Algorand Standard Assets</div>
                  <div>Pure Proof-of-Stake</div>
                  <div>Infrastructure-Grade</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-accent uppercase font-bold mb-2">COMPLIANCE</div>
                <div className="text-sm space-y-1">
                  <div>Verification Workflow</div>
                  <div>On-Chain Governance</div>
                  <div>Audit Trail Export</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-accent uppercase font-bold mb-2">DOCUMENTATION</div>
                <div className="text-sm space-y-1">
                  <div>AlgoExplorer Integration</div>
                  <div>Atomic Swap Support</div>
                  <div>Real Indexer Data</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
          <div className="mt-6 pt-6 border-t border-foreground text-center text-xs text-muted-foreground">
            <div className="uppercase font-mono">
              ALGORAND ASSET PROTOCOL © 2026 • TESTNET/MAINNET READY
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
    </>
  );
};