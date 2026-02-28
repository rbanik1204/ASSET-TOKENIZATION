import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import algosdk from 'algosdk';

@Injectable()
export class AlgorandService implements OnModuleInit {
  private readonly logger = new Logger(AlgorandService.name);
  private algodClient: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;
  private network: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const algodUrl = this.config.get<string>('algorand.algod.url') || 'https://testnet-api.algonode.cloud';
    const algodToken = this.config.get<string>('algorand.algod.token') || '';
    const indexerUrl = this.config.get<string>('algorand.indexer.url') || 'https://testnet-idx.algonode.cloud';
    const indexerToken = this.config.get<string>('algorand.indexer.token') || '';
    this.network = this.config.get<string>('algorand.network') || 'testnet';

    this.algodClient = new algosdk.Algodv2(
      algodToken || '',
      algodUrl,
      '',
    );

    this.indexerClient = new algosdk.Indexer(
      indexerToken || '',
      indexerUrl,
      '',
    );

    this.logger.log(`Algorand service initialized — network: ${this.network}`);
  }

  getAlgodClient(): algosdk.Algodv2 {
    return this.algodClient;
  }

  getIndexerClient(): algosdk.Indexer {
    return this.indexerClient;
  }

  getNetwork(): string {
    return this.network;
  }

  isMainnet(): boolean {
    return this.network === 'mainnet';
  }

  /** Check if algod node is healthy */
  async isHealthy(): Promise<boolean> {
    try {
      await this.algodClient.status().do();
      return true;
    } catch {
      return false;
    }
  }

  /** Get node status */
  async getStatus(): Promise<any> {
    return this.algodClient.status().do();
  }

  /** Get suggested transaction parameters */
  async getSuggestedParams(): Promise<algosdk.SuggestedParams> {
    return this.algodClient.getTransactionParams().do();
  }

  /** Get account info */
  async getAccountInfo(address: string): Promise<any> {
    return this.algodClient.accountInformation(address).do();
  }

  /** Get asset info from indexer */
  async getAssetInfo(assetId: number): Promise<any> {
    return this.indexerClient.lookupAssetByID(assetId).do();
  }

  /** Get asset balances from indexer */
  async getAssetBalances(assetId: number, limit = 50): Promise<any> {
    return this.indexerClient
      .lookupAssetBalances(assetId)
      .limit(limit)
      .do();
  }

  /** Get transactions for an asset from indexer */
  async getAssetTransactions(assetId: number, limit = 100): Promise<any> {
    return this.indexerClient
      .lookupAssetTransactions(assetId)
      .limit(limit)
      .do();
  }

  /** Get explorer URL for a transaction */
  getExplorerTxUrl(txId: string): string {
    const prefix = this.network === 'mainnet' ? '' : 'testnet.';
    return `https://${prefix}algoexplorer.io/tx/${txId}`;
  }

  /** Get explorer URL for an asset */
  getExplorerAssetUrl(assetId: number): string {
    const prefix = this.network === 'mainnet' ? '' : 'testnet.';
    return `https://${prefix}algoexplorer.io/asset/${assetId}`;
  }
}
