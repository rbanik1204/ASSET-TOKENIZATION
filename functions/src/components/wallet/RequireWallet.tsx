'use client';

import React from 'react';
import { useAccount, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Alert } from '@/components/ui/Alert';

type Props = {
  children?: React.ReactNode;
  supportedChainIds: number[];
  wrongNetworkMessage?: string;
};

export function RequireWallet({ children, supportedChainIds, wrongNetworkMessage }: Props) {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  if (!isConnected) {
    return (
      <div className="surface p-6 rounded-lg border border-[color:var(--border)]">
        <div className="flex flex-col gap-4">
          <Alert type="warning" message="Please connect your wallet to continue." />
          <div>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  const isSupported = supportedChainIds.includes(chainId);

  return (
    <>
      {!isSupported && (
        <div className="mb-6">
          <Alert
            type="error"
            message={
              wrongNetworkMessage ||
              (supportedChainIds.length
                ? `Wrong network. Please switch to one of the supported chains: ${supportedChainIds.join(', ')}.`
                : 'No supported networks are configured for this action. Configure contract addresses for at least one chain.')
            }
          />
        </div>
      )}
      {children ?? null}
    </>
  );
}
