import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import algosdk from 'algosdk';
import { PeraWalletConnect } from '@perawallet/connect';
import { DeflyWalletConnect } from '@blockshake/defly-connect';
import { API_BASE } from '../config/api';

export type NetworkType = 'mainnet' | 'testnet';
export type WalletType = 'pera' | 'defly' | null;

// ── Auth token shape from backend ────────────────────────────────
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: string;
}

interface AlgorandContextType {
  // Network
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
  // Wallet
  connectedWallet: WalletType;
  address: string | null;
  balance: number;
  assets: Array<{ id: number; amount: number; name: string; unitName: string }>;
  connectWallet: (type: WalletType) => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
  // Algorand clients
  algodClient: algosdk.Algodv2;
  indexerClient: algosdk.Indexer;
  // Auth
  isAuthenticated: boolean;
  accessToken: string | null;
  userRole: string | null;
  signAndVerify: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AlgorandContext = createContext<AlgorandContextType | undefined>(undefined);

export const useAlgorand = () => {
  const context = useContext(AlgorandContext);
  if (!context) {
    throw new Error('useAlgorand must be used within AlgorandProvider');
  }
  return context;
};

export const AlgorandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [network, setNetworkState] = useState<NetworkType>('testnet');
  const [connectedWallet, setConnectedWallet] = useState<WalletType>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [assets, setAssets] = useState<Array<{ id: number; amount: number; name: string; unitName: string }>>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  // Auth state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Wallet SDK refs (persistent across renders)
  const peraWallet = useRef<PeraWalletConnect | null>(null);
  const deflyWallet = useRef<DeflyWalletConnect | null>(null);

  // ── Algorand clients ────────────────────────────────────────────
  const algodClient = React.useMemo(() => {
    const url = network === 'mainnet'
      ? 'https://mainnet-api.algonode.cloud'
      : 'https://testnet-api.algonode.cloud';
    return new algosdk.Algodv2('', url, '');
  }, [network]);

  const indexerClient = React.useMemo(() => {
    const url = network === 'mainnet'
      ? 'https://mainnet-idx.algonode.cloud'
      : 'https://testnet-idx.algonode.cloud';
    return new algosdk.Indexer('', url, '');
  }, [network]);

  // ── Initialize wallet SDKs ─────────────────────────────────────
  useEffect(() => {
    if (!peraWallet.current) {
      peraWallet.current = new PeraWalletConnect({
        chainId: network === 'mainnet' ? 416001 : 416002,
      });
    }
    if (!deflyWallet.current) {
      deflyWallet.current = new DeflyWalletConnect({
        chainId: network === 'mainnet' ? 416001 : 416002,
      });
    }
  }, [network]);

  // ── Restore session on mount ───────────────────────────────────
  useEffect(() => {
    const savedNetwork = localStorage.getItem('al_network');
    if (savedNetwork) setNetworkState(savedNetwork as NetworkType);

    const savedWallet = localStorage.getItem('al_wallet') as WalletType;
    const savedAddress = localStorage.getItem('al_address');
    const savedAccess = localStorage.getItem('al_accessToken');
    const savedRefresh = localStorage.getItem('al_refreshToken');
    const savedRole = localStorage.getItem('al_role');

    if (savedWallet && savedAddress) {
      setConnectedWallet(savedWallet);
      setAddress(savedAddress);
    }

    if (savedAccess && savedRefresh) {
      setAccessToken(savedAccess);
      setRefreshToken(savedRefresh);
      setUserRole(savedRole);
      setIsAuthenticated(true);
    }
  }, []);

  // ── Fetch balance & assets when address changes ────────────────
  const fetchAccountInfo = useCallback(async (addr: string) => {
    try {
      const accountInfo = await algodClient.accountInformation(addr).do();
      const rawAmount = typeof accountInfo.amount === 'bigint'
        ? Number(accountInfo.amount)
        : accountInfo.amount;
      setBalance(rawAmount / 1_000_000);

      if (accountInfo.assets && Array.isArray(accountInfo.assets)) {
        const assetList = await Promise.all(
          accountInfo.assets.slice(0, 20).map(async (asset: any) => {
            try {
              const assetInfo = await algodClient.getAssetByID(asset['asset-id']).do();
              return {
                id: asset['asset-id'],
                amount: asset.amount,
                name: (assetInfo as any).params?.name || 'Unknown',
                unitName: (assetInfo as any).params?.['unit-name'] || '',
              };
            } catch {
              return { id: asset['asset-id'], amount: asset.amount, name: 'Unknown Asset', unitName: '' };
            }
          })
        );
        setAssets(assetList);
      }
    } catch (error) {
      console.warn('Account info fetch failed (possibly unfunded):', error);
    }
  }, [algodClient]);

  useEffect(() => {
    if (address) {
      fetchAccountInfo(address);
      const interval = setInterval(() => fetchAccountInfo(address), 15000);
      return () => clearInterval(interval);
    }
  }, [address, fetchAccountInfo]);

  // ── CONNECT WALLET ─────────────────────────────────────────────
  const connectWallet = useCallback(async (type: WalletType) => {
    if (!type) return;
    setIsConnecting(true);

    try {
      let accounts: string[] = [];

      if (type === 'pera') {
        if (!peraWallet.current) {
          peraWallet.current = new PeraWalletConnect({
            chainId: network === 'mainnet' ? 416001 : 416002,
          });
        }
        accounts = await peraWallet.current.connect();
        peraWallet.current.connector?.on('disconnect', () => {
          clearSession();
        });
      } else if (type === 'defly') {
        if (!deflyWallet.current) {
          deflyWallet.current = new DeflyWalletConnect({
            chainId: network === 'mainnet' ? 416001 : 416002,
          });
        }
        accounts = await deflyWallet.current.connect();
        deflyWallet.current.connector?.on('disconnect', () => {
          clearSession();
        });
      }

      if (accounts.length > 0) {
        const addr = accounts[0];
        setConnectedWallet(type);
        setAddress(addr);
        localStorage.setItem('al_wallet', type);
        localStorage.setItem('al_address', addr);
      }
    } catch (error: any) {
      if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
        console.error(`${type} wallet connection error:`, error);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [network]);

  // ── SIGN & VERIFY (authenticate with backend) ─────────────────
  const signAndVerify = useCallback(async (): Promise<boolean> => {
    if (!address || !connectedWallet) return false;

    try {
      // 1. Request nonce from backend
      const nonceRes = await fetch(`${API_BASE}/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const nonceData = await nonceRes.json();
      const { nonce, message } = nonceData.data;

      // 2. Sign the message with the wallet
      const encodedMsg = new TextEncoder().encode(message);
      let signatureBytes: Uint8Array;

      if (connectedWallet === 'pera' && peraWallet.current) {
        const [sig] = await peraWallet.current.signData(
          [{ data: encodedMsg, message }],
          address,
        );
        signatureBytes = sig;
      } else if (connectedWallet === 'defly' && deflyWallet.current) {
        const [sig] = await deflyWallet.current.signData(
          [{ data: encodedMsg, message }],
          address,
        );
        signatureBytes = sig;
      } else {
        throw new Error('No wallet connected');
      }

      const signatureB64 = btoa(String.fromCharCode(...signatureBytes));

      // 3. Submit to backend for verification
      const verifyRes = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature: signatureB64, nonce }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.message || 'Verification failed');
      }

      const tokenData: { data: AuthTokens } = await verifyRes.json();
      const tokens = tokenData.data;

      // 4. Store tokens
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      setUserRole(tokens.role);
      setIsAuthenticated(true);

      localStorage.setItem('al_accessToken', tokens.accessToken);
      localStorage.setItem('al_refreshToken', tokens.refreshToken);
      localStorage.setItem('al_role', tokens.role);

      return true;
    } catch (error) {
      console.error('Sign & verify failed:', error);
      return false;
    }
  }, [address, connectedWallet]);

  // ── REFRESH SESSION ────────────────────────────────────────────
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearSession();
        return false;
      }

      const data = await res.json();
      const tokens = data.data;

      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      localStorage.setItem('al_accessToken', tokens.accessToken);
      localStorage.setItem('al_refreshToken', tokens.refreshToken);

      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [refreshToken]);

  // ── DISCONNECT + LOGOUT ────────────────────────────────────────
  const clearSession = useCallback(() => {
    setConnectedWallet(null);
    setAddress(null);
    setBalance(0);
    setAssets([]);
    setAccessToken(null);
    setRefreshToken(null);
    setUserRole(null);
    setIsAuthenticated(false);
    localStorage.removeItem('al_wallet');
    localStorage.removeItem('al_address');
    localStorage.removeItem('al_accessToken');
    localStorage.removeItem('al_refreshToken');
    localStorage.removeItem('al_role');
  }, []);

  const logoutFn = useCallback(async () => {
    try {
      if (accessToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch { /* ignore */ }

    // Disconnect wallet SDK
    try {
      if (connectedWallet === 'pera' && peraWallet.current) {
        await peraWallet.current.disconnect();
      } else if (connectedWallet === 'defly' && deflyWallet.current) {
        await deflyWallet.current.disconnect();
      }
    } catch { /* ignore */ }

    clearSession();
  }, [accessToken, connectedWallet, clearSession]);

  const disconnectWallet = logoutFn;

  // ── Auto-refresh token 5 min before expiry ─────────────────────
  useEffect(() => {
    if (!accessToken) return;
    // Decode expiry from JWT payload
    try {
      const payloadB64 = accessToken.split('.')[1];
      const payload = JSON.parse(atob(payloadB64));
      const expiresInMs = (payload.exp * 1000) - Date.now() - (5 * 60 * 1000);
      if (expiresInMs > 0) {
        const timer = setTimeout(() => refreshSession(), expiresInMs);
        return () => clearTimeout(timer);
      } else {
        refreshSession();
      }
    } catch { /* ignore */ }
  }, [accessToken, refreshSession]);

  // ── Network setter ─────────────────────────────────────────────
  const setNetwork = useCallback((net: NetworkType) => {
    setNetworkState(net);
    localStorage.setItem('al_network', net);
  }, []);

  const value: AlgorandContextType = {
    network,
    setNetwork,
    connectedWallet,
    address,
    balance,
    assets,
    connectWallet,
    disconnectWallet,
    isConnecting,
    algodClient,
    indexerClient,
    isAuthenticated,
    accessToken,
    userRole,
    signAndVerify,
    refreshSession,
    logout: logoutFn,
  };

  return <AlgorandContext.Provider value={value}>{children}</AlgorandContext.Provider>;
};
