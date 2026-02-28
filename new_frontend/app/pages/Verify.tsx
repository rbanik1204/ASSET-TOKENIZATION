import React, { useState } from 'react';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { CheckCircle, XCircle, Clock, FileText, ExternalLink, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { PageTransition, ScrollReveal, HoverLift } from '../components/motion/MotionSystem';
import { toast } from 'sonner';

export const Verify: React.FC = () => {
  const { assets, updateVerificationStatus } = useAssetRegistry();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = assets.filter(asset => {
    const matchesFilter = filter === 'all' || asset.verificationStatus === filter;
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.unitName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleApprove = (assetId: string) => {
    updateVerificationStatus(assetId, 'approved');
    toast.success('Asset approved');
    setSelectedAsset(null);
  };

  const handleReject = (assetId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    updateVerificationStatus(assetId, 'rejected', rejectionReason);
    toast.success('Asset rejected');
    setSelectedAsset(null);
    setRejectionReason('');
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    const configs = {
      pending: { icon: Clock, color: 'text-accent border-accent', bg: 'bg-accent/10', label: 'PENDING' },
      approved: { icon: CheckCircle, color: 'text-accent border-accent', bg: 'bg-accent/10', label: 'APPROVED' },
      rejected: { icon: XCircle, color: 'text-destructive border-destructive', bg: 'bg-destructive/10', label: 'REJECTED' },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-1 border-2 ${config.color} ${config.bg}`}>
        <Icon className="w-4 h-4" />
        <span className="font-bold uppercase text-xs">{config.label}</span>
      </div>
    );
  };

  const stats = [
    { label: 'TOTAL SUBMISSIONS', value: assets.length },
    { label: 'PENDING REVIEW', value: assets.filter(a => a.verificationStatus === 'pending').length },
    { label: 'APPROVED', value: assets.filter(a => a.verificationStatus === 'approved').length },
    { label: 'REJECTED', value: assets.filter(a => a.verificationStatus === 'rejected').length },
  ];

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up">
      <div className="border-4 border-accent bg-black p-6">
        <h1 className="text-2xl font-bold uppercase mb-2">ASSET VERIFICATION</h1>
        <p className="text-muted-foreground text-sm">
          Review and verify asset compliance before marketplace listing
        </p>
      </div>
      </ScrollReveal>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="border-4 border-foreground bg-background p-6">
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-xs uppercase font-bold text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="border-4 border-foreground bg-background p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="SEARCH ASSETS..."
              className="w-full pl-12 pr-4 py-3 border-2 border-foreground bg-background focus:border-accent outline-none uppercase"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-4 py-2 border-2 border-foreground font-bold uppercase text-sm transition-colors ${
                  filter === f ? 'bg-accent text-black' : 'hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assets List */}
      {filteredAssets.length === 0 ? (
        <div className="border-4 border-foreground bg-background p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-bold uppercase mb-2">NO ASSETS FOUND</h3>
          <p className="text-sm text-muted-foreground">
            {filter === 'all' ? 'No assets have been submitted yet' : `No ${filter} assets found`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssets.map((asset, index) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-4 border-foreground bg-background p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold uppercase">{asset.name}</h3>
                    {getStatusBadge(asset.verificationStatus)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">Unit Name</div>
                      <div className="font-bold">{asset.unitName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">Total Supply</div>
                      <div className="font-bold">{asset.totalSupply.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">Decimals</div>
                      <div className="font-bold">{asset.decimals}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase mb-1">Category</div>
                      <div className="font-bold uppercase">{asset.category?.replace('-', ' ')}</div>
                    </div>
                  </div>

                  {asset.description && (
                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground uppercase mb-1">Description</div>
                      <p className="text-sm">{asset.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-black border-2 border-foreground text-xs font-mono">
                    <div>
                      <div className="text-muted-foreground mb-1">Creator:</div>
                      <div className="break-all">{asset.creator}</div>
                    </div>
                    {asset.assetId && (
                      <div>
                        <div className="text-muted-foreground mb-1">Asset ID:</div>
                        <div className="flex items-center gap-2">
                          <span>{asset.assetId}</span>
                          <a
                            href={`https://testnet.algoexplorer.io/asset/${asset.assetId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                    {asset.manager && (
                      <div>
                        <div className="text-muted-foreground mb-1">Manager:</div>
                        <div className="break-all">{asset.manager}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-muted-foreground mb-1">Created:</div>
                      <div>{asset.createdAt.toLocaleString()}</div>
                    </div>
                  </div>

                  {asset.verificationStatus === 'rejected' && asset.verificationReason && (
                    <div className="mt-4 p-4 border-2 border-destructive bg-destructive/10">
                      <div className="text-xs font-bold uppercase mb-1 text-destructive">Rejection Reason</div>
                      <div className="text-sm">{asset.verificationReason}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {asset.verificationStatus === 'pending' && (
                <div className="flex gap-3 mt-4 pt-4 border-t-2 border-foreground">
                  {selectedAsset === asset.id ? (
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm uppercase mb-2 font-bold">
                          Rejection Reason (Required)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 border-2 border-foreground bg-background focus:border-accent outline-none resize-none"
                          placeholder="Provide detailed reason for rejection..."
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setSelectedAsset(null);
                            setRejectionReason('');
                          }}
                          className="flex-1 px-4 py-2 border-2 border-foreground font-bold uppercase hover:bg-muted"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={() => handleReject(asset.id)}
                          className="flex-1 px-4 py-2 bg-destructive text-white border-2 border-foreground font-bold uppercase hover:bg-destructive/80"
                        >
                          CONFIRM REJECT
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(asset.id)}
                        className="flex-1 px-6 py-3 bg-accent text-black border-2 border-foreground font-bold uppercase hover:bg-accent/80 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        APPROVE
                      </button>
                      <button
                        onClick={() => setSelectedAsset(asset.id)}
                        className="flex-1 px-6 py-3 bg-destructive text-white border-2 border-foreground font-bold uppercase hover:bg-destructive/80 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        REJECT
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
};
