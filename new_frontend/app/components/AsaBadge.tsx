import React from 'react';
import { CheckCircle, Clock, XCircle, HelpCircle } from 'lucide-react';

type VerificationStatus = 'verified' | 'pending' | 'rejected' | 'unverified';

interface AsaBadgeProps {
  status: VerificationStatus;
  asaId?: number;
  network?: 'testnet' | 'mainnet';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const statusConfig: Record<
  VerificationStatus,
  { icon: React.FC<{ className?: string }>; label: string; classes: string }
> = {
  verified: {
    icon: CheckCircle,
    label: 'VERIFIED',
    classes: 'border-accent text-accent bg-accent/10',
  },
  pending: {
    icon: Clock,
    label: 'PENDING',
    classes: 'border-yellow-400 text-yellow-400 bg-yellow-400/10',
  },
  rejected: {
    icon: XCircle,
    label: 'REJECTED',
    classes: 'border-destructive text-destructive bg-destructive/10',
  },
  unverified: {
    icon: HelpCircle,
    label: 'UNVERIFIED',
    classes: 'border-muted-foreground text-muted-foreground',
  },
};

export const AsaBadge: React.FC<AsaBadgeProps> = ({
  status,
  asaId,
  network = 'testnet',
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const cfg = statusConfig[status] ?? statusConfig.unverified;
  const Icon = cfg.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';

  const content = (
    <span
      className={`inline-flex items-center gap-1 border font-bold uppercase font-mono ${cfg.classes} ${textSize} ${padding} ${className}`}
    >
      <Icon className={iconSize} />
      {showLabel && cfg.label}
      {asaId && showLabel && (
        <span className="opacity-60">#{asaId}</span>
      )}
    </span>
  );

  if (asaId && network) {
    const explorerBase = network === 'mainnet'
      ? 'https://algoexplorer.io'
      : 'https://testnet.algoexplorer.io';
    return (
      <a
        href={`${explorerBase}/asset/${asaId}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`View ASA #${asaId} on AlgoExplorer`}
      >
        {content}
      </a>
    );
  }

  return content;
};
