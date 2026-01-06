'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { chains } from '@/config/wagmi';
import { Asset, Portfolio, IncomeRecord } from '@/types';

interface AppContextType {
  walletAddress: string | null;
  walletChainId: number | null;
  walletConnected: boolean;
  walletNetworkSupported: boolean;
  walletError: string | null;
  setWalletError: (error: string | null) => void;

  assets: Asset[];
  setAssets: (assets: Asset[]) => void;
  portfolio: Portfolio | null;
  setPortfolio: (portfolio: Portfolio | null) => void;
  incomeRecords: IncomeRecord[];
  setIncomeRecords: (records: IncomeRecord[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const supportedChainIds: number[] = chains.map((c) => c.id);
  const walletNetworkSupported = Boolean(isConnected && supportedChainIds.includes(chainId));

  useEffect(() => {
    setWalletAddress(address ?? null);
  }, [address]);

  useEffect(() => {
    if (!isConnected) {
      setWalletError(null);
      return;
    }
    if (!supportedChainIds.includes(chainId)) {
      setWalletError('Wrong network. Please switch to a supported network.');
      return;
    }
    setWalletError(null);
  }, [chainId, isConnected, supportedChainIds]);

  const refreshData = async () => {
    setLoading(true);
    try {
      // Fetch assets from API or blockchain
      // This is a placeholder - implement actual data fetching
      // const response = await fetch('/api/assets');
      // const data = await response.json();
      // setAssets(data);

      if (isConnected && address) {
        // Fetch user portfolio
        // const portfolioResponse = await fetch(`/api/portfolio/${address}`);
        // const portfolioData = await portfolioResponse.json();
        // setPortfolio(portfolioData);

        // Fetch income records
        // const incomeResponse = await fetch(`/api/income/${address}`);
        // const incomeData = await incomeResponse.json();
        // setIncomeRecords(incomeData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [address, isConnected]);

  return (
    <AppContext.Provider
      value={{
        walletAddress,
        walletChainId: isConnected ? chainId : null,
        walletConnected: isConnected,
        walletNetworkSupported,
        walletError,
        setWalletError,
        assets,
        setAssets,
        portfolio,
        setPortfolio,
        incomeRecords,
        setIncomeRecords,
        loading,
        setLoading,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
