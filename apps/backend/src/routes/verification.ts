/**
 * Verification API Routes
 * 
 * Endpoints for asset verification management
 */

import express, { Request, Response } from 'express';
import { VerificationService } from '../services/verificationService';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Initialize verification service
const verificationService = new VerificationService(
  process.env.ALGORAND_NETWORK as 'testnet' || 'testnet',
  parseInt(process.env.VERIFICATION_APP_ID || '0')
);

/**
 * POST /api/verification/deploy
 * Deploy verification smart contract (admin only)
 */
router.post('/deploy', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminMnemonic = process.env.ADMIN_ALGORAND_MNEMONIC;

    if (!adminMnemonic) {
      return res.status(500).json({
        success: false,
        message: 'Admin wallet not configured'
      });
    }

    const result = await verificationService.deployContract(adminMnemonic);

    if (result.success) {
      // Save app ID to database or config
      // TODO: Store in database

      res.json({
        success: true,
        appId: result.appId,
        txId: result.txId,
        explorerUrl: result.explorerUrl,
        message: `Verification contract deployed! App ID: ${result.appId}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Contract deployment failed'
      });
    }

  } catch (error) {
    console.error('[API] Deploy verification contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/verification/verify
 * Verify an asset (admin only)
 */
router.post('/verify', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { asaId } = req.body;

    if (!asaId) {
      return res.status(400).json({
        success: false,
        message: 'ASA ID is required'
      });
    }

    const adminMnemonic = process.env.ADMIN_ALGORAND_MNEMONIC;

    if (!adminMnemonic) {
      return res.status(500).json({
        success: false,
        message: 'Admin wallet not configured'
      });
    }

    const result = await verificationService.verifyAsset(adminMnemonic, asaId);

    if (result.success) {
      // Update database: asset.verified = true
      // TODO: Update database

      res.json({
        success: true,
        asaId: result.asaId,
        txId: result.txId,
        explorerUrl: result.explorerUrl,
        message: `Asset ${asaId} verified successfully!`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Verification failed'
      });
    }

  } catch (error) {
    console.error('[API] Verify asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/verification/reject
 * Reject an asset (admin only)
 */
router.post('/reject', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { asaId, reason } = req.body;

    if (!asaId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'ASA ID and reason are required'
      });
    }

    const adminMnemonic = process.env.ADMIN_ALGORAND_MNEMONIC;

    if (!adminMnemonic) {
      return res.status(500).json({
        success: false,
        message: 'Admin wallet not configured'
      });
    }

    const result = await verificationService.rejectAsset(adminMnemonic, asaId, reason);

    if (result.success) {
      // Update database: asset.verified = false, asset.rejection_reason = reason
      // TODO: Update database

      res.json({
        success: true,
        asaId: result.asaId,
        txId: result.txId,
        explorerUrl: result.explorerUrl,
        message: `Asset ${asaId} rejected`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Rejection failed'
      });
    }

  } catch (error) {
    console.error('[API] Reject asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/verification/status/:asaId
 * Check verification status of an asset
 */
router.get('/status/:asaId', async (req: Request, res: Response) => {
  try {
    const asaId = parseInt(req.params.asaId);

    const isVerified = await verificationService.isAssetVerified(asaId);

    res.json({
      success: true,
      asaId,
      verified: isVerified
    });

  } catch (error) {
    console.error('[API] Check verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Status check failed'
    });
  }
});

/**
 * GET /api/verification/pending
 * Get list of pending assets awaiting verification (admin only)
 */
router.get('/pending', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    // TODO: Fetch from database
    // Query: SELECT * FROM algorand_assets WHERE verified IS NULL OR verified = false
    // For now, return empty array as this requires database integration
    
    res.json({
      success: true,
      assets: [],
      message: 'Database integration pending - connect to fetch real pending assets'
    });
  } catch (error) {
    console.error('[API] Fetch pending assets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending assets'
    });
  }
});

/**
 * GET /api/verification/contract-info
 * Get verification contract information
 */
router.get('/contract-info', (req: Request, res: Response) => {
  const appId = parseInt(process.env.VERIFICATION_APP_ID || '0');
  const explorerUrl = verificationService.getContractExplorerUrl();

  if (appId === 0) {
    return res.json({
      success: false,
      message: 'Verification contract not deployed yet'
    });
  }

  res.json({
    success: true,
    appId,
    explorerUrl,
    network: process.env.ALGORAND_NETWORK || 'testnet'
  });
});

export default router;
