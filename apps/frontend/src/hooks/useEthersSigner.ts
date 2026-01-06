'use client';

import * as React from 'react';
import { BrowserProvider, type JsonRpcSigner } from 'ethers';
import { useWalletClient } from 'wagmi';

// Converts wagmi's WalletClient into an ethers.js Signer without auto-signing anything.
export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();

  const [signer, setSigner] = React.useState<JsonRpcSigner | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!walletClient) {
        setSigner(null);
        return;
      }

      // WalletClient implements a request method compatible with EIP-1193.
      const eip1193 = {
        request: walletClient.request,
      } as any;

      const provider = new BrowserProvider(eip1193);
      const nextSigner = await provider.getSigner();
      if (!cancelled) setSigner(nextSigner);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [walletClient]);

  return signer;
}
