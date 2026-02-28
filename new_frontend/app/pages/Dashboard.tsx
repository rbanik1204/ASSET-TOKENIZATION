import React from 'react';
import { Link } from 'react-router';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { useGovernance } from '../contexts/GovernanceContext';
import { ConnectedWalletInfo } from '../components/WalletModal';
import { ArrowUpRight, TrendingUp, Vote, FileText, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
  HoverLift,
  HoverScale,
  CountUp,
  PageTransition,
} from '../components/motion/MotionSystem';

export const Dashboard: React.FC = () => {
  const { address } = useAlgorand();
  const { assets: registeredAssets, transactions } = useAssetRegistry();
  const { proposals } = useGovernance();

  const stats = [
    { label: 'TOTAL ASSETS', value: registeredAssets.length, icon: FileText, color: 'accent' },
    { label: 'VERIFIED ASSETS', value: registeredAssets.filter(a => a.verificationStatus === 'approved').length, icon: TrendingUp, color: 'accent' },
    { label: 'ACTIVE PROPOSALS', value: proposals.filter(p => p.status === 'active').length, icon: Vote, color: 'accent' },
    { label: 'TRANSACTIONS', value: transactions.length, icon: Clock, color: 'accent' },
  ];

  const quickActions = [
    { label: 'Tokenize Asset', path: '/tokenize', description: 'Create new ASA with compliance' },
    { label: 'Browse Market', path: '/marketplace', description: 'Explore verified assets' },
    { label: 'View Analytics', path: '/analytics', description: 'Real-time indexer data' },
    { label: 'Governance', path: '/governance', description: 'Participate in voting' },
  ];

  const recentActivity = transactions.slice(0, 5);
  const glassCard = 'border border-accent/20 bg-card/70 backdrop-blur-xl shadow-[0_0_30px_rgba(0,224,138,0.08)] hover:shadow-[0_0_40px_rgba(0,224,138,0.15)] transition-shadow duration-300';

  return (
    <PageTransition className="space-y-8">
      {/* Hero Section — Transparent to show cinematic video background */}
      <section className="relative min-h-[600px] -mx-4 -mt-8 mb-4 overflow-hidden">
        {/* Text readability overlay — strong on left, fades toward center */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(90deg,
                rgba(3,10,7,0.92) 0%,
                rgba(3,10,7,0.75) 30%,
                rgba(7,17,13,0.35) 55%,
                transparent 80%
              )
            `,
          }}
        />
        
        {/* Content - positioned on left, letting visualization show on right */}
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center min-h-[600px] py-16 lg:max-w-[50%]">
          {/* Top badge */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 text-accent text-xs uppercase tracking-widest font-bold">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              Infrastructure for
            </span>
          </motion.div>
          
          {/* Large headline */}
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase leading-[0.9] mb-8 max-w-4xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <span className="text-foreground">Real-World</span>
            <br />
            <span className="text-accent">Asset</span>
            <br />
            <span className="text-foreground flex items-center gap-4">
              <span className="w-16 h-1 bg-accent hidden md:block" />
              Tokenization
            </span>
          </motion.h1>
          
          {/* Description */}
          <motion.p
            className="text-muted-foreground text-base md:text-lg max-w-xl mb-8 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Production-grade platform for compliant asset tokenization on Algorand. 
            Full verification workflow, atomic swaps, and transparent governance.
          </motion.p>
          
          {/* CTA / Wallet status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {!address ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/tokenize"
                  className="px-8 py-4 bg-accent text-background font-bold uppercase text-sm tracking-wider hover:bg-accent/90 transition-colors"
                >
                  Get Started
                </Link>
                <span className="text-muted-foreground text-sm">Connect wallet to begin</span>
              </div>
            ) : (
              <div className="inline-block">
                <ConnectedWalletInfo />
              </div>
            )}
          </motion.div>
        </div>
        
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Stats Grid */}
      <ScrollReveal direction="right">
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StaggerItem key={stat.label}>
          <HoverLift>
          <div
            className={`${glassCard} p-6 group`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                <stat.icon className="w-6 h-6 text-accent" />
              </div>
              <CountUp to={stat.value} className="text-4xl font-bold text-foreground" />
            </div>
            <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">{stat.label}</div>
          </div>
          </HoverLift>
          </StaggerItem>
        ))}
      </StaggerContainer>
      </ScrollReveal>

      {/* Quick Actions */}
      <ScrollReveal direction="left">
      <div className={`${glassCard} p-6`}>
        <h2 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-accent rounded-full" />
          QUICK ACTIONS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <HoverScale key={action.path}>
            <Link
              to={action.path}
              className="block border border-accent/20 p-5 hover:border-accent hover:bg-accent/5 transition-all group bg-background/30 backdrop-blur-sm shadow-lg hover:shadow-[0_0_20px_rgba(0,224,138,0.12)]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-bold uppercase text-sm text-foreground">{action.label}</div>
                <ArrowUpRight className="w-5 h-5 group-hover:text-accent transition-colors group-hover:translate-x-0.5 group-hover:-translate-y-0.5 duration-200" />
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">{action.description}</div>
            </Link>
            </HoverScale>
          ))}
        </div>
      </div>
      </ScrollReveal>

      {/* Recent Activity */}
      <ScrollReveal direction="right">
      <div className={`${glassCard} p-6`}>
        <h2 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-accent rounded-full" />
          RECENT ACTIVITY
        </h2>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <div className="uppercase text-sm">No activity recorded</div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 border border-accent/15 hover:border-accent/40 transition-colors bg-background/20 backdrop-blur-sm rounded"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${tx.status === 'confirmed' ? 'bg-accent shadow-[0_0_8px_rgba(0,224,138,0.6)]' : 'bg-destructive'}`} />
                  <div>
                    <div className="font-bold uppercase text-sm">{tx.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {tx.assetName || 'N/A'} • {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {tx.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </ScrollReveal>

      {/* System Info */}
      <ScrollReveal direction="left" delay={0.1}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${glassCard} p-4`}>
          <div className="text-xs text-accent uppercase font-bold mb-2">BLOCKCHAIN</div>
          <div className="font-mono text-sm">Algorand Layer-1</div>
        </div>
        <div className={`${glassCard} p-4`}>
          <div className="text-xs text-accent uppercase font-bold mb-2">CONSENSUS</div>
          <div className="font-mono text-sm">Pure Proof-of-Stake</div>
        </div>
        <div className={`${glassCard} p-4`}>
          <div className="text-xs text-accent uppercase font-bold mb-2">FINALITY</div>
          <div className="font-mono text-sm">~4.5 seconds</div>
        </div>
      </div>
      </ScrollReveal>
    </PageTransition>
  );
};
