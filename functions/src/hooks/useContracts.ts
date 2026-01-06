import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ABIS, getContractsForChain } from '@/config/contracts';
import { useChainId } from 'wagmi';
import { useState } from 'react';

// Hook to read asset token balance
export function useAssetBalance(assetAddress: string, userAddress?: string) {
  const { data, isLoading, error } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: ABIS.ASSET_TOKEN,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
  });

  return {
    balance: data as bigint | undefined,
    isLoading,
    error,
  };
}

// Hook to register an asset token + metadata in AssetRegistry
export function useRegisterAsset() {
  const chainId = useChainId();
  const { ASSET_REGISTRY } = getContractsForChain(chainId);
  const { writeContract, data: hash, error } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const registerAsset = async (tokenAddress: string, metadataURI: string) => {
    setIsPending(true);
    try {
      await writeContract({
        address: ASSET_REGISTRY as `0x${string}`,
        abi: ABIS.ASSET_REGISTRY,
        functionName: 'registerAsset',
        args: [tokenAddress as `0x${string}`, metadataURI],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    registerAsset,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to get an AMM quote from a specific AMMPool
export function useAMMPoolQuote(amountIn: bigint, ethIn: boolean, poolAddress?: string) {
  const chainId = useChainId();
  const { AMM_POOL } = getContractsForChain(chainId);
  const { data, isLoading, error } = useReadContract({
    address: (poolAddress || AMM_POOL) as `0x${string}`,
    abi: ABIS.AMM_POOL,
    functionName: 'getAmountOut',
    args: [amountIn, ethIn],
    query: {
      enabled: Boolean(poolAddress || AMM_POOL),
    },
  });

  return {
    amountOut: data as bigint | undefined,
    isLoading,
    error,
  };
}

// Hook to purchase tokens in PrimarySale (payable)
export function usePurchasePrimarySaleTokens() {
  const chainId = useChainId();
  const { PRIMARY_SALE } = getContractsForChain(chainId);
  const { writeContract, data: hash, error } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const purchase = async (saleTokenAddress: string, tokenAmount: bigint, valueWei: bigint) => {
    setIsPending(true);
    try {
      await writeContract({
        address: PRIMARY_SALE as `0x${string}`,
        abi: ABIS.PRIMARY_SALE,
        functionName: 'purchaseTokens',
        args: [saleTokenAddress as `0x${string}`, tokenAmount],
        value: valueWei,
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    purchase,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to approve token spending
export function useTokenApprove() {
  const { writeContract, data: hash, error } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = async (tokenAddress: string, spender: string, amount: bigint) => {
    setIsPending(true);
    try {
      await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ABIS.ERC20,
        functionName: 'approve',
        args: [spender as `0x${string}`, amount],
      });
    } finally {
      setIsPending(false);
    }
  };

  return {
    approve,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  };
}
