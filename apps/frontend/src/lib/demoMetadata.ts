/**
 * Demo Metadata Store
 * 
 * Stores enriched metadata for assets deployed in demo mode.
 * This allows the marketplace to display demo liquidity and oracle data
 * for presentation purposes.
 */

export interface DemoData {
  tokenAddress: string;
  demoMode: true;
  ammPoolAddress?: string;
  liquidityDemo?: {
    tokenReserve: string;
    ethReserve: string;
    lpTokensMinted: string;
    initialPrice: string;
    poolShare: string;
  };
  oracleDemo?: {
    priceFeed: {
      address: string;
      lastUpdate: string;
      price: string;
      decimals: number;
      staleness: string;
      source: string;
    };
    reserveFeed: {
      address: string;
      lastUpdate: string;
      reserves: string;
      deviation: string;
      status: string;
    };
  };
}

// In-memory store for demo data
// In production, this would be in a database
const demoStore = new Map<string, DemoData>();

export function saveDemoData(data: DemoData): void {
  const key = data.tokenAddress.toLowerCase();
  demoStore.set(key, data);
  console.log(`📦 Saved demo data for token ${data.tokenAddress}`);
}

export function getDemoData(tokenAddress: string): DemoData | null {
  const key = tokenAddress.toLowerCase();
  return demoStore.get(key) || null;
}

export function hasDemoData(tokenAddress: string): boolean {
  const key = tokenAddress.toLowerCase();
  return demoStore.has(key);
}

export function clearDemoData(tokenAddress: string): void {
  const key = tokenAddress.toLowerCase();
  demoStore.delete(key);
}

export function getAllDemoData(): DemoData[] {
  return Array.from(demoStore.values());
}
