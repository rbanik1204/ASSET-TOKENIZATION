import React, { useEffect, useState } from 'react';
import {
  Settings, Users, Package, CheckCircle, XCircle, Clock, RefreshCw,
  ExternalLink, BarChart3, FileText, Download, Eye, AlertCircle,
} from 'lucide-react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { AsaBadge } from '../components/AsaBadge';
import { API_BASE, apiFetch } from '../config/api';
import { toast } from 'sonner';

type Tab = 'overview' | 'assets' | 'kyc' | 'compliance';

interface KycUser {
  walletAddress: string;
  fullName: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  livenessScore?: number;
  faceMatchScore?: number;
  faceMatchPassed?: boolean;
  ipfsAuditCid?: string;
}

interface SupportingDoc {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface PendingAsset {
  id: string;
  name: string;
  unitName: string;
  description: string;
  category: string;
  totalSupply: number;
  decimals: number;
  pricePerUnit: number;
  currency: string;
  asaId: number | null;
  asaCreator: string;
  ownerAddress: string;
  tokenizationStatus: string;
  verificationStatus: string;
  supportingDocuments: SupportingDoc[];
  ipfsCid: string | null;
  createdAt: string;
}

const ADMIN_WALLET = '6MK4VVHQRPKL2BQVKYJORHBHKEKSYT5WCECN6FNG6KDOHUS2ZF4XZMP534';

const AdminPage: React.FC = () => {
  const { address, network } = useAlgorand();
  const { assets, updateVerificationStatus, refreshAssets } = useAssetRegistry();
  const [tab, setTab] = useState<Tab>('overview');
  const [kycQueue, setKycQueue] = useState<KycUser[]>([]);
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [docPreview, setDocPreview] = useState<{ url: string; name: string } | null>(null);

  const isAdmin = address === ADMIN_WALLET;

  // ── All hooks & callbacks MUST be declared before any conditional returns ──

  // Fetch pending assets with documents from dedicated endpoint
  const fetchPendingAssets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/assets/pending-review`);
      const data = await res.json();
      setPendingAssets(data.data ?? data ?? []);
    } catch {
      setPendingAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;          // skip fetches when not admin
    if (tab === 'kyc') {
      setLoading(true);
      apiFetch(`${API_BASE}/kyc/pending`)
        .then(r => r.json())
        .then(d => {
          const data = d.data ?? d;
          setKycQueue(data.submissions || []);
        })
        .catch(() => setKycQueue([]))
        .finally(() => setLoading(false));
    }
    if (tab === 'assets') {
      fetchPendingAssets();
    }
  }, [tab, isAdmin]);

  const handleAssetVerify = async (assetId: string, approve: boolean) => {
    const reason = approve ? '' : (prompt('Rejection reason:') || '');
    try {
      const res = await apiFetch(`${API_BASE}/assets/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, approve, reason, reviewerAddress: address }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        updateVerificationStatus(assetId, approve ? 'approved' : 'rejected', reason || undefined);
        setPendingAssets(prev => prev.filter(a => a.id !== assetId));
        await refreshAssets();
        toast.success(`Asset ${approve ? 'approved — now eligible for marketplace' : 'rejected'}`);
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleKycDecision = async (walletAddress: string, approve: boolean) => {
    const reason = approve ? '' : (prompt('Rejection reason:') || '');
    try {
      const res = await apiFetch(`${API_BASE}/kyc/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, approve, reason, reviewerAddress: address }),
      });
      const data = await res.json();
      if (data.success) {
        setKycQueue(q => q.map(u =>
          u.walletAddress === walletAddress
            ? { ...u, status: approve ? 'approved' : 'rejected' }
            : u
        ));
        toast.success(`KYC ${approve ? 'approved' : 'rejected'} for ${walletAddress.slice(0, 8)}...`);
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const verifiedAssets = assets.filter(a => a.verificationStatus === 'approved');
  const totalAssets = assets.length;

  const explorerBase = network === 'mainnet'
    ? 'https://algoexplorer.io'
    : 'https://testnet.algoexplorer.io';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type?: string) => {
    if (!type) return '📎';
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('doc')) return '📝';
    return '📎';
  };

  // ── Conditional returns AFTER all hooks ──────────────────────────────────
  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-bold uppercase mb-2">ADMIN PANEL</h1>
        <p className="text-muted-foreground">Please connect your wallet to access the admin panel.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-bold uppercase mb-2">ACCESS DENIED</h1>
        <p className="text-muted-foreground mb-4">
          Only the platform admin wallet can access this panel.
        </p>
        <div className="text-xs font-mono text-muted-foreground border border-destructive/30 inline-block px-4 py-2 rounded">
          Your wallet: {address.slice(0, 12)}...{address.slice(-6)}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Required: {ADMIN_WALLET.slice(0, 12)}...{ADMIN_WALLET.slice(-6)}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Settings className="w-8 h-8 text-accent" />
        <div>
          <h1 className="text-3xl font-bold uppercase">ADMIN PANEL</h1>
          <p className="text-muted-foreground text-sm">Platform management, document verification & asset approval</p>
        </div>
        {address && (
          <div className="ml-auto text-xs font-mono text-muted-foreground border border-foreground px-3 py-1">
            {address.slice(0, 8)}...{address.slice(-4)}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-2 border-foreground mb-6">
        {([
          { key: 'overview', label: 'OVERVIEW' },
          { key: 'assets', label: `ASSET REVIEW (${pendingAssets.length})` },
          { key: 'kyc', label: `KYC QUEUE (${kycQueue.filter(k => k.status === 'pending').length})` },
          { key: 'compliance', label: 'COMPLIANCE' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-bold uppercase flex-1 transition-colors ${
              tab === t.key ? 'bg-accent text-black' : 'hover:bg-muted'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL ASSETS', value: totalAssets, icon: Package, color: 'text-accent' },
            { label: 'VERIFIED', value: verifiedAssets.length, icon: CheckCircle, color: 'text-green-400' },
            { label: 'PENDING REVIEW', value: pendingAssets.length, icon: Clock, color: 'text-yellow-400' },
            { label: 'KYC QUEUE', value: kycQueue.filter(k => k.status === 'pending').length, icon: Users, color: 'text-blue-400' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="border-4 border-foreground p-6 bg-black">
                <div className={`flex items-center gap-2 mb-3 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">{stat.label}</span>
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
              </div>
            );
          })}
          <div className="col-span-2 md:col-span-4 border-2 border-foreground p-6 bg-black">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-accent" />
              <span className="font-bold uppercase">RECENT ASSETS</span>
            </div>
            {assets.slice(0, 5).map(asset => (
              <div key={asset.id} className="flex items-center justify-between py-2 border-b border-foreground/20 last:border-0">
                <span className="text-sm font-bold">{asset.name}</span>
                <AsaBadge status={asset.verificationStatus as any} asaId={asset.asaId} network={network} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ASSETS — Document Review Queue */}
      {tab === 'assets' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : pendingAssets.length === 0 ? (
            <div className="border-2 border-foreground p-12 text-center">
              <CheckCircle className="w-10 h-10 text-accent mx-auto mb-3" />
              <p className="font-bold uppercase">NO PENDING ASSETS</p>
              <p className="text-sm text-muted-foreground mt-1">All assets have been reviewed</p>
            </div>
          ) : pendingAssets.map(asset => (
            <div key={asset.id} className="border-2 border-foreground bg-black">
              {/* Asset header */}
              <div className="p-5 pb-0">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-bold uppercase text-lg">{asset.name}</h3>
                    <div className="text-sm text-muted-foreground">{asset.unitName} — {asset.category}</div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      Owner: {asset.ownerAddress?.slice(0, 12)}...{asset.ownerAddress?.slice(-6)}
                    </div>
                    {asset.asaId && (
                      <a href={`${explorerBase}/asset/${asset.asaId}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline flex items-center gap-1 mt-1">
                        ASA #{asset.asaId} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <span className="text-xs font-bold uppercase border border-yellow-400 text-yellow-400 px-2 py-1">
                    PENDING REVIEW
                  </span>
                </div>

                {/* Asset details */}
                <div className="grid grid-cols-4 gap-3 text-sm mb-4">
                  {[
                    { label: 'TOTAL SUPPLY', value: Number(asset.totalSupply).toLocaleString() },
                    { label: 'PRICE/TOKEN', value: asset.pricePerUnit ? `${asset.pricePerUnit} ${asset.currency || 'ALGO'}` : 'N/A' },
                    { label: 'TOTAL VALUE', value: asset.pricePerUnit ? `${(Number(asset.totalSupply) * asset.pricePerUnit).toLocaleString()} ALGO` : 'N/A' },
                    { label: 'CREATED', value: new Date(asset.createdAt).toLocaleDateString() },
                  ].map(stat => (
                    <div key={stat.label} className="border border-foreground/30 p-2">
                      <div className="text-xs text-muted-foreground uppercase">{stat.label}</div>
                      <div className="font-bold text-sm">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {asset.description && (
                  <div className="text-sm text-muted-foreground mb-4 pb-3 border-b border-foreground/20">
                    {asset.description}
                  </div>
                )}
              </div>

              {/* Supporting Documents Section */}
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold uppercase text-accent">
                    Supporting Documents ({asset.supportingDocuments?.length || 0})
                  </span>
                </div>

                {(!asset.supportingDocuments || asset.supportingDocuments.length === 0) ? (
                  <div className="flex items-center gap-2 p-3 border border-destructive/30 bg-destructive/5 rounded">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <span className="text-xs text-destructive">No supporting documents were uploaded for this asset.</span>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {asset.supportingDocuments.map((doc: SupportingDoc, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 border border-foreground/20 bg-foreground/5 rounded">
                        <span className="text-lg flex-shrink-0">{getFileIcon(doc.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{doc.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.type || 'unknown'} — {formatFileSize(doc.size || 0)}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {doc.type?.includes('image') && (
                            <button
                              onClick={() => setDocPreview({ url: doc.url, name: doc.name })}
                              className="flex items-center gap-1 px-2 py-1 text-xs border border-foreground/30 hover:bg-foreground/10 transition-colors rounded"
                            >
                              <Eye className="w-3 h-3" /> Preview
                            </button>
                          )}
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-xs border border-accent/30 text-accent hover:bg-accent/10 transition-colors rounded"
                          >
                            <Download className="w-3 h-3" /> Open
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Approve / Reject buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-foreground/20">
                  <button onClick={() => handleAssetVerify(asset.id, true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-accent text-black font-bold uppercase text-sm hover:bg-accent/80 transition-colors flex-1 justify-center">
                    <CheckCircle className="w-4 h-4" /> APPROVE & LIST ON MARKETPLACE
                  </button>
                  <button onClick={() => handleAssetVerify(asset.id, false)}
                    className="flex items-center gap-2 px-6 py-2.5 border-2 border-destructive text-destructive font-bold uppercase text-sm hover:bg-destructive/10 transition-colors">
                    <XCircle className="w-4 h-4" /> REJECT
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KYC */}
      {tab === 'kyc' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : kycQueue.length === 0 ? (
            <div className="border-2 border-foreground p-12 text-center">
              <Users className="w-10 h-10 text-accent mx-auto mb-3" />
              <p className="font-bold uppercase">NO KYC SUBMISSIONS</p>
            </div>
          ) : kycQueue.map(user => (
            <div key={user.walletAddress} className="border-2 border-foreground p-5 bg-black">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold uppercase">{user.fullName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{user.walletAddress}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Submitted: {new Date(user.submittedAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`text-xs font-bold uppercase border px-2 py-1 ${
                  user.status === 'approved' ? 'border-accent text-accent' :
                  user.status === 'rejected' ? 'border-destructive text-destructive' :
                  'border-yellow-400 text-yellow-400'
                }`}>
                  {user.status}
                </span>
              </div>
              {/* Biometric scores */}
              <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                <div className="border border-foreground/30 p-2">
                  <div className="text-xs text-muted-foreground uppercase">LIVENESS</div>
                  <div className="font-bold text-accent">
                    {user.livenessScore ? `${(Number(user.livenessScore) * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </div>
                <div className="border border-foreground/30 p-2">
                  <div className="text-xs text-muted-foreground uppercase">FACE MATCH</div>
                  <div className={`font-bold ${user.faceMatchPassed ? 'text-green-400' : 'text-yellow-400'}`}>
                    {user.faceMatchScore ? `${(Number(user.faceMatchScore) * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </div>
                <div className="border border-foreground/30 p-2">
                  <div className="text-xs text-muted-foreground uppercase">IPFS AUDIT</div>
                  <div className="font-mono text-xs text-accent truncate">
                    {user.ipfsAuditCid ? user.ipfsAuditCid.slice(0, 12) + '...' : 'N/A'}
                  </div>
                </div>
              </div>
              {user.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleKycDecision(user.walletAddress, true)}
                    className="flex items-center gap-1 px-4 py-2 bg-accent text-black font-bold uppercase text-sm hover:bg-accent/80">
                    <CheckCircle className="w-4 h-4" /> APPROVE
                  </button>
                  <button onClick={() => handleKycDecision(user.walletAddress, false)}
                    className="flex items-center gap-1 px-4 py-2 border-2 border-destructive text-destructive font-bold uppercase text-sm hover:bg-destructive/10">
                    <XCircle className="w-4 h-4" /> REJECT
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* COMPLIANCE */}
      {tab === 'compliance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'AML SCREENING', status: 'ACTIVE', desc: 'Chainalysis integration monitoring all wallet addresses for suspicious activity' },
            { title: 'KYC PROVIDER', status: 'ACTIVE', desc: 'Sumsub integration for identity document verification' },
            { title: 'SANCTIONS CHECK', status: 'ACTIVE', desc: 'OFAC, EU, UN sanctions list checked on every transaction' },
            { title: 'AUDIT LOG', status: 'ACTIVE', desc: 'All admin actions logged with timestamp and reviewer address' },
          ].map(item => (
            <div key={item.title} className="border-2 border-foreground p-5 bg-black">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold uppercase">{item.title}</span>
                <span className="text-xs font-bold text-accent border border-accent px-2 py-0.5">{item.status}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      {docPreview && (
        <div
          onClick={() => setDocPreview(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              background: '#0a0f0d',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0f6f3' }}>{docPreview.name}</span>
              <button
                onClick={() => setDocPreview(null)}
                style={{
                  background: 'none', border: 'none', color: 'rgba(240,246,243,0.5)',
                  cursor: 'pointer', fontSize: '18px',
                }}
              >
                ✕
              </button>
            </div>
            <img
              src={docPreview.url}
              alt={docPreview.name}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
