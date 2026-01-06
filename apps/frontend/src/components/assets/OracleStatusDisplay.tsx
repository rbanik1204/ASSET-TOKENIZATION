'use client';

import React from 'react';
import { Alert } from '../ui/Alert';

type OracleStatusDisplayProps = {
  oracleVerified: boolean | null;
  oracleChecking: boolean;
  oracleError: string | null;
  contracts: {
    ORACLE_PRICE_FEED?: string;
    PROOF_OF_RESERVE?: string;
  };
  chainId: number;
};

export function OracleStatusDisplay({
  oracleVerified,
  oracleChecking,
  oracleError,
  contracts,
  chainId,
}: OracleStatusDisplayProps) {
  const explorerUrl = chainId === 11155111 ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';

  return (
    <div className="surface rounded-lg">
      <div className="px-6 py-4 border-b border-[color:var(--border)]">
        <div className="text-sm font-semibold">🔍 Oracle Verification Status</div>
        <div className="mt-1 text-xs text-[color:var(--text-muted)]">
          Real-time on-chain verification
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {oracleChecking && (
          <Alert type="info" message="Checking oracle verification..." />
        )}

        {oracleError && (
          <Alert type="error" message={oracleError} />
        )}

        {oracleVerified === true && (
          <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold text-green-500">✓ Verified</div>
              <div className="mt-1 text-xs text-green-500/80">
                Reserves confirmed on-chain. Oracle data is current and reserves match token supply within acceptable deviation.
              </div>
            </div>
          </div>
        )}

        {oracleVerified === false && (
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-500">⚠ Not Verified</div>
              <div className="mt-1 text-xs text-red-500/80">
                This asset cannot be verified on-chain. Purchase is disabled until verification passes.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[color:var(--border)]">
          <div>
            <div className="text-xs text-[color:var(--text-muted)] mb-1">Oracle Price Feed</div>
            {contracts.ORACLE_PRICE_FEED ? (
              <a
                href={`${explorerUrl}/address/${contracts.ORACLE_PRICE_FEED}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[color:var(--accent)] hover:underline break-all"
              >
                {contracts.ORACLE_PRICE_FEED}
              </a>
            ) : (
              <span className="text-xs text-[color:var(--text-muted)]">Not configured</span>
            )}
          </div>
          <div>
            <div className="text-xs text-[color:var(--text-muted)] mb-1">Proof of Reserve</div>
            {contracts.PROOF_OF_RESERVE ? (
              <a
                href={`${explorerUrl}/address/${contracts.PROOF_OF_RESERVE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[color:var(--accent)] hover:underline break-all"
              >
                {contracts.PROOF_OF_RESERVE}
              </a>
            ) : (
              <span className="text-xs text-[color:var(--text-muted)]">Not configured</span>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[color:var(--border)]">
          <div className="text-xs text-[color:var(--text-muted)] space-y-2">
            <div className="font-semibold text-[color:var(--text)]">Verification Requirements:</div>
            <ul className="space-y-1.5 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-[color:var(--accent)] mt-0.5">•</span>
                <span>Oracle data must be less than 1 hour old</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[color:var(--accent)] mt-0.5">•</span>
                <span>Reserves must match token supply within 5% deviation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[color:var(--accent)] mt-0.5">•</span>
                <span>Asset must be approved in on-chain approval queue</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
