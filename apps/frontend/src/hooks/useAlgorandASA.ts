/**
 * Custom hook for Algorand Standard Asset (ASA) operations
 */

import { useState } from 'react';
import { useAlgorandWallet } from '@/context/AlgorandWalletContext';
import algosdk from 'algosdk';
import { getExplorerUrl, getCurrentAlgorandNetwork } from '@/config/algorand';

interface CreateASAParams {
  assetName: string;
  unitName: string;
  total: number;
  decimals: number;
  url?: string;
  metadata?: Uint8Array;
  manager?: string;
  reserve?: string;
  freeze?: string;
  clawback?: string;
}

interface OptInParams {
  assetId: number;
}

interface TransferASAParams {
  assetId: number;
  receiver: string;
  amount: number;
  note?: string;
}

export function useAlgorandASA() {
  const { address, algodClient, sendTransaction } = useAlgorandWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new Algorand Standard Asset
   */
  const createASA = async (params: CreateASAParams): Promise<number | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get suggested params
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create asset configuration transaction
      const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        sender: address,
        total: params.total,
        decimals: params.decimals,
        assetName: params.assetName,
        unitName: params.unitName,
        assetURL: params.url,
        assetMetadataHash: params.metadata,
        manager: params.manager || address,
        reserve: params.reserve || address,
        freeze: params.freeze || undefined,
        clawback: params.clawback || undefined,
        defaultFrozen: false,
        suggestedParams,
      });

      // Send transaction
      const txId = await sendTransaction(txn);

      // Get asset ID from transaction
      const confirmedTxn = await algodClient.pendingTransactionInformation(txId).do();
      const assetId = confirmedTxn.assetIndex;

      if (!assetId) {
        throw new Error('Asset ID not found in transaction');
      }

      // Convert BigInt to number if needed
      const assetIdNum = typeof assetId === 'bigint' ? Number(assetId) : assetId;

      console.log(`Asset created: ${assetIdNum}`);
      console.log(`View on explorer: ${getExplorerUrl(getCurrentAlgorandNetwork(), 'asset', assetIdNum.toString())}`);

      return assetIdNum;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create asset';
      setError(errorMessage);
      console.error('Error creating ASA:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Opt-in to an asset (required before receiving)
   */
  const optInToASA = async ({ assetId }: OptInParams): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create opt-in transaction (amount = 0, to self)
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: address,
        amount: 0,
        assetIndex: assetId,
        suggestedParams,
      });

      await sendTransaction(txn);

      console.log(`Opted in to asset: ${assetId}`);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to opt-in';
      setError(errorMessage);
      console.error('Error opting in to ASA:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Transfer ASA to another account
   */
  const transferASA = async (params: TransferASAParams): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create transfer transaction
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: params.receiver,
        amount: params.amount,
        assetIndex: params.assetId,
        note: params.note ? new Uint8Array(Buffer.from(params.note)) : undefined,
        suggestedParams,
      });

      const txId = await sendTransaction(txn);

      console.log(`Asset transferred: ${txId}`);
      console.log(`View on explorer: ${getExplorerUrl(getCurrentAlgorandNetwork(), 'tx', txId)}`);

      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to transfer asset';
      setError(errorMessage);
      console.error('Error transferring ASA:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get asset information
   */
  const getAssetInfo = async (assetId: number) => {
    try {
      const assetInfo = await algodClient.getAssetByID(assetId).do();
      return assetInfo;
    } catch (err) {
      console.error('Error fetching asset info:', err);
      return null;
    }
  };

  /**
   * Get account's asset balance
   */
  const getAssetBalance = async (accountAddress: string, assetId: number): Promise<number | null> => {
    try {
      const accountInfo = await algodClient.accountAssetInformation(accountAddress, assetId).do();
      // @ts-ignore - SDK types may differ
      const amount = accountInfo['asset-holding']?.amount || accountInfo.assetHolding?.amount;
      // Convert BigInt to number
      return typeof amount === 'bigint' ? Number(amount) : amount;
    } catch (err) {
      console.error('Error fetching asset balance:', err);
      return null;
    }
  };

  /**
   * Get all assets owned by account
   */
  const getAccountAssets = async (accountAddress?: string) => {
    const targetAddress = accountAddress || address;
    if (!targetAddress) return [];

    try {
      const accountInfo = await algodClient.accountInformation(targetAddress).do();
      return accountInfo.assets || [];
    } catch (err) {
      console.error('Error fetching account assets:', err);
      return [];
    }
  };

  return {
    createASA,
    optInToASA,
    transferASA,
    getAssetInfo,
    getAssetBalance,
    getAccountAssets,
    isLoading,
    error,
  };
}
