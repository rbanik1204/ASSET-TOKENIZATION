'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import { DeflyWalletConnect } from '@blockshake/defly-connect';
import algosdk from 'algosdk';
import { getAlgorandConfig, getCurrentAlgorandNetwork } from '@/config/algorand';

type WalletType = 'pera' | 'defly' | null;

interface AlgorandWalletContextType {
  isConnected: boolean;
  address: string | null;
  balance: number | null;
  network: string;
  walletType: WalletType;
  connectWallet: (type: WalletType) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  sendTransaction: (txn: algosdk.Transaction) => Promise<string>;
  algodClient: algosdk.Algodv2;
  indexerClient: algosdk.Indexer;
}

const AlgorandWalletContext = createContext<AlgorandWalletContextType | undefined>(undefined);

interface AlgorandWalletProviderProps {
  children: ReactNode;
}

// Initialize wallet instances
let peraWallet: PeraWalletConnect | null = null;
let deflyWallet: DeflyWalletConnect | null = null;

export function AlgorandWalletProviderWrapper({ children }: AlgorandWalletProviderProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);
  
  const config = getAlgorandConfig();
  const network = getCurrentAlgorandNetwork();

  // Initialize Algorand clients
  const algodClient = new algosdk.Algodv2(
    config.algodToken,
    config.algodServer,
    ''
  );

  const indexerClient = new algosdk.Indexer(
    config.indexerToken,
    config.indexerServer,
    ''
  );

  // Initialize wallet instances on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      peraWallet = new PeraWalletConnect();
      deflyWallet = new DeflyWalletConnect();

      // Reconnect to session
      peraWallet.reconnectSession().then((accounts) => {
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setWalletType('pera');
        }
      }).catch(() => {
        // No session to reconnect
      });
    }
  }, []);

  // Fetch balance when address changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (address) {
        try {
          const accountInfo = await algodClient.accountInformation(address).do();
          // Convert BigInt to number
          const balanceAmount = typeof accountInfo.amount === 'bigint' 
            ? Number(accountInfo.amount) 
            : accountInfo.amount;
          setBalance(balanceAmount);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
    
    // Poll balance every 10 seconds when connected
    const interval = address ? setInterval(fetchBalance, 10000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [address, algodClient]);

  const connectWallet = async (type: WalletType) => {
    try {
      // If already connected with the same wallet type, do nothing
      if (walletType === type && address) {
        return;
      }

      // If connected with a different wallet, disconnect first
      if (walletType && walletType !== type) {
        await disconnectWallet();
      }

      if (type === 'pera' && peraWallet) {
        const accounts = await peraWallet.connect();
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setWalletType('pera');
        }
      } else if (type === 'defly' && deflyWallet) {
        const accounts = await deflyWallet.connect();
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setWalletType('defly');
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      if (walletType === 'pera' && peraWallet) {
        await peraWallet.disconnect();
      } else if (walletType === 'defly' && deflyWallet) {
        await deflyWallet.disconnect();
      }
      setAddress(null);
      setWalletType(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  };

  const sendTransaction = async (txn: algosdk.Transaction): Promise<string> => {
    try {
      if (!address) {
        throw new Error('No active account');
      }

      let signedTxn: Uint8Array;

      // Sign with appropriate wallet
      if (walletType === 'pera' && peraWallet) {
        const txnGroup = [{ txn, signers: [address] }];
        const signedTxns = await peraWallet.signTransaction([txnGroup]);
        signedTxn = signedTxns[0];
      } else if (walletType === 'defly' && deflyWallet) {
        const txnGroup = [{ txn, signers: [address] }];
        const signedTxns = await deflyWallet.signTransaction([txnGroup]);
        signedTxn = signedTxns[0];
      } else {
        throw new Error('No wallet connected');
      }

      // Send transaction
      const response = await algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txid;

      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      return txId;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  };

  const value: AlgorandWalletContextType = {
    isConnected: !!address,
    address,
    balance,
    network,
    walletType,
    connectWallet,
    disconnectWallet,
    sendTransaction,
    algodClient,
    indexerClient,
  };

  return (
    <AlgorandWalletContext.Provider value={value}>
      {children}
    </AlgorandWalletContext.Provider>
  );
}

export function useAlgorandWallet() {
  const context = useContext(AlgorandWalletContext);
  if (context === undefined) {
    throw new Error('useAlgorandWallet must be used within AlgorandWalletProvider');
  }
  return context;
}
