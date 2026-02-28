/**
 * Algorand Network Configuration
 */

export type AlgorandNetwork = 'testnet' | 'mainnet' | 'sandbox';

export interface AlgorandConfig {
  network: AlgorandNetwork;
  algodServer: string;
  algodToken: string;
  indexerServer: string;
  indexerToken: string;
}

export const ALGORAND_NETWORKS: Record<AlgorandNetwork, AlgorandConfig> = {
  testnet: {
    network: 'testnet',
    algodServer: 'https://testnet-api.algonode.cloud',
    algodToken: '',
    indexerServer: 'https://testnet-idx.algonode.cloud',
    indexerToken: '',
  },
  mainnet: {
    network: 'mainnet',
    algodServer: 'https://mainnet-api.algonode.cloud',
    algodToken: '',
    indexerServer: 'https://mainnet-idx.algonode.cloud',
    indexerToken: '',
  },
  sandbox: {
    network: 'sandbox',
    algodServer: 'http://localhost:4001',
    algodToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    indexerServer: 'http://localhost:8980',
    indexerToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
};

// Get current network from environment
export const getCurrentAlgorandNetwork = (): AlgorandNetwork => {
  const network = process.env.NEXT_PUBLIC_ALGORAND_NETWORK as AlgorandNetwork;
  return network || 'testnet';
};

export const getAlgorandConfig = (): AlgorandConfig => {
  const network = getCurrentAlgorandNetwork();
  return ALGORAND_NETWORKS[network];
};

// Contract addresses (populated after deployment)
export const ALGORAND_CONTRACTS = {
  assetRegistry: process.env.NEXT_PUBLIC_ASSET_REGISTRY_ID || '',
  nftCredential: process.env.NEXT_PUBLIC_NFT_CREDENTIAL_ID || '',
  escrow: process.env.NEXT_PUBLIC_ESCROW_ID || '',
  crowdfunding: process.env.NEXT_PUBLIC_CROWDFUNDING_ID || '',
};

// Testnet faucet
export const TESTNET_FAUCET_URL = 'https://bank.testnet.algorand.network/';

// Explorer URLs
export const getExplorerUrl = (network: AlgorandNetwork, type: 'tx' | 'address' | 'asset' | 'app', id: string): string => {
  const baseUrls = {
    testnet: 'https://testnet.algoexplorer.io',
    mainnet: 'https://algoexplorer.io',
    sandbox: 'http://localhost:8980',
  };
  
  const base = baseUrls[network];
  const typeMap = {
    tx: 'tx',
    address: 'address',
    asset: 'asset',
    app: 'application',
  };
  
  return `${base}/${typeMap[type]}/${id}`;
};
