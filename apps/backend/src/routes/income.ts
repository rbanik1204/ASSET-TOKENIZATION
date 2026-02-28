import express, { Request, Response } from 'express';
import { getIncomeService } from '../services/incomeService';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Initialize income service
const network = (process.env.ALGORAND_NETWORK as 'testnet' | 'mainnet') || 'testnet';
const incomeAppId = process.env.INCOME_APP_ID ? parseInt(process.env.INCOME_APP_ID) : undefined;
const incomeService = getIncomeService(network, incomeAppId);

/**
 * POST /api/income/deploy
 * Deploy income distribution contract (admin only)
 */
router.post('/deploy', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { adminMnemonic, asaId } = req.body;

    if (!adminMnemonic || !asaId) {
      return res.status(400).json({
        success: false,
        error: 'Admin mnemonic and ASA ID are required',
      });
    }

    const result = await incomeService.deployContract(adminMnemonic, asaId);

    if (result.success) {
      // TODO: Save contract info to database
      res.json({
        message: 'Income distribution contract deployed successfully',
        ...result,
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Error deploying income contract:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deploy income contract',
    });
  }
});

/**
 * POST /api/income/deposit
 * Deposit income to distribution contract (admin only)
 */
router.post('/deposit', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { adminMnemonic, amount } = req.body;

    if (!adminMnemonic || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Admin mnemonic and valid amount are required',
      });
    }

    const result = await incomeService.depositIncome(adminMnemonic, amount);

    if (result.success) {
      // TODO: Log deposit to database
      res.json({
        message: `Deposited ${amount} ALGO successfully`,
        ...result,
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Error depositing income:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deposit income',
    });
  }
});

/**
 * POST /api/income/claim
 * Claim income from distribution contract (authenticated user)
 */
router.post('/claim', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { holderMnemonic, holderBalance } = req.body;

    if (!holderMnemonic || holderBalance === undefined || holderBalance < 0) {
      return res.status(400).json({
        success: false,
        error: 'Holder mnemonic and balance are required',
      });
    }

    const result = await incomeService.claimIncome(holderMnemonic, holderBalance);

    if (result.success) {
      // TODO: Log claim to database
      res.json({
        message: 'Income claimed successfully',
        ...result,
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Error claiming income:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to claim income',
    });
  }
});

/**
 * POST /api/income/calculate-claimable
 * Calculate how much income a holder can claim
 */
router.post('/calculate-claimable', async (req: Request, res: Response) => {
  try {
    const { holderBalance, totalDeposited, alreadyClaimed, totalSupply } = req.body;

    if (
      holderBalance === undefined ||
      totalDeposited === undefined ||
      alreadyClaimed === undefined ||
      totalSupply === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'All parameters are required (holderBalance, totalDeposited, alreadyClaimed, totalSupply)',
      });
    }

    const claimable = incomeService.calculateClaimable(
      holderBalance,
      totalDeposited,
      alreadyClaimed,
      totalSupply
    );

    res.json({
      success: true,
      claimable,
      claimableAlgo: claimable / 1_000_000,
    });
  } catch (error: any) {
    console.error('Error calculating claimable:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate claimable amount',
    });
  }
});

/**
 * GET /api/income/contract-info
 * Get income distribution contract information
 */
router.get('/contract-info', async (req: Request, res: Response) => {
  try {
    const appId = incomeService.getAppId();
    
    if (!appId) {
      return res.status(404).json({
        success: false,
        error: 'Income contract not deployed',
      });
    }

    const explorerUrl = incomeService.getContractExplorerUrl();

    res.json({
      success: true,
      appId,
      network,
      explorerUrl,
    });
  } catch (error: any) {
    console.error('Error getting contract info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get contract information',
    });
  }
});

export default router;
