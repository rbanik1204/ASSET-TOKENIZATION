'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface BuyFractionModalProps {
  asset: {
    id: string;
    name: string;
    asaId?: number;
    pricePerUnit: number;
    availableSupply: number;
    asaNetwork?: 'testnet' | 'mainnet';
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BuyFractionModal({ asset, isOpen, onClose, onSuccess }: BuyFractionModalProps) {
  const [units, setUnits] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'estimating' | 'swapping' | 'confirming' | 'success' | 'error'>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalCost = units * asset.pricePerUnit;
  const swapFee = 0.002; // 2 transactions * 0.001 ALGO
  const totalWithFees = totalCost + swapFee;

  if (!isOpen) return null;

  const handleBuy = async () => {
    if (!asset.asaId) {
      alert('This asset is not tokenized on Algorand yet');
      return;
    }

    setProcessing(true);
    setTxStatus('estimating');
    setErrorMessage(null);

    try {
      // 1. Get estimate
      setTxStatus('estimating');
      const estimateResponse = await fetch('/api/swap/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asaAmount: units,
          algoAmount: Math.round(totalCost * 1_000_000) // Convert to microAlgos
        })
      });

      const estimate = await estimateResponse.json();

      if (!estimate.success) {
        throw new Error('Failed to estimate swap costs');
      }

      console.log('Swap estimate:', estimate.estimate);

      // 2. TODO: Get buyer and seller wallets
      // In production, this would:
      // - Get buyer's Algorand wallet from connected wallet
      // - Get seller's wallet from asset owner
      // For now, show instructions

      setTxStatus('swapping');

      // Show wallet connection instructions
      const proceed = confirm(
        `Buy ${units} units of ${asset.name}?\n\n` +
        `Cost: ${totalCost} ALGO\n` +
        `Fees: ${swapFee} ALGO\n` +
        `Total: ${totalWithFees} ALGO\n\n` +
        `This will execute an atomic swap:\n` +
        `1. You send ${totalCost} ALGO to seller\n` +
        `2. Seller sends ${units} ASA units to you\n` +
        `Both happen atomically or neither happens.\n\n` +
        `Note: You need your Algorand wallet connected and must have opted-in to ASA ${asset.asaId}\n\n` +
        `Ready to proceed?`
      );

      if (!proceed) {
        setProcessing(false);
        setTxStatus('idle');
        return;
      }

      // 3. Execute atomic swap
      // TODO: In production, get actual wallet mnemonics securely
      // This is just a demo flow
      const buyerMnemonic = prompt('Enter YOUR Algorand wallet 25-word mnemonic (DEMO MODE):');
      const sellerMnemonic = prompt('Enter SELLER Algorand wallet 25-word mnemonic (DEMO MODE):');

      if (!buyerMnemonic || !sellerMnemonic) {
        throw new Error('Wallet mnemonics required');
      }

      setTxStatus('confirming');

      const swapResponse = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerMnemonic,
          sellerMnemonic,
          asaId: asset.asaId,
          asaAmount: units,
          algoAmount: Math.round(totalCost * 1_000_000)
        })
      });

      const result = await swapResponse.json();

      if (result.success) {
        setTxStatus('success');
        setTxId(result.txId);
        
        alert(
          `✅ Atomic Swap Successful!\n\n` +
          `Transaction ID: ${result.txId}\n` +
          `Group ID: ${result.groupId}\n` +
          `Confirmed Round: ${result.confirmedRound}\n\n` +
          `You now own ${units} units of ${asset.name}!`
        );

        if (onSuccess) {
          onSuccess();
        }

        // Open AlgoExplorer
        if (result.transactionUrl) {
          window.open(result.transactionUrl, '_blank');
        }

        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(result.message || 'Swap failed');
      }

    } catch (error) {
      console.error('Buy error:', error);
      setTxStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Purchase failed');
      alert(`❌ Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusMessage = () => {
    switch (txStatus) {
      case 'estimating':
        return '💭 Estimating costs...';
      case 'swapping':
        return '🔄 Preparing atomic swap...';
      case 'confirming':
        return '⏳ Waiting for blockchain confirmation...';
      case 'success':
        return '✅ Purchase successful!';
      case 'error':
        return '❌ Purchase failed';
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F1115] border border-[#1F232B] rounded-xl max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Buy Fraction</h2>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-[#6B7280] hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Asset Info */}
        <div className="bg-[#14161B] border border-[#1F232B] rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-white mb-2">{asset.name}</h3>
          <div className="flex items-center gap-2 text-sm text-[#B0B7C3]">
            <span>ASA ID:</span>
            <span className="font-mono">{asset.asaId || 'Not tokenized'}</span>
          </div>
          <div className="text-sm text-[#B0B7C3] mt-1">
            Available: {asset.availableSupply} units
          </div>
        </div>

        {/* Units Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#B0B7C3] mb-2">
            Number of Units
          </label>
          <input
            type="number"
            min="1"
            max={asset.availableSupply}
            value={units}
            onChange={(e) => setUnits(Math.max(1, Math.min(asset.availableSupply, parseInt(e.target.value) || 1)))}
            disabled={processing}
            className="w-full px-4 py-3 bg-[#14161B] border border-[#1F232B] rounded-lg text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          <div className="flex justify-between mt-2">
            <button
              onClick={() => setUnits(Math.max(1, units - 1))}
              disabled={processing || units <= 1}
              className="px-3 py-1 bg-[#1A1D23] hover:bg-[#14161B] rounded text-sm disabled:opacity-50"
            >
              -
            </button>
            <button
              onClick={() => setUnits(Math.floor(asset.availableSupply / 2))}
              disabled={processing}
              className="px-3 py-1 bg-[#1A1D23] hover:bg-[#14161B] rounded text-sm disabled:opacity-50"
            >
              50%
            </button>
            <button
              onClick={() => setUnits(asset.availableSupply)}
              disabled={processing}
              className="px-3 py-1 bg-[#1A1D23] hover:bg-[#14161B] rounded text-sm disabled:opacity-50"
            >
              Max
            </button>
            <button
              onClick={() => setUnits(Math.min(asset.availableSupply, units + 1))}
              disabled={processing || units >= asset.availableSupply}
              className="px-3 py-1 bg-[#1A1D23] hover:bg-[#14161B] rounded text-sm disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-[#14161B] border border-[#1F232B] rounded-lg p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#B0B7C3]">Price per unit</span>
            <span className="text-white font-medium">{asset.pricePerUnit} ALGO</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#B0B7C3]">Units × Price</span>
            <span className="text-white font-medium">{units} × {asset.pricePerUnit} = {totalCost} ALGO</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#6B7280]">Atomic swap fees (2 txs)</span>
            <span className="text-[#6B7280]">{swapFee} ALGO</span>
          </div>
          <div className="border-t border-[#1F232B] pt-2 flex justify-between">
            <span className="text-white font-semibold">Total Cost</span>
            <span className="text-blue-400 font-bold text-lg">{totalWithFees.toFixed(3)} ALGO</span>
          </div>
        </div>

        {/* Status Message */}
        {txStatus !== 'idle' && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            txStatus === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
            txStatus === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
            'bg-blue-500/10 border border-blue-500/30 text-blue-400'
          }`}>
            {getStatusMessage()}
            {errorMessage && <div className="mt-1 text-xs">{errorMessage}</div>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-3 bg-[#1A1D23] hover:bg-[#14161B] rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBuy}
            disabled={processing || !asset.asaId || txStatus === 'success'}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? '⏳ Processing...' : txStatus === 'success' ? '✅ Complete' : `Buy ${units} ${units === 1 ? 'Unit' : 'Units'}`}
          </button>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-[#B0B7C3]">
          <p className="font-medium text-blue-400 mb-1">🔒 Atomic Swap: Trustless Trading</p>
          <p>
            Your ALGO payment and the ASA transfer happen atomically. Both complete or neither does. No escrow, no trust needed.
          </p>
        </div>
      </div>
    </div>
  );
}
