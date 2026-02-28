/**
 * Custom hook for Algorand ALGO payment transactions
 */

import { useState } from 'react';
import { useAlgorandWallet } from '@/context/AlgorandWalletContext';
import algosdk from 'algosdk';
import { getExplorerUrl, getCurrentAlgorandNetwork } from '@/config/algorand';

interface SendPaymentParams {
  receiver: string;
  amount: number; // in microAlgos (1 ALGO = 1,000,000 microAlgos)
  note?: string;
}

export function useAlgorandPayment() {
  const { address, algodClient, sendTransaction } = useAlgorandWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send ALGO payment
   */
  const sendPayment = async (params: SendPaymentParams): Promise<string | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validate receiver address
      if (!algosdk.isValidAddress(params.receiver)) {
        throw new Error('Invalid receiver address');
      }

      // Get suggested params
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: params.receiver,
        amount: params.amount,
        note: params.note ? new Uint8Array(Buffer.from(params.note)) : undefined,
        suggestedParams,
      });

      // Send transaction
      const txId = await sendTransaction(txn);

      console.log(`Payment sent: ${txId}`);
      console.log(`View on explorer: ${getExplorerUrl(getCurrentAlgorandNetwork(), 'tx', txId)}`);

      return txId;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send payment';
      setError(errorMessage);
      console.error('Error sending payment:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Convert ALGO to microAlgos
   */
  const algoToMicroAlgo = (algo: number): number => {
    return Math.floor(algo * 1_000_000);
  };

  /**
   * Convert microAlgos to ALGO
   */
  const microAlgoToAlgo = (microAlgo: number): number => {
    // Handle BigInt conversion
    const algoNum = typeof microAlgo === 'bigint' ? Number(microAlgo) : microAlgo;
    return algoNum / 1_000_000;
  };

  /**
   * Estimate transaction fee
   */
  const estimateFee = async (): Promise<number> => {
    try {
      const suggestedParams = await algodClient.getTransactionParams().do();
      const fee = suggestedParams.fee || 1000;
      // Convert BigInt to number if needed
      return typeof fee === 'bigint' ? Number(fee) : fee;
    } catch (err) {
      console.error('Error estimating fee:', err);
      return 1000; // Default to 0.001 ALGO
    }
  };

  return {
    sendPayment,
    algoToMicroAlgo,
    microAlgoToAlgo,
    estimateFee,
    isLoading,
    error,
  };
}
