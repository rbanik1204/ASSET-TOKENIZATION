import React, { useState } from 'react';
import { BookOpen, Code, Terminal, Layers } from 'lucide-react';

type DocSection = 'overview' | 'smart-contracts' | 'api' | 'sdk';

const sections: Record<DocSection, { title: string; icon: React.FC<{ className?: string }>; content: React.ReactNode }> = {
  overview: {
    title: 'OVERVIEW',
    icon: BookOpen,
    content: (
      <div className="space-y-6 text-sm">
        <div>
          <h3 className="font-bold uppercase mb-2 text-accent">ARCHITECTURE</h3>
          <p className="text-muted-foreground">The platform consists of three layers: Algorand smart contracts (PyTeal), a Node.js/Express backend (REST API + Algorand indexer bridge), and a React frontend.</p>
        </div>
        <div>
          <h3 className="font-bold uppercase mb-2">ASSET LIFECYCLE</h3>
          <ol className="list-decimal list-inside text-muted-foreground space-y-1">
            <li>Asset creator submits tokenization request</li>
            <li>Compliance team verifies documentation</li>
            <li>Admin approves → ASA is minted on Algorand</li>
            <li>Fractions listed on marketplace</li>
            <li>Buyers use atomic swaps to purchase fractions</li>
            <li>Income deposited → token holders claim proportionally</li>
          </ol>
        </div>
        <div>
          <h3 className="font-bold uppercase mb-2">KEY CONCEPTS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { term: 'ASA', def: 'Algorand Standard Asset — on-chain token representing ownership fractions' },
              { term: 'Atomic Swap', def: 'Trustless simultaneous exchange of ALGO for ASA tokens' },
              { term: 'Income Contract', def: 'TEAL smart contract managing income deposits and claims' },
              { term: 'Governance', def: 'On-chain voting for asset management decisions' },
            ].map(({ term, def }) => (
              <div key={term} className="border border-foreground/30 p-3">
                <span className="font-mono text-accent font-bold">{term}</span>
                <p className="text-muted-foreground text-xs mt-1">{def}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  'smart-contracts': {
    title: 'SMART CONTRACTS',
    icon: Layers,
    content: (
      <div className="space-y-6 text-sm">
        {[
          {
            name: 'AssetTokenizationContract',
            file: 'asset_tokenization.py',
            desc: 'Creates and manages ASA tokens. Handles minting, transfers, and metadata.',
            methods: ['create_asset(name, symbol, supply, decimals, url)', 'update_metadata(url)', 'freeze_account(address)', 'opt_in()'],
          },
          {
            name: 'IncomeDistributionContract',
            file: 'income_distribution.py',
            desc: 'Manages income deposits and proportional claiming by token holders.',
            methods: ['deposit_income(amount)', 'claim_income(asa_id)', 'get_claimable(address)', 'emergency_withdraw()'],
          },
          {
            name: 'GovernanceContract',
            file: 'governance.py',
            desc: 'Weighted on-chain voting proportional to token holdings.',
            methods: ['create_proposal(title, description, end_time)', 'cast_vote(proposal_id, vote)', 'execute_proposal(proposal_id)', 'get_voting_power(address)'],
          },
        ].map(contract => (
          <div key={contract.name} className="border-2 border-foreground p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold uppercase">{contract.name}</span>
              <span className="font-mono text-xs text-accent">{contract.file}</span>
            </div>
            <p className="text-muted-foreground mb-3">{contract.desc}</p>
            <div>
              <div className="text-xs font-bold uppercase mb-1 text-muted-foreground">METHODS</div>
              {contract.methods.map(m => (
                <div key={m} className="font-mono text-xs bg-black border border-foreground/20 px-2 py-1 mb-1">{m}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  api: {
    title: 'REST API',
    icon: Code,
    content: (
      <div className="space-y-4 text-sm">
        {[
          { method: 'GET', path: '/api/assets', desc: 'List all tokenized assets' },
          { method: 'POST', path: '/api/assets/tokenize', desc: 'Submit new asset for tokenization' },
          { method: 'GET', path: '/api/assets/:id', desc: 'Get asset details by ID' },
          { method: 'POST', path: '/api/assets/verify', desc: 'Admin: approve or reject asset' },
          { method: 'GET', path: '/api/marketplace', desc: 'Get marketplace listings' },
          { method: 'POST', path: '/api/swap/estimate', desc: 'Estimate atomic swap costs' },
          { method: 'POST', path: '/api/swap/execute', desc: 'Execute atomic swap' },
          { method: 'GET', path: '/api/income/contract-state', desc: 'Get income contract state' },
          { method: 'POST', path: '/api/income/claim', desc: 'Claim income distribution' },
          { method: 'GET', path: '/api/indexer/asset/:asaId/transactions', desc: 'Get ASA transaction history' },
          { method: 'POST', path: '/api/kyc/submit', desc: 'Submit KYC documents' },
          { method: 'GET', path: '/api/notifications', desc: 'Get user notifications' },
        ].map(ep => (
          <div key={ep.path} className="flex items-center gap-3 border border-foreground/30 p-3">
            <span className={`font-mono text-xs font-bold px-2 py-0.5 flex-shrink-0 ${
              ep.method === 'GET' ? 'bg-blue-400/20 text-blue-400' : 'bg-accent/20 text-accent'
            }`}>
              {ep.method}
            </span>
            <span className="font-mono text-xs flex-shrink-0">{ep.path}</span>
            <span className="text-muted-foreground text-xs">{ep.desc}</span>
          </div>
        ))}
      </div>
    ),
  },
  sdk: {
    title: 'SDK & INTEGRATION',
    icon: Terminal,
    content: (
      <div className="space-y-6 text-sm">
        <div>
          <h3 className="font-bold uppercase mb-2">ALGORAND SDK</h3>
          <pre className="bg-black border-2 border-foreground p-4 text-xs overflow-x-auto text-accent">
{`npm install algosdk

// Connect to Algorand TestNet
const algod = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
const indexer = new algosdk.Indexer('', 'https://testnet-idx.algonode.cloud', '');

// Opt into an ASA
const atxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
  from: address,
  to: address,
  amount: 0,
  assetIndex: asaId,
  suggestedParams,
});`}
          </pre>
        </div>
        <div>
          <h3 className="font-bold uppercase mb-2">REACT CONTEXT HOOKS</h3>
          <pre className="bg-black border-2 border-foreground p-4 text-xs overflow-x-auto text-accent">
{`import { useAlgorand } from './contexts/AlgorandContext';
import { useAssetRegistry } from './contexts/AssetRegistryContext';
import { useGovernance } from './contexts/GovernanceContext';

const { address, balance, assets, network, connectWallet } = useAlgorand();
const { assets: registry, addAsset, purchaseAsset } = useAssetRegistry();
const { proposals, createProposal, castVote } = useGovernance();`}
          </pre>
        </div>
      </div>
    ),
  },
};

const DocumentationPage: React.FC = () => {
  const [active, setActive] = useState<DocSection>('overview');
  const section = sections[active];
  const Icon = section.icon;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <BookOpen className="w-8 h-8 text-accent" />
        <h1 className="text-3xl font-bold uppercase">DOCUMENTATION</h1>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Side Nav */}
        <div className="md:w-48 flex-shrink-0">
          <div className="border-2 border-foreground">
            {(Object.entries(sections) as [DocSection, typeof sections[DocSection]][]).map(([key, s]) => {
              const SIcon = s.icon;
              return (
                <button key={key} onClick={() => setActive(key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase border-b border-foreground/20 last:border-0 transition-colors ${
                    active === key ? 'bg-accent text-black' : 'hover:bg-muted'
                  }`}>
                  <SIcon className="w-3 h-3" />
                  {s.title}
                </button>
              );
            })}
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 border-2 border-foreground p-6 bg-black">
          <div className="flex items-center gap-3 mb-6">
            <Icon className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold uppercase">{section.title}</h2>
          </div>
          {section.content}
        </div>
      </div>
    </div>
  );
};

export default DocumentationPage;
