/**
 * Atomic Swap Service
 * 
 * Handles atomic swaps between ALGO and ASA
 * Ensures trustless, all-or-nothing transactions
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface AtomicSwapParams {
  buyerMnemonic: string;
  sellerMnemonic: string;
  asaId: number;
  asaAmount: number;
  algoAmount: number; // in microAlgos
}

interface AtomicSwapResult {
  success: boolean;
  txId?: string;
  groupId?: string;
  confirmedRound?: number;
  buyer?: string;
  seller?: string;
  error?: string;
}

export class AtomicSwapService {
  private network: string;
  private pythonScriptPath: string;

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
   * Execute atomic swap
   * Buyer sends ALGO, Seller sends ASA - atomically
   * 
   * @param params Swap parameters
   * @returns Swap result with transaction ID
   */
  async executeSwap(params: AtomicSwapParams): Promise<AtomicSwapResult> {
    try {
      console.log(`[AtomicSwap] Executing swap: ${params.asaAmount} units of ASA ${params.asaId} for ${params.algoAmount / 1_000_000} ALGO`);

      const scriptPath = path.join(this.pythonScriptPath, 'atomic_swap.py');

      const command = `python "${scriptPath}" \
        --network ${this.network} \
        --buyer-mnemonic "${params.buyerMnemonic}" \
        --seller-mnemonic "${params.sellerMnemonic}" \
        --asa-id ${params.asaId} \
        --asa-amount ${params.asaAmount} \
        --algo-amount ${params.algoAmount}`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: path.join(process.cwd(), '..', '..')
      });

      if (stderr) {
        console.error('[AtomicSwap] Warning:', stderr);
      }

      const result: AtomicSwapResult = JSON.parse(stdout);

      if (result.success) {
        console.log(`[AtomicSwap] ✅ Success! TX ID: ${result.txId}`);
        console.log(`[AtomicSwap] Group ID: ${result.groupId}`);
        console.log(`[AtomicSwap] Confirmed in round: ${result.confirmedRound}`);
      }

      return result;

    } catch (error) {
      console.error('[AtomicSwap] Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Atomic swap failed'
      };
    }
  }

  /**
   * Estimate swap cost (transaction fees)
   */
  getSwapFeesEstimate(): number {
    // Algorand fees: 0.001 ALGO per transaction
    // Atomic swap = 2 transactions (payment + asset transfer)
    return 2000; // 0.002 ALGO in microAlgos
  }

  /**
   * Validate swap parameters
   */
  validateSwapParams(params: AtomicSwapParams): { valid: boolean; error?: string } {
    if (params.asaAmount <= 0) {
      return { valid: false, error: 'ASA amount must be greater than 0' };
    }

    if (params.algoAmount < 1000) {
      return { valid: false, error: 'ALGO amount too low (min: 0.001 ALGO)' };
    }

    if (!params.buyerMnemonic || params.buyerMnemonic.split(' ').length !== 25) {
      return { valid: false, error: 'Invalid buyer mnemonic' };
    }

    if (!params.sellerMnemonic || params.sellerMnemonic.split(' ').length !== 25) {
      return { valid: false, error: 'Invalid seller mnemonic' };
    }

    return { valid: true };
  }

  /**
   * Get AlgoExplorer URL for transaction
   */
  getTransactionUrl(txId: string): string {
    const baseUrl =
      this.network === 'mainnet'
        ? 'https://algoexplorer.io'
        : 'https://testnet.algoexplorer.io';
    
    return `${baseUrl}/tx/${txId}`;
  }

  /**
   * Get AlgoExplorer URL for group transaction
   */
  getGroupUrl(groupId: string): string {
    const baseUrl =
      this.network === 'mainnet'
        ? 'https://algoexplorer.io'
        : 'https://testnet.algoexplorer.io';
    
    return `${baseUrl}/tx/group/${groupId}`;
  }
}

export default AtomicSwapService;
