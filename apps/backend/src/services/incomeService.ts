import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';

const execAsync = promisify(exec);

interface DeploymentResult {
  success: boolean;
  appId?: number;
  appAddress?: string;
  txId?: string;
  asaId?: number;
  network?: string;
  creator?: string;
  explorerUrl?: string;
  confirmedRound?: number;
  error?: string;
}

interface OperationResult {
  success: boolean;
  action?: string;
  txId?: string;
  appId?: number;
  amount?: number;
  holderAddress?: string;
  confirmedRound?: number;
  explorerUrl?: string;
  error?: string;
}

export class IncomeService {
  private network: string;
  private pythonScriptPath: string;
  private incomeAppId?: number;

  constructor(network: 'testnet' | 'mainnet' = 'testnet', appId?: number) {
    this.network = network;
    this.incomeAppId = appId;
    
    // Path to Python scripts
    const projectRoot = process.cwd();
    this.pythonScriptPath = path.join(projectRoot, '..', '..', 'algorand', 'scripts');
  }

  /**
   * Deploy income distribution contract for an ASA
   */
  async deployContract(
    adminMnemonic: string,
    asaId: number
  ): Promise<DeploymentResult> {
    try {
      const scriptPath = path.join(this.pythonScriptPath, 'deploy_income.py');
      
      const command = `python "${scriptPath}" --network ${this.network} --creator-mnemonic "${adminMnemonic}" --asa-id ${asaId}`;
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.pythonScriptPath,
      });

      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      const result: DeploymentResult = JSON.parse(stdout);
      
      if (result.success && result.appId) {
        this.incomeAppId = result.appId;
      }

      return result;
    } catch (error: any) {
      console.error('Error deploying income contract:', error);
      return {
        success: false,
        error: error.message || 'Failed to deploy income contract',
      };
    }
  }

  /**
   * Deposit income to the contract (admin only)
   */
  async depositIncome(
    adminMnemonic: string,
    amountAlgo: number
  ): Promise<OperationResult> {
    try {
      if (!this.incomeAppId) {
        throw new Error('Income app ID not set. Deploy contract first.');
      }

      const scriptPath = path.join(this.pythonScriptPath, 'income_operations.py');
      
      const command = `python "${scriptPath}" --network ${this.network} --app-id ${this.incomeAppId} --action deposit --admin-mnemonic "${adminMnemonic}" --amount ${amountAlgo}`;
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.pythonScriptPath,
      });

      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      const result: OperationResult = JSON.parse(stdout);
      return result;
    } catch (error: any) {
      console.error('Error depositing income:', error);
      return {
        success: false,
        error: error.message || 'Failed to deposit income',
      };
    }
  }

  /**
   * Claim income from the contract (ASA holder)
   */
  async claimIncome(
    holderMnemonic: string,
    holderBalance: number
  ): Promise<OperationResult> {
    try {
      if (!this.incomeAppId) {
        throw new Error('Income app ID not set. Deploy contract first.');
      }

      const scriptPath = path.join(this.pythonScriptPath, 'income_operations.py');
      
      const command = `python "${scriptPath}" --network ${this.network} --app-id ${this.incomeAppId} --action claim --holder-mnemonic "${holderMnemonic}" --holder-balance ${holderBalance}`;
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.pythonScriptPath,
      });

      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      const result: OperationResult = JSON.parse(stdout);
      return result;
    } catch (error: any) {
      console.error('Error claiming income:', error);
      return {
        success: false,
        error: error.message || 'Failed to claim income',
      };
    }
  }

  /**
   * Calculate claimable income for a holder
   * @param holderBalance - Holder's ASA balance
   * @param totalDeposited - Total ALGO deposited
   * @param alreadyClaimed - ALGO already claimed by holder
   * @param totalSupply - Total ASA supply
   */
  calculateClaimable(
    holderBalance: number,
    totalDeposited: number,
    alreadyClaimed: number,
    totalSupply: number
  ): number {
    if (holderBalance <= 0 || totalSupply <= 0) {
      return 0;
    }

    const proportionalShare = (holderBalance / totalSupply) * totalDeposited;
    const claimable = proportionalShare - alreadyClaimed;

    return Math.max(0, claimable);
  }

  /**
   * Get AlgoExplorer URL for the contract
   */
  getContractExplorerUrl(): string | null {
    if (!this.incomeAppId) {
      return null;
    }

    const baseUrl =
      this.network === 'testnet'
        ? 'https://testnet.algoexplorer.io'
        : 'https://algoexplorer.io';

    return `${baseUrl}/application/${this.incomeAppId}`;
  }

  /**
   * Set the income app ID
   */
  setAppId(appId: number): void {
    this.incomeAppId = appId;
  }

  /**
   * Get the current app ID
   */
  getAppId(): number | undefined {
    return this.incomeAppId;
  }
}

// Export singleton instance
let incomeServiceInstance: IncomeService | null = null;

export function getIncomeService(
  network: 'testnet' | 'mainnet' = 'testnet',
  appId?: number
): IncomeService {
  if (!incomeServiceInstance || incomeServiceInstance['network'] !== network) {
    incomeServiceInstance = new IncomeService(network, appId);
  } else if (appId) {
    incomeServiceInstance.setAppId(appId);
  }
  return incomeServiceInstance;
}
