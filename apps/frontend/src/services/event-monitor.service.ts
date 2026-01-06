/**
 * Blockchain Event Monitor
 * Listens for blockchain events and triggers notifications
 * Run this as a background service
 */

import { createPublicClient, http, parseAbiItem, Log } from 'viem';
import { sepolia } from 'viem/chains';
import { ABIS, getContractsForChain } from '@/config/contracts';

const contracts = getContractsForChain(11155111); // Sepolia chain ID

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'),
});

// Event signatures
const TOKEN_REGISTRY_EVENTS = [
  parseAbiItem('event TokenRegistered(address indexed token, string name, string symbol, address indexed owner, uint256 totalSupply, string metadataURI)'),
];

const PRIMARY_SALE_EVENTS = [
  parseAbiItem('event TokensPurchased(address indexed token, address indexed buyer, uint256 amount, uint256 totalCost)'),
];

const INCOME_DISTRIBUTION_EVENTS = [
  parseAbiItem('event IncomeDeposited(address indexed token, uint256 amount, uint256 depositTime)'),
];

interface AssetMetadata {
  contact?: {
    email?: string | null;
    phone?: string | null;
    notificationConsent?: boolean;
  };
  assetDetails?: {
    name?: string;
  };
  submitter?: string;
}

/**
 * Fetch asset metadata from IPFS
 */
async function fetchMetadata(metadataURI: string): Promise<AssetMetadata | null> {
  try {
    if (!metadataURI) return null;
    
    // Convert IPFS URI to HTTP gateway
    let url = metadataURI;
    if (url.startsWith('ipfs://')) {
      url = url.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    return null;
  }
}

/**
 * Send notification via API
 */
async function triggerNotification(payload: {
  type: 'ASSET_SUBMITTED' | 'ASSET_APPROVED' | 'TOKENS_PURCHASED' | 'INCOME_DEPOSITED';
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  data: Record<string, any>;
}) {
  try {
    const response = await fetch('http://localhost:3000/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Notification API error:', error);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Notification sent:', result);
  } catch (error) {
    console.error('Failed to trigger notification:', error);
  }
}

/**
 * Monitor TokenRegistered events (Asset Approved)
 */
async function monitorTokenRegistry() {
  console.log('🔍 Monitoring AssetRegistry for new assets...');
  
  const unwatch = publicClient.watchContractEvent({
    address: contracts.ASSET_REGISTRY as `0x${string}`,
    abi: ABIS.ASSET_REGISTRY,
    eventName: 'TokenRegistered',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { args } = log as any;
        console.log('🎉 New asset registered:', args);
        
        // Fetch metadata to get contact info
        const metadata = await fetchMetadata(args.metadataURI);
        
        if (metadata?.contact?.notificationConsent) {
          await triggerNotification({
            type: 'ASSET_APPROVED',
            recipientEmail: metadata.contact.email,
            recipientPhone: metadata.contact.phone,
            data: {
              assetName: args.name || metadata.assetDetails?.name || 'Your Asset',
              tokenAddress: args.token,
            },
          });
        }
      }
    },
  });
  
  return unwatch;
}

/**
 * Monitor TokensPurchased events
 */
async function monitorPrimarySale() {
  console.log('🔍 Monitoring PrimarySale for token purchases...');
  
  const unwatch = publicClient.watchContractEvent({
    address: contracts.PRIMARY_SALE as `0x${string}`,
    abi: ABIS.PRIMARY_SALE,
    eventName: 'TokensPurchased',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { args } = log as any;
        console.log('💰 Tokens purchased:', args);
        
        // Get token details from registry
        try {
          const assetId = await publicClient.readContract({
            address: contracts.ASSET_REGISTRY as `0x${string}`,
            abi: ABIS.ASSET_REGISTRY,
            functionName: 'getAssetIdByToken',
            args: [args.token],
          }) as bigint;
          
          const tokenData = await publicClient.readContract({
            address: contracts.ASSET_REGISTRY as `0x${string}`,
            abi: ABIS.ASSET_REGISTRY,
            functionName: 'getAsset',
            args: [assetId],
          }) as any;
          
          // Fetch metadata to get owner's contact info
          const metadata = await fetchMetadata(tokenData.metadataURI);
          
          if (metadata?.contact?.notificationConsent) {
            await triggerNotification({
              type: 'TOKENS_PURCHASED',
              recipientEmail: metadata.contact.email,
              recipientPhone: metadata.contact.phone,
              data: {
                assetName: tokenData.name || metadata.assetDetails?.name || 'Your Asset',
                amount: args.amount.toString(),
                buyer: args.buyer,
              },
            });
          }
        } catch (error) {
          console.error('Failed to fetch token data:', error);
        }
      }
    },
  });
  
  return unwatch;
}

/**
 * Monitor IncomeDeposited events
 */
async function monitorIncomeDistribution() {
  console.log('🔍 Monitoring IncomeDistributor for income deposits...');
  
  const unwatch = publicClient.watchContractEvent({
    address: contracts.INCOME_DISTRIBUTOR as `0x${string}`,
    abi: ABIS.INCOME_DISTRIBUTOR,
    eventName: 'IncomeDeposited',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { args } = log as any;
        console.log('💵 Income deposited:', args);
        
        // Get token details from registry
        try {
          const assetId = await publicClient.readContract({
            address: contracts.ASSET_REGISTRY as `0x${string}`,
            abi: ABIS.ASSET_REGISTRY,
            functionName: 'getAssetIdByToken',
            args: [args.token],
          }) as bigint;
          
          const tokenData = await publicClient.readContract({
            address: contracts.ASSET_REGISTRY as `0x${string}`,
            abi: ABIS.ASSET_REGISTRY,
            functionName: 'getAsset',
            args: [assetId],
          }) as any;
          
          // Fetch metadata to get owner's contact info
          const metadata = await fetchMetadata(tokenData.metadataURI);
          
          if (metadata?.contact?.notificationConsent) {
            await triggerNotification({
              type: 'INCOME_DEPOSITED',
              recipientEmail: metadata.contact.email,
              recipientPhone: metadata.contact.phone,
              data: {
                assetName: tokenData.name || metadata.assetDetails?.name || 'Your Asset',
                amount: (Number(args.amount) / 1e18).toFixed(2),
                currency: 'ETH',
              },
            });
          }
        } catch (error) {
          console.error('Failed to fetch token data:', error);
        }
      }
    },
  });
  
  return unwatch;
}

/**
 * Start all event monitors
 */
export async function startEventMonitoring() {
  console.log('🚀 Starting blockchain event monitoring...');
  
  try {
    const unwatchTokenRegistry = await monitorTokenRegistry();
    const unwatchPrimarySale = await monitorPrimarySale();
    const unwatchIncomeDistribution = await monitorIncomeDistribution();
    
    console.log('✅ All event monitors started successfully');
    
    // Return cleanup function
    return () => {
      unwatchTokenRegistry();
      unwatchPrimarySale();
      unwatchIncomeDistribution();
      console.log('🛑 Event monitoring stopped');
    };
  } catch (error) {
    console.error('❌ Failed to start event monitoring:', error);
    throw error;
  }
}

// Auto-start if running as main module
if (require.main === module) {
  startEventMonitoring().catch(console.error);
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('👋 Shutting down event monitor...');
    process.exit(0);
  });
}
