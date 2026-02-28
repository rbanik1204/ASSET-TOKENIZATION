import algosdk from 'algosdk';

interface AssetInfo {
  asaId: number;
  totalSupply: number;
  circulatingSupply: number;
  holderCount: number;
  verified: boolean;
  reserves?: number;
}

interface AssetTransaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  asaId: number;
  timestamp: number;
  roundTime: number;
  confirmedRound: number;
  txType: string;
  note?: string;
}

interface AssetBalance {
  address: string;
  balance: number;
  asaId: number;
  frozen: boolean;
}

export class IndexerService {
  private indexerClient: algosdk.Indexer;
  private network: 'testnet' | 'mainnet';

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;

    if (network === 'testnet') {
      // TestNet Indexer
      this.indexerClient = new algosdk.Indexer(
        '',
        'https://testnet-idx.algonode.cloud',
        443
      );
    } else {
      // MainNet Indexer
      this.indexerClient = new algosdk.Indexer(
        '',
        'https://mainnet-idx.algonode.cloud',
        443
      );
    }
  }

  /**
   * Get comprehensive information about an ASA
   */
  async getAssetInfo(asaId: number): Promise<AssetInfo | null> {
    try {
      const assetInfo = await this.indexerClient.lookupAssetByID(asaId).do();
      
      if (!assetInfo || !assetInfo.asset) {
        return null;
      }

      const asset = assetInfo.asset;
      const params = asset.params;

      // Get holder count by querying balances
      const balances = await this.indexerClient
        .lookupAssetBalances(asaId)
        .currencyGreaterThan(0) // Only accounts with balance > 0
        .do();

      const holderCount = balances.balances?.length || 0;

      // Calculate circulating supply (total - reserves)
      const totalSupply = Number(params.total || 0);
      const reserves = params.reserve 
        ? await this.getAccountBalance(params.reserve, asaId)
        : 0;
      const circulatingSupply = totalSupply - reserves;

      return {
        asaId,
        totalSupply,
        circulatingSupply,
        holderCount,
        verified: false, // Will be checked against verification contract
        reserves,
      };
    } catch (error) {
      console.error(`Error fetching asset info for ASA ${asaId}:`, error);
      return null;
    }
  }

  /**
   * Get account balance for a specific ASA
   */
  async getAccountBalance(address: string, asaId: number): Promise<number> {
    try {
      const accountInfo = await this.indexerClient.lookupAccountByID(address).do();
      
      if (!accountInfo || !accountInfo.account) {
        return 0;
      }

      const assets = accountInfo.account.assets || [];
      const assetHolding = assets.find((a: any) => a['asset-id'] === asaId);

      return Number(assetHolding?.amount || 0);
    } catch (error) {
      console.error(`Error fetching balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get all holders of an ASA
   */
  async getAssetHolders(asaId: number, minBalance: number = 1): Promise<AssetBalance[]> {
    try {
      const balances = await this.indexerClient
        .lookupAssetBalances(asaId)
        .currencyGreaterThan(minBalance - 1)
        .do();

      if (!balances || !balances.balances) {
        return [];
      }

      return balances.balances.map((b: any) => ({
        address: b.address,
        balance: b.amount,
        asaId,
        frozen: b['is-frozen'] || false,
      }));
    } catch (error) {
      console.error(`Error fetching holders for ASA ${asaId}:`, error);
      return [];
    }
  }

  /**
   * Get transaction history for an ASA
   */
  async getAssetTransactions(
    asaId: number,
    limit: number = 50,
    nextToken?: string
  ): Promise<{ transactions: AssetTransaction[]; nextToken?: string }> {
    try {
      let query = this.indexerClient
        .searchForTransactions()
        .assetID(asaId)
        .limit(limit);

      if (nextToken) {
        query = query.nextToken(nextToken);
      }

      const result = await query.do();

      if (!result || !result.transactions) {
        return { transactions: [] };
      }

      const transactions: AssetTransaction[] = result.transactions.map((tx: any) => ({
        id: tx.id,
        sender: tx.sender,
        receiver: tx['asset-transfer-transaction']?.receiver || tx['payment-transaction']?.receiver || '',
        amount: tx['asset-transfer-transaction']?.amount || 0,
        asaId,
        timestamp: tx['round-time'],
        roundTime: tx['round-time'],
        confirmedRound: tx['confirmed-round'],
        txType: tx['tx-type'],
        note: tx.note ? Buffer.from(tx.note, 'base64').toString('utf-8') : undefined,
      }));

      return {
        transactions,
        nextToken: result.nextToken,
      };
    } catch (error) {
      console.error(`Error fetching transactions for ASA ${asaId}:`, error);
      return { transactions: [] };
    }
  }

  /**
   * Search for assets by name/unit name
   */
  async searchAssets(query: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await this.indexerClient
        .searchForAssets()
        .name(query)
        .limit(limit)
        .do();

      return result.assets || [];
    } catch (error) {
      console.error(`Error searching assets for "${query}":`, error);
      return [];
    }
  }

  /**
   * Get transactions for a specific account
   */
  async getAccountTransactions(
    address: string,
    asaId?: number,
    limit: number = 50
  ): Promise<AssetTransaction[]> {
    try {
      let query = this.indexerClient
        .searchForTransactions()
        .address(address)
        .limit(limit);

      if (asaId) {
        query = query.assetID(asaId);
      }

      const result = await query.do();

      if (!result || !result.transactions) {
        return [];
      }

      return result.transactions.map((tx: any) => ({
        id: tx.id,
        sender: tx.sender,
        receiver: tx['asset-transfer-transaction']?.receiver || tx['payment-transaction']?.receiver || '',
        amount: tx['asset-transfer-transaction']?.amount || tx['payment-transaction']?.amount || 0,
        asaId: asaId || 0,
        timestamp: tx['round-time'],
        roundTime: tx['round-time'],
        confirmedRound: tx['confirmed-round'],
        txType: tx['tx-type'],
        note: tx.note ? Buffer.from(tx.note, 'base64').toString('utf-8') : undefined,
      }));
    } catch (error) {
      console.error(`Error fetching transactions for account ${address}:`, error);
      return [];
    }
  }

  /**
   * Check if account has opted into an ASA
   */
  async hasOptedIn(address: string, asaId: number): Promise<boolean> {
    try {
      const accountInfo = await this.indexerClient.lookupAccountByID(address).do();
      
      if (!accountInfo || !accountInfo.account) {
        return false;
      }

      const assets = accountInfo.account.assets || [];
      return assets.some((a: any) => a['asset-id'] === asaId);
    } catch (error) {
      console.error(`Error checking opt-in for ${address}:`, error);
      return false;
    }
  }

  /**
   * Get multiple assets info in batch
   */
  async getMultipleAssetInfo(asaIds: number[]): Promise<Map<number, AssetInfo>> {
    const results = new Map<number, AssetInfo>();

    // Process in parallel with concurrency limit
    const concurrency = 5;
    for (let i = 0; i < asaIds.length; i += concurrency) {
      const batch = asaIds.slice(i, i + concurrency);
      const promises = batch.map(async (asaId) => {
        const info = await this.getAssetInfo(asaId);
        if (info) {
          results.set(asaId, info);
        }
      });
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Get AlgoExplorer URL for asset or transaction
   */
  getExplorerUrl(type: 'asset' | 'tx' | 'account', id: string | number): string {
    const baseUrl =
      this.network === 'testnet'
        ? 'https://testnet.algoexplorer.io'
        : 'https://algoexplorer.io';

    switch (type) {
      case 'asset':
        return `${baseUrl}/asset/${id}`;
      case 'tx':
        return `${baseUrl}/tx/${id}`;
      case 'account':
        return `${baseUrl}/address/${id}`;
      default:
        return baseUrl;
    }
  }
}

// Singleton instance
let indexerServiceInstance: IndexerService | null = null;

export function getIndexerService(network: 'testnet' | 'mainnet' = 'testnet'): IndexerService {
  if (!indexerServiceInstance || indexerServiceInstance['network'] !== network) {
    indexerServiceInstance = new IndexerService(network);
  }
  return indexerServiceInstance;
}
