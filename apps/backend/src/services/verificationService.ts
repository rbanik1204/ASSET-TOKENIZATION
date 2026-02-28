/**
 * Algorand Verification Service
 * 
 * Manages asset verification via Algorand smart contract
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface VerificationResult {
  success: boolean;
  action?: 'verify' | 'reject';
  asaId?: number;
  txId?: string;
  confirmedRound?: number;
  appId?: number;
  explorerUrl?: string;
  error?: string;
}

interface DeploymentResult {
  success: boolean;
  appId?: number;
  txId?: string;
  creator?: string;
  explorerUrl?: string;
  error?: string;
}

export class VerificationService {
  private network: string;
  private pythonScriptPath: string;
  private verificationAppId?: number;

  constructor(network: 'testnet' | 'mainnet' = 'testnet', appId?: number) {
    this.network = network;
    this.pythonScriptPath = path.join(
      process.cwd(),
      '..',
      '..',
      'algorand',
      'scripts'
    );
    this.verificationAppId = appId || parseInt(process.env.VERIFICATION_APP_ID || '0');
  }

  /**
   * Deploy verification smart contract
   */
  async deployContract(adminMnemonic: string): Promise<DeploymentResult> {
    try {
      console.log('[Verification] Deploying contract...');

      const scriptPath = path.join(this.pythonScriptPath, 'deploy_verification.py');

      const command = `python "${scriptPath}" \
        --network ${this.network} \
        --creator-mnemonic "${adminMnemonic}"`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: path.join(process.cwd(), '..', '..')
      });

      if (stderr) {
        console.error('[Verification] Deployment warning:', stderr);
      }

      const result: DeploymentResult = JSON.parse(stdout);

      if (result.success) {
        this.verificationAppId = result.appId;
        console.log(`[Verification] ✅ Contract deployed! App ID: ${result.appId}`);
      }

      return result;

    } catch (error) {
      console.error('[Verification] Deployment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed'
      };
    }
  }

  /**
   * Verify an asset
   */
  async verifyAsset(
    adminMnemonic: string,
    asaId: number
  ): Promise<VerificationResult> {
    if (!this.verificationAppId) {
      return {
        success: false,
        error: 'Verification contract not deployed or configured'
      };
    }

    try {
      console.log(`[Verification] Verifying asset ${asaId}...`);

      const scriptPath = path.join(this.pythonScriptPath, 'verify_asset.py');

      const command = `python "${scriptPath}" \
        --network ${this.network} \
        --admin-mnemonic "${adminMnemonic}" \
        --app-id ${this.verificationAppId} \
        --asa-id ${asaId} \
        --action verify`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: path.join(process.cwd(), '..', '..')
      });

      if (stderr) {
        console.error('[Verification] Warning:', stderr);
      }

      const result: VerificationResult = JSON.parse(stdout);

      if (result.success) {
        console.log(`[Verification] ✅ Asset ${asaId} verified!`);
      }

      return result;

    } catch (error) {
      console.error('[Verification] Verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Reject an asset
   */
  async rejectAsset(
    adminMnemonic: string,
    asaId: number,
    reason: string
  ): Promise<VerificationResult> {
    if (!this.verificationAppId) {
      return {
        success: false,
        error: 'Verification contract not deployed or configured'
      };
    }

    try {
      console.log(`[Verification] Rejecting asset ${asaId}...`);

      const scriptPath = path.join(this.pythonScriptPath, 'verify_asset.py');

      const command = `python "${scriptPath}" \
        --network ${this.network} \
        --admin-mnemonic "${adminMnemonic}" \
        --app-id ${this.verificationAppId} \
        --asa-id ${asaId} \
        --action reject \
        --reason "${reason.replace(/"/g, '\\"')}"`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: path.join(process.cwd(), '..', '..')
      });

      if (stderr) {
        console.error('[Verification] Warning:', stderr);
      }

      const result: VerificationResult = JSON.parse(stdout);

      if (result.success) {
        console.log(`[Verification] ✅ Asset ${asaId} rejected!`);
      }

      return result;

    } catch (error) {
      console.error('[Verification] Rejection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rejection failed'
      };
    }
  }

  /**
   * Check if asset is verified
   */
  async isAssetVerified(asaId: number): Promise<boolean> {
    if (!this.verificationAppId) {
      return false;
    }

    try {
      // Query box storage for verification status
      // This would require a read-only call to the contract
      // For now, return false and implement full query later
      return false;

    } catch (error) {
      console.error('[Verification] Status check failed:', error);
      return false;
    }
  }

  /**
   * Get verification contract explorer URL
   */
  getContractExplorerUrl(): string | null {
    if (!this.verificationAppId) {
      return null;
    }

    const baseUrl =
      this.network === 'mainnet'
        ? 'https://algoexplorer.io'
        : 'https://testnet.algoexplorer.io';
    
    return `${baseUrl}/application/${this.verificationAppId}`;
  }
}

export default VerificationService;
