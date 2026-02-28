import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What is asset tokenization?',
    a: 'Asset tokenization is the process of converting real-world assets (real estate, art, commodities) into digital tokens on a blockchain. Each token represents fractional ownership of the underlying asset.',
  },
  {
    q: 'Which blockchain does this platform use?',
    a: 'We operate on the Algorand blockchain — chosen for its low transaction fees (~0.001 ALGO), 4-second finality, and native support for Algorand Standard Assets (ASAs) which represent fractional ownership.',
  },
  {
    q: 'What wallet do I need?',
    a: 'We support Pera Wallet and Defly Wallet — both are free Algorand wallets available on iOS and Android. You can also connect via WalletConnect-compatible wallets.',
  },
  {
    q: 'What is KYC and why is it required?',
    a: "KYC (Know Your Customer) is an identity verification process required by financial regulations. It helps prevent money laundering and ensures legal compliance. You'll need to submit a government-issued ID and a selfie.",
  },
  {
    q: 'How do atomic swaps work?',
    a: 'An atomic swap is a smart contract-based technique that lets two parties exchange assets simultaneously. Either the entire exchange happens or neither party loses their assets — completely trustless.',
  },
  {
    q: 'How is income distributed?',
    a: 'Income (from rent, dividends, etc.) is deposited into an Algorand smart contract. Token holders can claim their proportional share at any time by calling the claim function.',
  },
  {
    q: 'What are the trading fees?',
    a: 'The platform charges a 0.5% transaction fee on all trades. The Algorand network fee is 0.002 ALGO per atomic swap (2 transactions × 0.001 ALGO each).',
  },
  {
    q: 'Is this available worldwide?',
    a: 'The platform is available in most jurisdictions. Some countries are excluded due to regulatory requirements (e.g., OFAC-sanctioned countries). Please check our Compliance page for details.',
  },
  {
    q: 'How do I tokenize my own asset?',
    a: 'Go to the Tokenize page, fill out the asset details (name, type, supply, price), submit for verification. Our compliance team will review the asset within 1–2 business days before it goes live on the marketplace.',
  },
  {
    q: 'What happens if the platform shuts down?',
    a: 'All tokens are ASAs on the Algorand blockchain — they exist independently of this platform. You retain full ownership on-chain and can transfer or sell tokens using any Algorand-compatible wallet.',
  },
];

const FAQPage: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <HelpCircle className="w-8 h-8 text-accent" />
        <h1 className="text-3xl font-bold uppercase">FREQUENTLY ASKED QUESTIONS</h1>
      </div>

      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className={`border-2 transition-colors ${open === i ? 'border-accent' : 'border-foreground'}`}>
            <button
              className="w-full flex items-center justify-between p-4 text-left font-bold uppercase text-sm"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span>{faq.q}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && (
              <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-foreground/30 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQPage;
