'use client';

import React from 'react';
import { formatEther, formatUnits } from 'viem';
import { Alert } from '../ui/Alert';

type AMMPoolHealthProps = {
  poolAddress: string | null;
  reserveToken: bigint;
  reserveETH: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
  chainId: number;
};

export function AMMPoolHealth({
  poolAddress,
  reserveToken,
  reserveETH,
  tokenSymbol,
  tokenDecimals,
  chainId,
}: AMMPoolHealthProps) {
  const explorerUrl = chainId === 11155111 ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';

  const hasLiquidity = reserveToken > 0n && reserveETH > 0n;
  const tokenReserveFormatted = formatUnits(reserveToken, tokenDecimals);
  const ethReserveFormatted = formatEther(reserveETH);

  // Calculate price: ETH per token
  const pricePerToken = hasLiquidity
    ? (Number(reserveETH) / 10 ** 18) / (Number(reserveToken) / 10 ** tokenDecimals)
    : 0;

  // Calculate liquidity health score (0-100)
  const liquidityScore = React.useMemo(() => {
    if (!hasLiquidity) return 0;
    const ethValue = Number(reserveETH) / 10 ** 18;
    // Score based on ETH liquidity depth
    // 0.1 ETH = 20%, 1 ETH = 60%, 10 ETH = 100%
    if (ethValue >= 10) return 100;
    if (ethValue >= 1) return 60 + (ethValue - 1) * 4.4; // 60-100%
    if (ethValue >= 0.1) return 20 + (ethValue - 0.1) * 44.4; // 20-60%
    return ethValue * 200; // 0-20%
  }, [hasLiquidity, reserveETH]);

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 70) return 'bg-green-500/10 border-green-500/20';
    if (score >= 40) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="surface rounded-lg">
      <div className="px-6 py-4 border-b border-[color:var(--border)]">
        <div className="text-sm font-semibold">💧 AMM Pool Liquidity</div>
        <div className="mt-1 text-xs text-[color:var(--text-muted)]">
          Secondary market depth and trading health
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {poolAddress ? (
          <>
            <div className="text-xs text-[color:var(--text-muted)] mb-1">Pool Contract</div>
            <a
              href={`${explorerUrl}/address/${poolAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-[color:var(--accent)] hover:underline break-all"
            >
              {poolAddress}
            </a>

            {hasLiquidity ? (
              <>
                <div className={`p-4 border rounded-lg ${getHealthBg(liquidityScore)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Liquidity Health</span>
                    <span className={`text-lg font-bold ${getHealthColor(liquidityScore)}`}>
                      {Math.round(liquidityScore)}%
                    </span>
                  </div>
                  <div className="w-full bg-[color:var(--border)] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        liquidityScore >= 70 ? 'bg-green-500' : liquidityScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${liquidityScore}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[color:var(--text-muted)] mb-1">Pool {tokenSymbol}</div>
                    <div className="text-lg font-semibold tabular-nums">{Number(tokenReserveFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[color:var(--text-muted)] mb-1">Pool ETH</div>
                    <div className="text-lg font-semibold tabular-nums">{Number(ethReserveFormatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[color:var(--border)]">
                  <div className="text-xs text-[color:var(--text-muted)] mb-1">Current AMM Price</div>
                  <div className="text-xl font-bold text-[color:var(--accent)]">
                    {pricePerToken.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)] mt-1">per {tokenSymbol}</div>
                </div>
              </>
            ) : (
              <Alert
                type="warning"
                message="No liquidity in AMM pool. Secondary market trading is not available."
              />
            )}
          </>
        ) : (
          <Alert type="info" message="AMM pool not configured for this asset." />
        )}

        <div className="pt-4 border-t border-[color:var(--border)]">
          <div className="text-xs text-[color:var(--text-muted)]">
            <span className="font-semibold text-[color:var(--text)]">About AMM:</span> The Automated Market Maker provides instant liquidity for buying and selling tokens. Price adjusts automatically based on supply and demand.
          </div>
        </div>
      </div>
    </div>
  );
}
