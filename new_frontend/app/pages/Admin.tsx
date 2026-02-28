import React, { useEffect, useState } from 'react';
import { Settings, Users, Package, CheckCircle, XCircle, Clock, RefreshCw, ExternalLink, BarChart3 } from 'lucide-react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { AsaBadge } from '../components/AsaBadge';
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

const AdminPage: React.FC = () => {
  const { address, network } = useAlgorand();
  const { assets, updateVerificationStatus } = useAssetRegistry();
  const [tab, setTab] = useState<Tab>('overview');
  const [kycQueue, setKycQueue] = useState<KycUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewReason, setReviewReason] = useState('');

  useEffect(() => {
    if (tab === 'kyc') {
      setLoading(true);
      fetch('http://localhost:3001/api/v1/kyc/pending')
        .then(r => r.json())
        .then(d => {
          const data = d.data ?? d;
          setKycQueue(data.submissions || []);
        })
        .catch(() => setKycQueue([]))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const handleAssetVerify = async (assetId: string, approve: boolean) => {
    const reason = approve ? '' : (reviewReason || prompt('Rejection reason:') || '');
    try {
      const res = await fetch('/api/assets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, approve, reason, reviewerAddress: address }),
      });
      const data = await res.json();
      if (data.success) {
        updateVerificationStatus(assetId, approve ? 'approved' : 'rejected', reason || undefined);
        toast.success(`Asset ${approve ? 'approved' : 'rejected'}`);
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleKycDecision = async (walletAddress: string, approve: boolean) => {
    const reason = approve ? '' : (prompt('Rejection reason:') || '');
    try {
      const res = await fetch('http://localhost:3001/api/v1/kyc/review', {
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

  const pendingAssets = assets.filter(a => a.verificationStatus === 'pending');
  const verifiedAssets = assets.filter(a => a.verificationStatus === 'approved');
  const totalAssets = assets.length;

  const explorerBase = network === 'mainnet'
    ? 'https://algoexplorer.io'
    : 'https://testnet.algoexplorer.io';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Settings className="w-8 h-8 text-accent" />
        <div>
          <h1 className="text-3xl font-bold uppercase">ADMIN PANEL</h1>
          <p className="text-muted-foreground text-sm">Platform management & verification</p>
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
          { key: 'assets', label: `ASSETS (${pendingAssets.length} PENDING)` },
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

      {/* ASSETS */}
      {tab === 'assets' && (
        <div className="space-y-4">
          {pendingAssets.length === 0 ? (
            <div className="border-2 border-foreground p-12 text-center">
              <CheckCircle className="w-10 h-10 text-accent mx-auto mb-3" />
              <p className="font-bold uppercase">NO PENDING ASSETS</p>
            </div>
          ) : pendingAssets.map(asset => (
            <div key={asset.id} className="border-2 border-foreground p-5 bg-black">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold uppercase text-lg">{asset.name}</h3>
                  <div className="text-sm text-muted-foreground">{asset.description}</div>
                  {asset.asaId && (
                    <a href={`${explorerBase}/asset/${asset.asaId}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1 mt-1">
                      ASA #{asset.asaId} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <AsaBadge status={asset.verificationStatus as any} size="md" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                {[
                  { label: 'TOTAL SUPPLY', value: asset.totalSupply?.toLocaleString() || 'N/A' },
                  { label: 'PRICE', value: asset.pricePerUnit ? `${asset.pricePerUnit} ALGO` : 'N/A' },
                  { label: 'CATEGORY', value: asset.category || 'N/A' },
                ].map(stat => (
                  <div key={stat.label} className="border border-foreground/30 p-2">
                    <div className="text-xs text-muted-foreground uppercase">{stat.label}</div>
                    <div className="font-bold">{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAssetVerify(asset.id, true)}
                  className="flex items-center gap-1 px-4 py-2 bg-accent text-black font-bold uppercase text-sm hover:bg-accent/80 transition-colors">
                  <CheckCircle className="w-4 h-4" /> APPROVE
                </button>
                <button onClick={() => handleAssetVerify(asset.id, false)}
                  className="flex items-center gap-1 px-4 py-2 border-2 border-destructive text-destructive font-bold uppercase text-sm hover:bg-destructive/10 transition-colors">
                  <XCircle className="w-4 h-4" /> REJECT
                </button>
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
    </div>
  );
};

export default AdminPage;
