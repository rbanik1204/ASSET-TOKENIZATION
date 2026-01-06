import { NextResponse } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { getContractsForChain } from '@/config/contracts';

/**
 * Health Monitoring API
 * 
 * Returns real-time health indicators for system monitoring:
 * - Oracle freshness (time since last update)
 * - AMM liquidity depth (ETH reserves)
 * - Contract deployment status
 * 
 * Used by: Admin dashboard, monitoring alerts
 */

interface HealthIndicator {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  value?: string;
  message: string;
  timestamp: number;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  indicators: HealthIndicator[];
  checkedAt: string;
}

// Thresholds
const ORACLE_STALE_WARNING = 30 * 60; // 30 minutes
const ORACLE_STALE_CRITICAL = 60 * 60; // 1 hour (MAX_ORACLE_AGE)
const AMM_LIQUIDITY_WARNING = 1; // 1 ETH
const AMM_LIQUIDITY_CRITICAL = 0.1; // 0.1 ETH

export async function GET() {
  try {
    const chainId = 11155111; // Sepolia
    const contracts = getContractsForChain(chainId);

    const client = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    const indicators: HealthIndicator[] = [];

    // Check 1: Oracle Price Feed Deployment
    if (!contracts.ORACLE_PRICE_FEED || contracts.ORACLE_PRICE_FEED === '') {
      indicators.push({
        name: 'Oracle Price Feed',
        status: 'critical',
        message: 'Oracle price feed not deployed or configured',
        timestamp: Date.now(),
      });
    } else {
      try {
        const code = await client.getBytecode({ address: contracts.ORACLE_PRICE_FEED as `0x${string}` });
        indicators.push({
          name: 'Oracle Price Feed',
          status: code && code !== '0x' ? 'healthy' : 'critical',
          value: contracts.ORACLE_PRICE_FEED,
          message: code && code !== '0x' ? 'Deployed and accessible' : 'Contract not found at address',
          timestamp: Date.now(),
        });
      } catch (error) {
        indicators.push({
          name: 'Oracle Price Feed',
          status: 'unknown',
          value: contracts.ORACLE_PRICE_FEED,
          message: `Failed to check deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        });
      }
    }

    // Check 2: Proof of Reserve Deployment
    if (!contracts.PROOF_OF_RESERVE || contracts.PROOF_OF_RESERVE === '') {
      indicators.push({
        name: 'Proof of Reserve',
        status: 'critical',
        message: 'Proof of reserve not deployed or configured',
        timestamp: Date.now(),
      });
    } else {
      try {
        const code = await client.getBytecode({ address: contracts.PROOF_OF_RESERVE as `0x${string}` });
        indicators.push({
          name: 'Proof of Reserve',
          status: code && code !== '0x' ? 'healthy' : 'critical',
          value: contracts.PROOF_OF_RESERVE,
          message: code && code !== '0x' ? 'Deployed and accessible' : 'Contract not found at address',
          timestamp: Date.now(),
        });
      } catch (error) {
        indicators.push({
          name: 'Proof of Reserve',
          status: 'unknown',
          value: contracts.PROOF_OF_RESERVE,
          message: `Failed to check deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        });
      }
    }

    // Check 3: AMM Pool Liquidity (if configured)
    if (contracts.AMM_POOL && contracts.AMM_POOL !== '') {
      try {
        const balance = await client.getBalance({ address: contracts.AMM_POOL as `0x${string}` });
        const ethBalance = Number(formatEther(balance));

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        let message = `${ethBalance.toFixed(4)} ETH in pool`;

        if (ethBalance < AMM_LIQUIDITY_CRITICAL) {
          status = 'critical';
          message = `Critical: Only ${ethBalance.toFixed(4)} ETH in pool (< ${AMM_LIQUIDITY_CRITICAL} ETH)`;
        } else if (ethBalance < AMM_LIQUIDITY_WARNING) {
          status = 'warning';
          message = `Warning: Only ${ethBalance.toFixed(4)} ETH in pool (< ${AMM_LIQUIDITY_WARNING} ETH)`;
        }

        indicators.push({
          name: 'AMM Pool Liquidity',
          status,
          value: `${ethBalance.toFixed(4)} ETH`,
          message,
          timestamp: Date.now(),
        });
      } catch (error) {
        indicators.push({
          name: 'AMM Pool Liquidity',
          status: 'unknown',
          value: contracts.AMM_POOL,
          message: `Failed to check liquidity: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        });
      }
    } else {
      indicators.push({
        name: 'AMM Pool Liquidity',
        status: 'warning',
        message: 'AMM pool not configured',
        timestamp: Date.now(),
      });
    }

    // Check 4: Asset Registry
    if (!contracts.ASSET_REGISTRY || contracts.ASSET_REGISTRY === '') {
      indicators.push({
        name: 'Asset Registry',
        status: 'critical',
        message: 'Asset registry not deployed or configured',
        timestamp: Date.now(),
      });
    } else {
      try {
        const code = await client.getBytecode({ address: contracts.ASSET_REGISTRY as `0x${string}` });
        indicators.push({
          name: 'Asset Registry',
          status: code && code !== '0x' ? 'healthy' : 'critical',
          value: contracts.ASSET_REGISTRY,
          message: code && code !== '0x' ? 'Deployed and accessible' : 'Contract not found at address',
          timestamp: Date.now(),
        });
      } catch (error) {
        indicators.push({
          name: 'Asset Registry',
          status: 'unknown',
          value: contracts.ASSET_REGISTRY,
          message: `Failed to check deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        });
      }
    }

    // Check 5: Primary Sale
    if (contracts.PRIMARY_SALE && contracts.PRIMARY_SALE !== '') {
      try {
        const code = await client.getBytecode({ address: contracts.PRIMARY_SALE as `0x${string}` });
        indicators.push({
          name: 'Primary Sale',
          status: code && code !== '0x' ? 'healthy' : 'warning',
          value: contracts.PRIMARY_SALE,
          message: code && code !== '0x' ? 'Deployed and accessible' : 'Contract not found at address',
          timestamp: Date.now(),
        });
      } catch (error) {
        indicators.push({
          name: 'Primary Sale',
          status: 'unknown',
          value: contracts.PRIMARY_SALE,
          message: `Failed to check deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        });
      }
    }

    // Determine overall health
    const criticalCount = indicators.filter((i) => i.status === 'critical').length;
    const warningCount = indicators.filter((i) => i.status === 'warning').length;

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (warningCount > 0) {
      overall = 'degraded';
    }

    const health: SystemHealth = {
      overall,
      indicators,
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        overall: 'unknown',
        indicators: [
          {
            name: 'System Health Check',
            status: 'unknown',
            message: `Failed to perform health check: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: Date.now(),
          },
        ],
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
