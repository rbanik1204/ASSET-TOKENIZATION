/**
 * Algorand Asset Service
 * 
 * Handles ASA creation, management, and lifecycle for tokenized assets
 * Integrates with Python Algorand SDK via child process
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface AssetMetadata {
  assetType: string;
  location: string;
  valuation: number;
  documentHash: string; // IPFS CID
  description: string;
}

interface AsaCreationParams {
  creatorMnemonic: string;
  assetName: string;
  unitName: string;
  totalSupply: number;
  decimals: number;
  metadata: AssetMetadata;
  url: string;
  managerAddress?: string;
  freezeAddress?: string;
  clawbackAddress?: string;
}

interface AsaCreationResult {
  success: boolean;
  asaId?: number;
  txId?: string;
  error?: string;
  metadata: AssetMetadata;
}

export class AlgorandAssetService {
  private pythonScriptPath: string;
  private network: string;

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
    this.pythonScriptPath = path.join(
      process.cwd(),
      '..',
      '..',
      'algorand',
      'scripts'
    );
  }

  /**
   * Create an ASA for a campus asset
   * 
   * @param params ASA creation parameters
   * @returns Creation result with ASA ID
   */
  async createAssetToken(params: AsaCreationParams): Promise<AsaCreationResult> {
    try {
      console.log(`[Algorand] Creating ASA for asset: ${params.assetName}`);

      // Prepare metadata JSON
      const metadataJson = JSON.stringify(params.metadata);
      const metadataHash = this.hashMetadata(metadataJson);

      // Build Python command
      const pythonScript = `
from algorand.utils.algorand_sdk import AlgorandClient
import json
import sys

try:
    client = AlgorandClient("${this.network}")
    
    # Create ASA
    asset_id = client.create_asa(
        creator_private_key="${params.creatorMnemonic}",
        asset_name="${params.assetName.substring(0, 32)}",
        unit_name="${params.unitName.substring(0, 8)}",
        total=${params.totalSupply},
        decimals=${params.decimals},
        url="${params.url.substring(0, 96)}",
        metadata_hash="${metadataHash}",
        manager="${params.managerAddress || ''}",
        freeze="${params.freezeAddress || ''}",
        clawback="${params.clawbackAddress || ''}"
    )
    
    result = {
        "success": True,
        "asaId": asset_id,
        "metadata": ${metadataJson}
    }
    print(json.dumps(result))
    
except Exception as e:
    error_result = {
        "success": False,
        "error": str(e)
    }
    print(json.dumps(error_result))
    sys.exit(1)
`;

      // Execute Python script
      const { stdout, stderr } = await execAsync(
        `python -c "${pythonScript.replace(/"/g, '\\"')}"`,
        { cwd: path.join(process.cwd(), '..', '..') }
      );

      if (stderr) {
        console.error('[Algorand] Error:', stderr);
      }

      const result = JSON.parse(stdout);
      
      if (result.success) {
        console.log(`[Algorand] ✅ Created ASA ID: ${result.asaId}`);
      }

      return result;

    } catch (error) {
      console.error('[Algorand] Failed to create ASA:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: params.metadata
      };
    }
  }

  /**
   * Transfer ASA units (for fractional ownership)
   */
  async transferAssetUnits(
    senderMnemonic: string,
    receiverAddress: string,
    asaId: number,
    amount: number
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const pythonScript = `
from algorand.utils.algorand_sdk import AlgorandClient

client = AlgorandClient("${this.network}")
tx_id = client.send_asset(
    sender_private_key="${senderMnemonic}",
    receiver="${receiverAddress}",
    asset_id=${asaId},
    amount=${amount}
)
print(tx_id)
`;

      const { stdout } = await execAsync(
        `python -c "${pythonScript.replace(/"/g, '\\"')}"`,
        { cwd: path.join(process.cwd(), '..', '..') }
      );

      return {
        success: true,
        txId: stdout.trim()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed'
      };
    }
  }

  /**
   * Get ASA details from Algorand
   */
  async getAssetInfo(asaId: number): Promise<any> {
    try {
      const pythonScript = `
from algorand.utils.algorand_sdk import AlgorandClient
import json

client = AlgorandClient("${this.network}")
asset_info = client.algod_client.asset_info(${asaId})
print(json.dumps(asset_info))
`;

      const { stdout } = await execAsync(
        `python -c "${pythonScript.replace(/"/g, '\\"')}"`,
        { cwd: path.join(process.cwd(), '..', '..') }
      );

      return JSON.parse(stdout);

    } catch (error) {
      console.error(`[Algorand] Failed to get asset ${asaId}:`, error);
      return null;
    }
  }

  /**
   * Freeze/unfreeze asset for an account (compliance)
   */
  async freezeAsset(
    freezeAddress: string,
    freezeMnemonic: string,
    asaId: number,
    targetAddress: string,
    freeze: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pythonScript = `
from algorand.utils.algorand_sdk import AlgorandClient
from algosdk.transaction import AssetFreezeTxn
from algosdk import account

client = AlgorandClient("${this.network}")
params = client.algod_client.suggested_params()

txn = AssetFreezeTxn(
    sender="${freezeAddress}",
    sp=params,
    index=${asaId},
    target="${targetAddress}",
    new_freeze_state=${freeze ? 'True' : 'False'}
)

signed_txn = txn.sign("${freezeMnemonic}")
tx_id = client.algod_client.send_transaction(signed_txn)
client._wait_for_confirmation(tx_id)

print("success")
`;

      await execAsync(
        `python -c "${pythonScript.replace(/"/g, '\\"')}"`,
        { cwd: path.join(process.cwd(), '..', '..') }
      );

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Freeze failed'
      };
    }
  }

  /**
   * Clawback asset (compliance/emergency)
   */
  async clawbackAsset(
    clawbackAddress: string,
    clawbackMnemonic: string,
    asaId: number,
    fromAddress: string,
    toAddress: string,
    amount: number
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      const pythonScript = `
from algorand.utils.algorand_sdk import AlgorandClient
from algosdk.transaction import AssetTransferTxn

client = AlgorandClient("${this.network}")
params = client.algod_client.suggested_params()

txn = AssetTransferTxn(
    sender="${clawbackAddress}",
    sp=params,
    receiver="${toAddress}",
    amt=${amount},
    index=${asaId},
    revocation_target="${fromAddress}"
)

signed_txn = txn.sign("${clawbackMnemonic}")
tx_id = client.algod_client.send_transaction(signed_txn)
client._wait_for_confirmation(tx_id)

print(tx_id)
`;

      const { stdout } = await execAsync(
        `python -c "${pythonScript.replace(/"/g, '\\"')}"`,
        { cwd: path.join(process.cwd(), '..', '..') }
      );

      return {
        success: true,
        txId: stdout.trim()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clawback failed'
      };
    }
  }

  /**
   * Generate metadata hash (simple implementation)
   */
  private hashMetadata(metadataJson: string): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(metadataJson)
      .digest('hex')
      .substring(0, 64); // 32 bytes
  }

  /**
   * Get AlgoExplorer URL for asset
   */
  getExplorerUrl(asaId: number): string {
    const baseUrl =
      this.network === 'mainnet'
        ? 'https://algoexplorer.io'
        : 'https://testnet.algoexplorer.io';
    
    return `${baseUrl}/asset/${asaId}`;
  }
}

export default AlgorandAssetService;
