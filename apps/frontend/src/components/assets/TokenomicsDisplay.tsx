'use client';

import React from 'react';

type TokenomicsDisplayProps = {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  totalSupply: bigint;
  userBalance: bigint;
  tokenAddress: string;
  chainId: number;
};

export function TokenomicsDisplay({
  tokenName,
  tokenSymbol,
  tokenDecimals,
  totalSupply,
  userBalance,
  tokenAddress,
  chainId,
}: TokenomicsDisplayProps) {
  const explorerUrl = chainId === 11155111 ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';
  const totalSupplyFormatted = (Number(totalSupply) / 10 ** tokenDecimals).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
  const userBalanceFormatted = (Number(userBalance) / 10 ** tokenDecimals).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });

  return (
    <div className="surface rounded-lg">
      <div className="px-6 py-4 border-b border-[color:var(--border)]">
        <div className="text-sm font-semibold">📊 Tokenomics</div>
        <div className="mt-1 text-xs text-[color:var(--text-muted)]">
          Token supply and distribution
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody className="divide-y divide-[color:var(--border)]">
              <tr>
                <td className="py-3 text-sm text-[color:var(--text-muted)]">Token Name</td>
                <td className="py-3 text-sm text-right font-semibold">{tokenName}</td>
              </tr>
              <tr>
                <td className="py-3 text-sm text-[color:var(--text-muted)]">Symbol</td>
                <td className="py-3 text-sm text-right font-semibold">{tokenSymbol}</td>
              </tr>
              <tr>
                <td className="py-3 text-sm text-[color:var(--text-muted)]">Decimals</td>
                <td className="py-3 text-sm text-right font-semibold tabular-nums">{tokenDecimals}</td>
              </tr>
              <tr>
                <td className="py-3 text-sm text-[color:var(--text-muted)]">Total Supply</td>
                <td className="py-3 text-sm text-right font-semibold tabular-nums">
                  {totalSupplyFormatted} {tokenSymbol}
                </td>
              </tr>
              <tr>
                <td className="py-3 text-sm text-[color:var(--text-muted)]">Your Balance</td>
                <td className="py-3 text-sm text-right font-semibold tabular-nums text-[color:var(--accent)]">
                  {userBalanceFormatted} {tokenSymbol}
                </td>
              </tr>
              <tr>
                <td className="py-3 text-sm text-[color:var(--text-muted)]">Contract Address</td>
                <td className="py-3 text-sm text-right">
                  <a
                    href={`${explorerUrl}/token/${tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[color:var(--accent)] hover:underline break-all"
                  >
                    {tokenAddress}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
