/**
 * Atomic Swap API Routes
 * 
 * Endpoints for executing trustless atomic swaps
 * Buyer sends ALGO, Seller sends ASA - all or nothing
 */

import express, { Request, Response } from 'express';
import { AtomicSwapService } from '../services/atomicSwapService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const swapService = new AtomicSwapService(
  process.env.ALGORAND_NETWORK as 'testnet' || 'testnet'
);

/**
 * POST /api/swap/execute
 * Execute atomic swap between buyer and seller
 */
router.post('/execute', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      buyerMnemonic,
      sellerMnemonic,
      asaId,
      asaAmount,
      algoAmount,
    } = req.body;

    // Validate parameters
    const validation = swapService.validateSwapParams({
      buyerMnemonic,
      sellerMnemonic,
      asaId,
      asaAmount,
      algoAmount,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Execute swap
    const result = await swapService.executeSwap({
      buyerMnemonic,
      sellerMnemonic,
      asaId,
      asaAmount,
      algoAmount,
    });

    if (result.success) {
      // Log transaction to database
      // TODO: Save to transactions table

      res.json({
        success: true,
        txId: result.txId,
        groupId: result.groupId,
        confirmedRound: result.confirmedRound,
        buyer: result.buyer,
        seller: result.seller,
        transactionUrl: swapService.getTransactionUrl(result.txId!),
        groupUrl: swapService.getGroupUrl(result.groupId!),
        message: 'Atomic swap executed successfully!'
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Swap failed'
      });
    }

  } catch (error) {
    console.error('[API] Atomic swap error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/swap/estimate
 * Estimate swap costs and fees
 */
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const { asaAmount, algoAmount } = req.body;

    const fees = swapService.getSwapFeesEstimate();

    res.json({
      success: true,
      estimate: {
        asaAmount,
        algoAmount,
        fees,
        totalCost: algoAmount + fees,
        feeInAlgo: fees / 1_000_000,
        pricePerUnit: algoAmount / asaAmount,
      }
    });

  } catch (error) {
    console.error('[API] Swap estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Estimation failed'
    });
  }
});

/**
 * GET /api/swap/status/:txId
 * Check swap transaction status
 */
router.get('/status/:txId', async (req: Request, res: Response) => {
  try {
    const { txId } = req.params;

    // TODO: Query Algorand indexer for transaction status
    const explorerUrl = swapService.getTransactionUrl(txId);

    res.json({
      success: true,
      txId,
      explorerUrl,
      message: 'Check transaction status on AlgoExplorer'
    });

  } catch (error) {
    console.error('[API] Swap status error:', error);
    res.status(500).json({
      success: false,
      message: 'Status check failed'
    });
  }
});

export default router;
