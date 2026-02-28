import React from 'react';
import { FileText, Download } from 'lucide-react';

const sections = [
  {
    num: '1',
    title: 'ABSTRACT',
    content: `This whitepaper presents a decentralized real-world asset tokenization platform built on the Algorand blockchain. The platform enables fractional ownership of physical assets (real estate, commodities, art) through Algorand Standard Assets (ASAs), providing global liquidity, transparent income distribution, and democratic governance to asset owners and investors.`,
  },
  {
    num: '2',
    title: 'PROBLEM STATEMENT',
    content: `Traditional real-world asset investment suffers from: (1) High minimum investments excluding retail investors; (2) Illiquidity — assets cannot be easily sold; (3) Geographic barriers limiting cross-border investment; (4) Opaque fee structures and management; (5) Slow settlement times. Blockchain tokenization addresses all five issues simultaneously.`,
  },
  {
    num: '3',
    title: 'SOLUTION: ALGORAND ASA TOKENIZATION',
    content: `By representing ownership as Algorand Standard Assets, we achieve: sub-4-second finality, 0.001 ALGO transaction fees (~$0.0001), built-in freeze/clawback for compliance, native atomic swaps for trustless trades, and full on-chain auditability. Algorand's carbon-negative pure proof-of-stake consensus ensures environmental sustainability.`,
  },
  {
    num: '4',
    title: 'TOKENOMICS',
    content: `Each asset is tokenized into a configurable number of units (typically 1,000–10,000,000 depending on asset value). Minimum unit price: 0.001 ALGO (~$0.00001). Platform fee: 0.5% per trade. Income distribution is proportional to token holdings. Governance voting power equals token balance squared to prevent whale dominance.`,
  },
  {
    num: '5',
    title: 'SMART CONTRACT ARCHITECTURE',
    content: `Three PyTeal contracts govern the platform: AssetTokenizationContract (ASA lifecycle), IncomeDistributionContract (yield management), and GovernanceContract (voting). Contracts are stateful applications on Algorand, storing global state (totals) and local state (per-holder balances claimed). All source code is open-sourced under MIT license.`,
  },
  {
    num: '6',
    title: 'SECURITY & AUDITS',
    content: `Smart contracts have undergone security audits covering: integer overflow/underflow, re-entrancy (N/A on Algorand's AVM), access control, economic attacks, and front-running. The Algorand AVM executes contracts deterministically with strict resource limits. Multi-sig admin controls prevent single-point-of-failure.`,
  },
  {
    num: '7',
    title: 'ROADMAP',
    content: `Q1: Testnet launch, KYC integration. Q2: Mainnet launch, first real estate tokenization, mobile app. Q3: Derivatives/options on tokenized assets, secondary market AMM. Q4: Cross-chain bridge to EVM networks, institutional API, regulated offering in EU/US.`,
  },
  {
    num: '8',
    title: 'CONCLUSION',
    content: `Asset tokenization on Algorand represents a paradigm shift in how people invest in real-world assets. By combining institutional-grade compliance with blockchain's transparency and programmability, we create a globally accessible investment platform with unprecedented liquidity and fairness. The future of asset ownership is fractional, digital, and on-chain.`,
  },
];

const WhitepaperPage: React.FC = () => (
  <div className="container mx-auto px-4 py-8 max-w-4xl">
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <FileText className="w-8 h-8 text-accent" />
        <div>
          <h1 className="text-3xl font-bold uppercase">WHITEPAPER</h1>
          <p className="text-muted-foreground text-sm">Decentralized Real-World Asset Tokenization on Algorand</p>
        </div>
      </div>
      <button className="flex items-center gap-2 px-4 py-2 border-2 border-accent text-accent font-bold uppercase text-sm hover:bg-accent hover:text-black transition-colors">
        <Download className="w-4 h-4" /> DOWNLOAD PDF
      </button>
    </div>

    <div className="border-4 border-foreground p-6 mb-6 bg-black">
      <div className="text-center space-y-1">
        <div className="text-xs text-muted-foreground uppercase">Version 1.0 — {new Date().getFullYear()}</div>
        <h2 className="text-2xl font-bold uppercase">DECENTRALIZED REAL-WORLD ASSET TOKENIZATION</h2>
        <p className="text-accent font-mono">A Blockchain-Based Fractional Ownership Platform on Algorand</p>
      </div>
    </div>

    <div className="space-y-4">
      {sections.map(s => (
        <div key={s.num} className="border-2 border-foreground bg-black">
          <div className="flex items-center gap-4 p-4 border-b border-foreground/30">
            <span className="w-8 h-8 bg-accent text-black font-bold flex items-center justify-center text-sm flex-shrink-0">
              {s.num}
            </span>
            <h2 className="font-bold uppercase">{s.title}</h2>
          </div>
          <p className="p-4 text-sm text-muted-foreground leading-relaxed">{s.content}</p>
        </div>
      ))}
    </div>
  </div>
);

export default WhitepaperPage;
