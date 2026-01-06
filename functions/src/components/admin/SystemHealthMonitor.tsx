'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';

interface HealthIndicator {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  value?: string;
  message: string;
  timestamp: number;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical' | 'unknown';
  indicators: HealthIndicator[];
  checkedAt: string;
}

export function SystemHealthMonitor() {
  const [health, setHealth] = React.useState<SystemHealth | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchHealth = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading && !health) {
    return (
      <div className="surface rounded-lg p-6">
        <div className="text-sm text-[color:var(--text-muted)]">Checking system health...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface rounded-lg p-6">
        <Alert type="error" message={`Health check failed: ${error}`} />
        <button
          onClick={fetchHealth}
          className="mt-4 text-sm text-[color:var(--accent)] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!health) return null;

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-amber-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs">✓ Healthy</span>;
      case 'warning':
        return <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-xs">⚠ Warning</span>;
      case 'critical':
        return <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs">✕ Critical</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/10 text-gray-500 rounded text-xs">? Unknown</span>;
    }
  };

  const criticalIndicators = health.indicators.filter((i) => i.status === 'critical');
  const warningIndicators = health.indicators.filter((i) => i.status === 'warning');

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className="surface rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">System Health</h3>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Last checked: {new Date(health.checkedAt).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getOverallStatusColor(health.overall)}`}>
              {health.overall.toUpperCase()}
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="mt-2 text-sm text-[color:var(--accent)] hover:underline disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalIndicators.length > 0 && (
        <div className="surface rounded-lg p-6 border-2 border-red-500">
          <h4 className="text-md font-semibold text-red-500 mb-3">🚨 Critical Issues</h4>
          <div className="space-y-2">
            {criticalIndicators.map((indicator, idx) => (
              <div key={idx} className="p-3 bg-red-500/5 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{indicator.name}</span>
                  {getStatusBadge(indicator.status)}
                </div>
                <div className="text-sm text-[color:var(--text-muted)]">{indicator.message}</div>
                {indicator.value && (
                  <div className="mt-1 text-xs font-mono text-[color:var(--text-muted)]">{indicator.value}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Alerts */}
      {warningIndicators.length > 0 && (
        <div className="surface rounded-lg p-6 border border-amber-500">
          <h4 className="text-md font-semibold text-amber-500 mb-3">⚠️ Warnings</h4>
          <div className="space-y-2">
            {warningIndicators.map((indicator, idx) => (
              <div key={idx} className="p-3 bg-amber-500/5 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{indicator.name}</span>
                  {getStatusBadge(indicator.status)}
                </div>
                <div className="text-sm text-[color:var(--text-muted)]">{indicator.message}</div>
                {indicator.value && (
                  <div className="mt-1 text-xs font-mono text-[color:var(--text-muted)]">{indicator.value}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Indicators */}
      <div className="surface rounded-lg">
        <div className="px-6 py-4 border-b border-[color:var(--border)]">
          <h4 className="text-md font-semibold">All Health Indicators</h4>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {health.indicators.map((indicator, idx) => (
            <div key={idx} className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{indicator.name}</span>
                {getStatusBadge(indicator.status)}
              </div>
              <div className="text-sm text-[color:var(--text-muted)]">{indicator.message}</div>
              {indicator.value && (
                <div className="mt-1 text-xs font-mono text-[color:var(--text-muted)]">{indicator.value}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Monitoring Guidelines */}
      <div className="surface rounded-lg p-6">
        <h4 className="text-md font-semibold mb-3">Monitoring Guidelines</h4>
        <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
          <li className="flex items-start gap-2">
            <span className="text-[color:var(--accent)] mt-0.5">→</span>
            <span>
              <strong>Oracle Freshness:</strong> Oracles should update within 1 hour (MAX_ORACLE_AGE). Stale data
              blocks verification.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[color:var(--accent)] mt-0.5">→</span>
            <span>
              <strong>AMM Liquidity:</strong> Pool should maintain {'>'} 1 ETH for healthy trading. Below 0.1 ETH is
              critical.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[color:var(--accent)] mt-0.5">→</span>
            <span>
              <strong>Contract Deployment:</strong> All core contracts must be deployed and accessible on-chain.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[color:var(--accent)] mt-0.5">→</span>
            <span>
              <strong>Health Checks:</strong> System health refreshes every 30 seconds. Manual refresh available.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
