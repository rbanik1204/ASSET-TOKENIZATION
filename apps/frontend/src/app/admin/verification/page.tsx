'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AsaBadge } from '@/components/algorand/AsaBadge';
import { Button } from '@/components/ui/Button';

interface PendingAsset {
  id: string;
  asaId: number;
  assetName: string;
  assetType: string;
  location: string;
  valuation: number;
  submitter: string;
  submittedAt: string;
  metadataUri: string;
}

export default function VerificationAdminPage() {
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [contractInfo, setContractInfo] = useState<any>(null);

  useEffect(() => {
    loadPendingAssets();
    loadContractInfo();
  }, []);

  const loadPendingAssets = async () => {
    try {
      setLoading(true);
      
      // Fetch pending assets from API
      const response = await fetch('/api/verification/pending');
      
      if (!response.ok) {
        throw new Error('Failed to load pending assets');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.assets)) {
        setPendingAssets(data.assets);
      } else {
        setPendingAssets([]);
      }
    } catch (error) {
      console.error('Failed to load pending assets:', error);
      setPendingAssets([]);
      alert('⚠️ Failed to load pending assets. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadContractInfo = async () => {
    try {
      const response = await fetch('/api/verification/contract-info');
      const data = await response.json();
      setContractInfo(data);
    } catch (error) {
      console.error('Failed to load contract info:', error);
    }
  };

  const handleVerify = async (asset: PendingAsset) => {
    if (!confirm(`Verify asset: ${asset.assetName}?`)) return;

    setVerifying(asset.id);

    try {
      const response = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asaId: asset.asaId })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Asset verified!\n\nTX: ${result.txId}\n\nView on AlgoExplorer:\n${result.explorerUrl}`);
        loadPendingAssets(); // Reload list
      } else {
        alert(`❌ Verification failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Verification failed. Check console for details.');
    } finally {
      setVerifying(null);
    }
  };

  const handleReject = async (asset: PendingAsset) => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    if (!confirm(`Reject asset: ${asset.assetName}?`)) return;

    setRejecting(asset.id);

    try {
      const response = await fetch('/api/verification/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          asaId: asset.asaId,
          reason: rejectReason
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`❌ Asset rejected!\n\nTX: ${result.txId}\n\nView on AlgoExplorer:\n${result.explorerUrl}`);
        setRejectReason('');
        setRejecting(null);
        loadPendingAssets(); // Reload list
      } else {
        alert(`❌ Rejection failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Rejection error:', error);
      alert('Rejection failed. Check console for details.');
    } finally {
      setRejecting(null);
    }
  };

  const handleDeployContract = async () => {
    if (!confirm('Deploy verification smart contract to Algorand?')) return;

    try {
      const response = await fetch('/api/verification/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Contract deployed!\n\nApp ID: ${result.appId}\n\nView on AlgoExplorer:\n${result.explorerUrl}`);
        loadContractInfo();
      } else {
        alert(`❌ Deployment failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert('Deployment failed. Check console for details.');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#F5F7FA]">🟣 Asset Verification</h1>
            <p className="text-[#B0B7C3] mt-2">
              Review and verify assets on-chain via Algorand smart contract
            </p>
          </div>

          {contractInfo && contractInfo.success && (
            <a
              href={contractInfo.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-600/30 transition-colors flex items-center gap-2"
            >
              <span>Contract App ID: {contractInfo.appId}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          {contractInfo && !contractInfo.success && (
            <button
              onClick={handleDeployContract}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
            >
              Deploy Verification Contract
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#0F1115] border border-[#1F232B] rounded-xl p-6">
            <div className="text-[#6B7280] text-sm mb-2">⏳ Pending Review</div>
            <div className="text-3xl font-bold text-white">{pendingAssets.length}</div>
          </div>
          <div className="bg-[#0F1115] border border-[#1F232B] rounded-xl p-6">
            <div className="text-[#6B7280] text-sm mb-2">✅ Verified Today</div>
            <div className="text-3xl font-bold text-green-400">0</div>
          </div>
          <div className="bg-[#0F1115] border border-[#1F232B] rounded-xl p-6">
            <div className="text-[#6B7280] text-sm mb-2">❌ Rejected Today</div>
            <div className="text-3xl font-bold text-red-400">0</div>
          </div>
        </div>

        {/* Pending Assets List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-[#6B7280]">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent mx-auto mb-4" />
              Loading pending assets...
            </div>
          ) : pendingAssets.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg">No pending assets to review</p>
            </div>
          ) : (
            pendingAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-[#0F1115] border border-[#1F232B] rounded-xl p-6 hover:border-blue-500/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Asset Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-white">{asset.assetName}</h3>
                      <AsaBadge asaId={asset.asaId} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-[#6B7280]">Type</div>
                        <div className="text-white font-medium">{asset.assetType}</div>
                      </div>
                      <div>
                        <div className="text-[#6B7280]">Location</div>
                        <div className="text-white font-medium">{asset.location}</div>
                      </div>
                      <div>
                        <div className="text-[#6B7280]">Valuation</div>
                        <div className="text-white font-medium">${asset.valuation.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[#6B7280]">Submitted</div>
                        <div className="text-white font-medium">
                          {new Date(asset.submittedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <span className="text-[#6B7280]">Submitter: </span>
                      <span className="text-white font-mono">{asset.submitter}</span>
                    </div>

                    {rejecting === asset.id && (
                      <div className="mt-4">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Enter rejection reason..."
                          className="w-full px-3 py-2 bg-[#14161B] border border-[#1F232B] rounded-lg text-white placeholder-[#6B7280] resize-none"
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleVerify(asset)}
                      disabled={verifying === asset.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {verifying === asset.id ? '⏳ Verifying...' : '✅ Verify'}
                    </button>

                    {rejecting === asset.id ? (
                      <>
                        <button
                          onClick={() => handleReject(asset)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => {
                            setRejecting(null);
                            setRejectReason('');
                          }}
                          className="px-4 py-2 bg-[#1A1D23] hover:bg-[#14161B] rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setRejecting(asset.id)}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm font-medium transition-colors"
                      >
                        ❌ Reject
                      </button>
                    )}

                    <a
                      href={asset.metadataUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#1A1D23] hover:bg-[#14161B] rounded-lg text-sm transition-colors text-center"
                    >
                      📄 Metadata
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
