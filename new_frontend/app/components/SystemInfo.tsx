import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SystemInfo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent text-black border-4 border-foreground hover:bg-accent/80 transition-colors flex items-center justify-center"
      >
        <Info className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 overflow-y-auto"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black border-4 border-accent p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold uppercase mb-2">SYSTEM DOCUMENTATION</h2>
                  <div className="text-accent text-sm uppercase font-bold">
                    Infrastructure-Grade Asset Tokenization Platform
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-accent/20 border-2 border-foreground"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 text-sm">
                <section className="border-2 border-foreground p-4">
                  <h3 className="font-bold uppercase mb-3 text-lg">CORE FEATURES</h3>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5" />
                      <div>
                        <strong>Wallet Integration:</strong> Pera Wallet and Defly Wallet support via WalletConnect protocol. 
                        Persistent sessions, network switching (TestNet/MainNet), real-time balance updates.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5" />
                      <div>
                        <strong>ASA Tokenization:</strong> Create Algorand Standard Assets with custom metadata, supply, 
                        decimals, and role addresses (manager, reserve, freeze, clawback).
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5" />
                      <div>
                        <strong>Verification Workflow:</strong> Compliance review system with approve/reject logic, 
                        verification reasons, and status tracking. Only verified assets enter marketplace.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5" />
                      <div>
                        <strong>Marketplace:</strong> Browse and purchase fractional ownership via atomic swap simulation. 
                        Real-time pricing, confirmation modals, transaction tracking.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5" />
                      <div>
                        <strong>Analytics Dashboard:</strong> Recharts-powered visualizations showing asset distribution, 
                        transaction volume, verification status, and top assets by supply.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5" />
                      <div>
                        <strong>Governance:</strong> On-chain proposal system with weighted voting, quorum requirements, 
                        and transparent vote tallying. Proposal types: parameter, asset-approval, governance, emergency.
                      </div>
                    </li>
                  </ul>
                </section>

                <section className="border-2 border-foreground p-4">
                  <h3 className="font-bold uppercase mb-3 text-lg">TECHNICAL ARCHITECTURE</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-accent font-bold mb-2">BLOCKCHAIN LAYER</div>
                      <ul className="space-y-1 ml-4 text-xs">
                        <li>• Algorand SDK (algosdk)</li>
                        <li>• AlgoNode API endpoints</li>
                        <li>• Indexer integration</li>
                        <li>• ASA creation & management</li>
                        <li>• Atomic transactions</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-accent font-bold mb-2">FRONTEND STACK</div>
                      <ul className="space-y-1 ml-4 text-xs">
                        <li>• React 18 + TypeScript</li>
                        <li>• React Router (Data mode)</li>
                        <li>• Context API state management</li>
                        <li>• Motion (Framer Motion)</li>
                        <li>• Recharts visualization</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-accent font-bold mb-2">DESIGN SYSTEM</div>
                      <ul className="space-y-1 ml-4 text-xs">
                        <li>• Neo-brutalist UI</li>
                        <li>• Tailwind CSS v4</li>
                        <li>• High-contrast theming</li>
                        <li>• 3D wireframe canvas</li>
                        <li>• Zero border-radius</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-accent font-bold mb-2">INFRASTRUCTURE</div>
                      <ul className="space-y-1 ml-4 text-xs">
                        <li>• LocalStorage persistence</li>
                        <li>• QR code generation</li>
                        <li>• AlgoExplorer integration</li>
                        <li>• CSV/JSON export</li>
                        <li>• Real-time polling</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="border-2 border-foreground p-4">
                  <h3 className="font-bold uppercase mb-3 text-lg">WORKFLOW DEMONSTRATION</h3>
                  <ol className="space-y-3 ml-4">
                    <li className="flex gap-3">
                      <div className="font-bold text-accent">1.</div>
                      <div>
                        <strong>Connect Wallet:</strong> Click "CONNECT" in header, select Pera or Defly, 
                        scan QR code (simulated). Toggle TestNet/MainNet as needed.
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <div className="font-bold text-accent">2.</div>
                      <div>
                        <strong>Create Asset:</strong> Navigate to TOKENIZE, fill ASA metadata form, 
                        review parameters, submit. Asset enters pending verification.
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <div className="font-bold text-accent">3.</div>
                      <div>
                        <strong>Verify Asset:</strong> Admin reviews in VERIFY section, approves or rejects 
                        with reason. Only approved assets appear in marketplace.
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <div className="font-bold text-accent">4.</div>
                      <div>
                        <strong>Browse Market:</strong> Filter and search verified assets in MARKETPLACE, 
                        view details, execute atomic swap purchase with confirmation modal.
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <div className="font-bold text-accent">5.</div>
                      <div>
                        <strong>View Analytics:</strong> Real-time charts showing distribution, volume, 
                        transaction types. Export audit data as JSON.
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <div className="font-bold text-accent">6.</div>
                      <div>
                        <strong>Participate in Governance:</strong> Create proposals, vote FOR/AGAINST, 
                        track quorum and voting deadlines.
                      </div>
                    </li>
                  </ol>
                </section>

                <section className="border-2 border-foreground p-4 bg-accent/5">
                  <h3 className="font-bold uppercase mb-3 text-lg">PRODUCTION NOTES</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5 flex-shrink-0" />
                      <div>
                        This frontend connects to real Algorand networks (TestNet/MainNet) via AlgoNode APIs
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5 flex-shrink-0" />
                      <div>
                        Wallet connections are simulated - production requires WalletConnect v2 integration
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5 flex-shrink-0" />
                      <div>
                        Transaction signing would happen in connected wallet - currently generates simulated TxIDs
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5 flex-shrink-0" />
                      <div>
                        Backend (Supabase/PostgreSQL) would persist verification status, listings, and governance data
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-accent mt-1.5 flex-shrink-0" />
                      <div>
                        PyTeal smart contracts would enforce verification, atomic swaps, and income distribution on-chain
                      </div>
                    </div>
                  </div>
                </section>

                <section className="border-2 border-accent p-4">
                  <div className="text-center">
                    <div className="text-accent font-bold uppercase mb-2">READY FOR DEPLOYMENT</div>
                    <div className="text-xs text-muted-foreground">
                      This platform demonstrates production-grade architecture for compliant, 
                      transparent real-world asset tokenization on Algorand blockchain.
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
