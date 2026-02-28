/**
 * Algorand API Routes
 * 
 * Endpoints for Algorand-specific operations:
 * - ASA creation
 * - Asset transfers
 * - Atomic swaps
 * - Verification
 * - Income distribution
 */

import express, { Request, Response } from 'express';
import { AlgorandAssetService } from '../services/algorandAssetService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const algorandService = new AlgorandAssetService(
  process.env.ALGORAND_NETWORK as 'testnet' || 'testnet'
);

/**
 * POST /api/algorand/create-asa
 * Create ASA for new asset listing
 */
router.post('/create-asa', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      assetName,
      unitName,
      totalSupply,
      decimals,
      metadata,
      url,
      managerAddress,
      freezeAddress,
      clawbackAddress,
    } = req.body;

    // Get creator wallet from environment or request
    const creatorMnemonic = process.env.ADMIN_ALGORAND_MNEMONIC;
    
    if (!creatorMnemonic) {
      return res.status(500).json({
        success: false,
        message: 'Admin wallet not configured'
      });
    }

    const result = await algorandService.createAssetToken({
      creatorMnemonic,
      assetName,
      unitName,
      totalSupply,
      decimals,
      metadata,
      url,
      managerAddress,
      freezeAddress,
      clawbackAddress,
    });

    if (result.success) {
      res.json({
        success: true,
        asaId: result.asaId,
        txId: result.txId,
        explorerUrl: algorandService.getExplorerUrl(result.asaId!),
        message: `ASA created successfully: ${result.asaId}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to create ASA'
      });
    }

  } catch (error) {
    console.error('[API] Create ASA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/algorand/transfer-asset
 * Transfer ASA units between accounts
 */
router.post('/transfer-asset', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { senderMnemonic, receiverAddress, asaId, amount } = req.body;

    const result = await algorandService.transferAssetUnits(
      senderMnemonic,
      receiverAddress,
      asaId,
      amount
    );

    res.json(result);

  } catch (error) {
    console.error('[API] Transfer asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Transfer failed'
    });
  }
});

/**
 * GET /api/algorand/asset/:asaId
 * Get ASA information from blockchain
 */
router.get('/asset/:asaId', async (req: Request, res: Response) => {
  try {
    const asaId = parseInt(req.params.asaId);
    const assetInfo = await algorandService.getAssetInfo(asaId);

    if (assetInfo) {
      res.json({
        success: true,
        asset: assetInfo,
        explorerUrl: algorandService.getExplorerUrl(asaId)
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

  } catch (error) {
    console.error('[API] Get asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset info'
    });
  }
});

/**
 * POST /api/algorand/freeze-asset
 * Freeze/unfreeze asset for compliance
 */
router.post('/freeze-asset', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { asaId, targetAddress, freeze } = req.body;

    const freezeAddress = process.env.FREEZE_ADDRESS;
    const freezeMnemonic = process.env.FREEZE_MNEMONIC;

    if (!freezeAddress || !freezeMnemonic) {
      return res.status(500).json({
        success: false,
        message: 'Freeze account not configured'
      });
    }

    const result = await algorandService.freezeAsset(
      freezeAddress,
      freezeMnemonic,
      asaId,
      targetAddress,
      freeze
    );

    res.json(result);

  } catch (error) {
    console.error('[API] Freeze asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Freeze operation failed'
    });
  }
});

/**
 * POST /api/algorand/clawback-asset
 * Clawback asset for emergency/compliance
 */
router.post('/clawback-asset', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { asaId, fromAddress, toAddress, amount } = req.body;

    const clawbackAddress = process.env.CLAWBACK_ADDRESS;
    const clawbackMnemonic = process.env.CLAWBACK_MNEMONIC;

    if (!clawbackAddress || !clawbackMnemonic) {
      return res.status(500).json({
        success: false,
        message: 'Clawback account not configured'
      });
    }

    const result = await algorandService.clawbackAsset(
      clawbackAddress,
      clawbackMnemonic,
      asaId,
      fromAddress,
      toAddress,
      amount
    );

    res.json(result);

  } catch (error) {
    console.error('[API] Clawback asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Clawback operation failed'
    });
  }
});

export default router;
