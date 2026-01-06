'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Asset, TransactionStatus } from '@/types';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  tradeType: 'buy' | 'sell';
}

export function TradeModal({ isOpen, onClose, asset, tradeType }: TradeModalProps) {
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [txStatus, setTxStatus] = useState<TransactionStatus>({ status: 'idle' });

  const calculateTotal = () => {
    const numAmount = parseFloat(amount) || 0;
    const total = numAmount * asset.pricePerToken;
    return total;
  };

  const calculatePriceImpact = () => {
    // Simplified calculation - should use AMM formula
    const numAmount = parseFloat(amount) || 0;
    const impact = (numAmount / asset.availableSupply) * 100;
    return impact.toFixed(2);
  };

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    setTxStatus({ status: 'pending' });

    try {
      // Simulate transaction - replace with actual Web3 call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      setTxStatus({
        status: 'success',
        txHash: '0x' + Math.random().toString(16).substring(2),
      });

      setTimeout(() => {
        onClose();
        setAmount('');
        setTxStatus({ status: 'idle' });
      }, 3000);
    } catch (error: any) {
      setTxStatus({
        status: 'error',
        error: error.message || 'Transaction failed',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${tradeType === 'buy' ? 'Buy' : 'Sell'} ${asset.symbol}`} size="md">
      <div className="space-y-6">
        {/* Asset Info */}
        <div className="surface rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-semibold text-[#F5F7FA]">{asset.name}</h4>
              <p className="text-sm text-[#7C8496]">{asset.location}</p>
            </div>
            <Badge variant={asset.verified ? 'success' : 'warning'}>
              {asset.verified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs text-[#7C8496]">Current Price</p>
              <p className="text-lg font-semibold text-[#3B82F6]">${asset.pricePerToken}</p>
            </div>
            <div>
              <p className="text-xs text-[#7C8496]">Available Supply</p>
              <p className="text-lg font-semibold text-[#F5F7FA]">{asset.availableSupply.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <Input
            type="number"
            label="Amount of Tokens"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>

        {/* Slippage */}
        <div>
          <label className="block text-sm font-semibold text-[#F5F7FA] mb-2">
            Slippage Tolerance
          </label>
          <div className="flex gap-2">
            {['0.1', '0.5', '1.0'].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  slippage === value
                    ? 'border-[#3B82F6] bg-[rgba(59,130,246,0.15)] text-[#3B82F6]'
                    : 'border-[#1F232B] text-[#B0B7C3] hover:border-[#2A2F38]'
                }`}
              >
                {value}%
              </button>
            ))}
            <Input
              type="number"
              placeholder="Custom"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="flex-1"
              min="0"
              step="0.1"
            />
          </div>
        </div>

        {/* Trade Summary */}
        {amount && parseFloat(amount) > 0 && (
          <div className="surface rounded-lg p-4 space-y-2 border-[#3B82F6]">
            <div className="flex justify-between text-sm">
              <span className="text-[#7C8496]">Amount:</span>
              <span className="font-semibold text-[#F5F7FA]">{amount} {asset.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#7C8496]">Price per Token:</span>
              <span className="font-semibold text-[#F5F7FA]">${asset.pricePerToken}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#7C8496]">Price Impact:</span>
              <span className={`font-semibold ${parseFloat(calculatePriceImpact()) > 5 ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                {calculatePriceImpact()}%
              </span>
            </div>
            <div className="border-t border-[#1F232B] pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-[#F5F7FA]">Total:</span>
                <span className="font-bold text-[#3B82F6] text-lg">
                  ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Price Impact Warning */}
        {amount && parseFloat(calculatePriceImpact()) > 5 && (
          <Alert
            type="warning"
            message={`High price impact! This trade will significantly affect the token price.`}
          />
        )}

        {/* Transaction Status */}
        {txStatus.status === 'pending' && (
          <Alert type="info" message="Transaction pending... Please confirm in your wallet." />
        )}
        {txStatus.status === 'success' && (
          <Alert
            type="success"
            message={`Transaction successful! Hash: ${txStatus.txHash?.substring(0, 10)}...`}
          />
        )}
        {txStatus.status === 'error' && (
          <Alert type="error" message={txStatus.error || 'Transaction failed'} />
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={onClose}
            disabled={txStatus.status === 'pending'}
          >
            Cancel
          </Button>
          <Button
            variant={tradeType === 'buy' ? 'primary' : 'danger'}
            fullWidth
            onClick={handleTrade}
            loading={txStatus.status === 'pending'}
            disabled={!amount || parseFloat(amount) <= 0 || txStatus.status === 'pending'}
          >
            {tradeType === 'buy' ? 'Buy Tokens' : 'Sell Tokens'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
