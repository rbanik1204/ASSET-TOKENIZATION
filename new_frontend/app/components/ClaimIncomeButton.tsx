import React, { useState } from 'react';
import { DollarSign, RefreshCw, CheckCircle } from 'lucide-react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { toast } from 'sonner';

interface ClaimIncomeButtonProps {
  asaId: number;
  assetName: string;
  /** Claimable amount in microALGO; pass undefined to auto-fetch */
  claimable?: number;
  className?: string;
  onClaimed?: (txId: string, amount: number) => void;
}

export const ClaimIncomeButton: React.FC<ClaimIncomeButtonProps> = ({
  asaId,
  assetName,
  claimable,
  className = '',
  onClaimed,
}) => {
  const { address } = useAlgorand();
  const { addTransaction } = useAssetRegistry();
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [amount, setAmount] = useState<number | null>(claimable ?? null);

  const fetchClaimable = async (): Promise<number> => {
    if (claimable !== undefined) return claimable;
    if (!address) return 0;
    try {
      const res = await fetch(`/api/income/calculate-claimable?asaId=${asaId}&walletAddress=${address}`);
      const data = await res.json();
      const val = data.claimableAmount ?? 0;
      setAmount(val);
      return val;
    } catch {
      return 0;
    }
  };

  const handleClaim = async () => {
    if (!address) {
      toast.error('Wallet not connected');
      return;
    }

    setLoading(true);
    try {
      const claimableAmount = await fetchClaimable();
      if (claimableAmount <= 0) {
        toast.info('No income available to claim');
        setLoading(false);
        return;
      }

      const mnemonic = prompt(
        `[DEMO] Claim ${(claimableAmount / 1_000_000).toFixed(4)} ALGO income from ${assetName}.\n\nEnter your 25-word mnemonic:`
      );
      if (!mnemonic) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/income/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asaId, walletAddress: address, mnemonic }),
      });

      const result = await res.json();
      if (result.success) {
        setClaimed(true);
        addTransaction({
          type: 'distribution',
          assetId: asaId,
          assetName,
          from: 'income-contract',
          to: address,
          amount: claimableAmount,
          txId: result.txId,
          status: 'confirmed',
        });
        toast.success(`Claimed ${(claimableAmount / 1_000_000).toFixed(4)} ALGO from ${assetName}`);
        onClaimed?.(result.txId, claimableAmount);
      } else {
        throw new Error(result.message || 'Claim failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Claim failed');
    } finally {
      setLoading(false);
    }
  };

  if (claimed) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border-2 border-accent text-accent text-sm font-bold uppercase ${className}`}>
        <CheckCircle className="w-4 h-4" />
        CLAIMED
      </div>
    );
  }

  return (
    <button
      onClick={handleClaim}
      disabled={loading || !address}
      className={`flex items-center gap-2 px-3 py-2 bg-accent text-black border-2 border-foreground font-bold uppercase text-sm hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {loading ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <DollarSign className="w-4 h-4" />
      )}
      {loading ? 'CLAIMING...' : amount !== null ? `CLAIM ${(amount / 1_000_000).toFixed(4)} ALGO` : 'CLAIM'}
    </button>
  );
};
