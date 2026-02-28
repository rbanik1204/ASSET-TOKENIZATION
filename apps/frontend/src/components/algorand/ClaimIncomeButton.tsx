'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ClaimIncomeButtonProps {
  assetId: string;
  assetName: string;
  asaId: number;
  userBalance: number;
  totalSupply: number;
  network?: 'testnet' | 'mainnet';
  onSuccess?: () => void;
}

export function ClaimIncomeButton({
  assetId,
  assetName,
  asaId,
  userBalance,
  totalSupply,
  network = 'testnet',
  onSuccess,
}: ClaimIncomeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [claimable, setClaimable] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [alreadyClaimed, setAlreadyClaimed] = useState(0);

  // Fetch claimable amount on mount
  useEffect(() => {
    fetchClaimableAmount();
  }, [userBalance, totalSupply]);

  const fetchClaimableAmount = async () => {
    try {
      // Fetch contract state from indexer or contract
      // TODO: Implement contract state reading via indexer
      // For now, fetch from backend API
      const stateResponse = await fetch(`/api/income/contract-state?asaId=${asaId}`);

      if (stateResponse.ok) {
        const stateData = await stateResponse.json();
        setTotalDeposited(stateData.totalDeposited || 0);
        setAlreadyClaimed(stateData.claimed?.['unknown'] || 0);
      }

      // Calculate claimable amount
      const response = await fetch('/api/income/calculate-claimable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holderBalance: userBalance,
          totalDeposited: totalDeposited,
          alreadyClaimed: alreadyClaimed,
          totalSupply,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setClaimable(data.claimableAlgo);
      }
    } catch (err: any) {
      console.error('Error fetching claimable:', err);
    }
  };

  const handleClaim = async () => {
    try {
      setLoading(true);
      setError(null);

      // DEMO MODE: Prompt for mnemonic
      // In production, use WalletConnect
      const holderMnemonic = prompt(
        'Enter your 25-word mnemonic phrase (DEMO ONLY - replace with WalletConnect):'
      );

      if (!holderMnemonic) {
        throw new Error('Mnemonic required to claim income');
      }

      // Confirm action
      const proceed = confirm(
        `Claim ${claimable?.toFixed(6)} ALGO from ${assetName}?\\n\\nThis will execute an on-chain transaction.`
      );

      if (!proceed) {
        setLoading(false);
        return;
      }

      // Call claim API
      const response = await fetch('/api/income/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holderMnemonic,
          holderBalance: userBalance,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to claim income');
      }

      // Success!
      alert(
        `✅ Income Claimed Successfully!\\n\\n` +
        `Transaction ID: ${result.txId}\\n` +
        `Confirmed Round: ${result.confirmedRound}\\n\\n` +
        `Opening AlgoExplorer...`
      );

      // Open AlgoExplorer
      if (result.explorerUrl) {
        window.open(result.explorerUrl, '_blank');
      }

      // Refresh claimable amount
      fetchClaimableAmount();

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error claiming income:', err);
      setError(err.message || 'Failed to claim income');
      alert(`❌ Error: ${err.message || 'Failed to claim income'}`);
    } finally {
      setLoading(false);
    }
  };

  if (userBalance <= 0) {
    return null;
  }

  return (
    <Card>
      <CardBody>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#F5F7FA]">
                💰 Claimable Income
              </h3>
              <p className="text-sm text-[#7C8496]">
                From {assetName}
              </p>
            </div>
            <Badge variant="success" size="sm">
              {network === 'testnet' ? 'TestNet' : 'MainNet'}
            </Badge>
          </div>

          {/* Claimable Amount */}
          <div className="bg-[#14161B] rounded-lg p-4">
            <p className="text-xs text-[#7C8496] mb-1">You can claim</p>
            {claimable !== null ? (
              <p className="text-3xl font-bold text-[#10B981]">
                {claimable.toFixed(6)} ALGO
              </p>
            ) : (
              <p className="text-lg text-[#7C8496]">Calculating...</p>
            )}
          </div>

          {/* Your Holdings */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-[#7C8496]">Your Balance</p>
              <p className="font-semibold text-[#F5F7FA]">
                {userBalance.toLocaleString()} units
              </p>
            </div>
            <div>
              <p className="text-xs text-[#7C8496]">Ownership</p>
              <p className="font-semibold text-[#F5F7FA]">
                {((userBalance / totalSupply) * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 rounded p-2">
              ⚠️ {error}
            </div>
          )}

          {/* Claim Button */}
          <Button
            onClick={handleClaim}
            disabled={loading || !claimable || claimable <= 0}
            className="w-full"
          >
            {loading ? 'Claiming...' : 'Claim Income'}
          </Button>

          {/* Info */}
          <p className="text-xs text-[#7C8496] text-center">
            Income is distributed proportionally based on your ASA holdings.
            <br />
            All transactions are executed on Algorand blockchain.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
