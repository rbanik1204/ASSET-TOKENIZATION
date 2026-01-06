export interface Asset {
  id: string;
  address: string;
  name: string;
  symbol: string;
  description: string;
  location: string;
  assetType: 'real-estate' | 'equipment' | 'vehicle' | 'art' | 'other';
  images: string[];
  documents: {
    name: string;
    url: string;
    type: 'legal' | 'valuation' | 'insurance' | 'other';
  }[];
  totalSupply: number;
  availableSupply: number;
  pricePerToken: number;
  marketCap: number;
  verified: boolean;
  oracleVerified: boolean;
  createdAt: string;
  owner: string;
}

export interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
}

export interface Portfolio {
  totalValue: number;
  assets: PortfolioAsset[];
  totalInvested: number;
  totalReturn: number;
  returnPercentage: number;
}

export interface PortfolioAsset {
  asset: Asset;
  tokensOwned: number;
  currentValue: number;
  invested: number;
  profit: number;
  profitPercentage: number;
}

export interface IncomeRecord {
  assetAddress: string;
  assetName: string;
  amount: number;
  timestamp: number;
  claimed: boolean;
  txHash?: string;
}

export interface TradeParams {
  assetAddress: string;
  amount: number;
  type: 'buy' | 'sell';
  slippage: number;
  expectedPrice: number;
  priceImpact: number;
}

export interface TransactionStatus {
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  txHash?: string;
  error?: string;
}

export interface AdminAsset {
  asset: Asset;
  submissionDate: string;
  status: 'pending' | 'approved' | 'rejected';
  submitter: string;
  reviewNotes?: string;
}
