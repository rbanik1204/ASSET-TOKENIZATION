import React from 'react';
import { Scale, Globe, Shield } from 'lucide-react';

const CompliancePage: React.FC = () => (
  <div className="container mx-auto px-4 py-8 max-w-4xl">
    <div className="flex items-center gap-4 mb-8">
      <Scale className="w-8 h-8 text-accent" />
      <div>
        <h1 className="text-3xl font-bold uppercase">COMPLIANCE</h1>
        <p className="text-muted-foreground text-sm">Regulatory framework & legal requirements</p>
      </div>
    </div>

    <div className="space-y-6">
      {[
        {
          icon: Shield,
          title: 'AML / KYC POLICY',
          content: `We comply with global Anti-Money Laundering (AML) regulations and require Know Your Customer (KYC) verification for all users. Identity documents are verified using Sumsub, a leading identity verification provider. All transactions are monitored for suspicious activity using Chainalysis blockchain analytics.`,
        },
        {
          icon: Globe,
          title: 'GEOGRAPHIC RESTRICTIONS',
          content: `The platform is not available to residents of countries on OFAC, EU, or UN sanctions lists, including but not limited to: Iran, North Korea, Syria, Cuba, Russia (certain sectors), and Belarus. Users from restricted jurisdictions will be blocked from KYC approval.`,
        },
        {
          icon: Scale,
          title: 'SECURITIES REGULATIONS',
          content: `Tokenized assets may be classified as securities in certain jurisdictions. We operate under applicable exemptions (e.g., Regulation D in the US, EU Crowdfunding Regulation in Europe). Accredited investor verification may be required for certain asset classes. Consult your local legal advisor before investing.`,
        },
        {
          icon: Shield,
          title: 'DATA PROTECTION (GDPR)',
          content: `We collect and process personal data in accordance with the EU General Data Protection Regulation (GDPR). KYC data is encrypted at rest and in transit. You have the right to access, correct, or delete your personal data. Contact our DPO at dpo@assettoken.io for data requests.`,
        },
        {
          icon: Scale,
          title: 'RISK DISCLOSURE',
          content: `Investing in tokenized assets carries significant risk including: loss of capital, liquidity risk (difficulty selling tokens), smart contract risk (bugs in code), regulatory risk (laws may change), and market risk (asset value fluctuation). Past performance does not guarantee future results. Only invest what you can afford to lose.`,
        },
        {
          icon: Shield,
          title: 'AUDIT & TRANSPARENCY',
          content: `Smart contracts are audited by independent security firms. Audit reports are publicly available on our GitHub repository. All on-chain transactions are publicly verifiable on Algorand Explorer. Admin actions are logged immutably for accountability.`,
        },
      ].map(({ icon: Icon, title, content }) => (
        <div key={title} className="border-2 border-foreground p-6 bg-black">
          <div className="flex items-center gap-3 mb-3">
            <Icon className="w-5 h-5 text-accent" />
            <h2 className="font-bold uppercase">{title}</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
        </div>
      ))}

      <div className="border-2 border-accent/50 p-4 text-xs text-muted-foreground">
        <strong className="text-accent">DISCLAIMER:</strong> This document is for informational purposes only and does not constitute legal advice. Tokenized assets are not FDIC-insured, not bank-guaranteed, and may lose value. Last updated: {new Date().getFullYear()}.
      </div>
    </div>
  </div>
);

export default CompliancePage;
