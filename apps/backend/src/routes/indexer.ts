import express, { Request, Response } from 'express';
import { getIndexerService } from '../services/indexerService';

const router = express.Router();

/**
 * GET /api/indexer/asset/:asaId
 * Get comprehensive information about an ASA
 */
router.get('/asset/:asaId', async (req: Request, res: Response) => {
  try {
    const { asaId } = req.params;
    const network = (req.query.network as 'testnet' | 'mainnet') || 'testnet';

    if (!asaId || isNaN(parseInt(asaId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ASA ID',
      });
    }

    const indexer = getIndexerService(network);
    const assetInfo = await indexer.getAssetInfo(parseInt(asaId));

    if (!assetInfo) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found',
      });
    }

    res.json({
      success: true,
      asset: assetInfo,
      explorerUrl: indexer.getExplorerUrl('asset', asaId),
    });
  } catch (error: any) {
    console.error('Error fetching asset info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch asset information',
    });
  }
});

/**
 * GET /api/indexer/asset/:asaId/holders
 * Get all holders of an ASA
 */
router.get('/asset/:asaId/holders', async (req: Request, res: Response) => {
  try {
    const { asaId } = req.params;
    const network = (req.query.network as 'testnet' | 'mainnet') || 'testnet';
    const minBalance = parseInt(req.query.minBalance as string) || 1;

    if (!asaId || isNaN(parseInt(asaId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ASA ID',
      });
    }

    const indexer = getIndexerService(network);
    const holders = await indexer.getAssetHolders(parseInt(asaId), minBalance);

    res.json({
      success: true,
      holders,
      count: holders.length,
    });
  } catch (error: any) {
    console.error('Error fetching asset holders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch asset holders',
    });
  }
});

/**
 * GET /api/indexer/asset/:asaId/transactions
 * Get transaction history for an ASA
 */
router.get('/asset/:asaId/transactions', async (req: Request, res: Response) => {
  try {
    const { asaId } = req.params;
    const network = (req.query.network as 'testnet' | 'mainnet') || 'testnet';
    const limit = parseInt(req.query.limit as string) || 50;
    const nextToken = req.query.nextToken as string;

    if (!asaId || isNaN(parseInt(asaId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ASA ID',
      });
    }

    const indexer = getIndexerService(network);
    const result = await indexer.getAssetTransactions(parseInt(asaId), limit, nextToken);

    res.json({
      success: true,
      transactions: result.transactions,
      nextToken: result.nextToken,
      count: result.transactions.length,
    });
  } catch (error: any) {
    console.error('Error fetching asset transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch asset transactions',
    });
  }
});

/**
 * GET /api/indexer/account/:address/balance/:asaId
 * Get account balance for a specific ASA
 */
router.get('/account/:address/balance/:asaId', async (req: Request, res: Response) => {
  try {
    const { address, asaId } = req.params;
    const network = (req.query.network as 'testnet' | 'mainnet') || 'testnet';

    if (!address || !asaId || isNaN(parseInt(asaId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address or ASA ID',
      });
    }

    const indexer = getIndexerService(network);
    const balance = await indexer.getAccountBalance(address, parseInt(asaId));

    res.json({
      success: true,
      address,
      asaId: parseInt(asaId),
      balance,
      explorerUrl: indexer.getExplorerUrl('account', address),
    });
  } catch (error: any) {
    console.error('Error fetching account balance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch account balance',
    });
  }
});

/**
 * GET /api/indexer/account/:address/transactions
 * Get transaction history for an account
 */
router.get('/account/:address/transactions', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const network = (req.query.network as 'testnet' | 'mainnet') || 'testnet';
    const asaId = req.query.asaId ? parseInt(req.query.asaId as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address',
      });
    }

    const indexer = getIndexerService(network);
    const transactions = await indexer.getAccountTransactions(address, asaId, limit);

    res.json({
      success: true,
      address,
      asaId,
      transactions,
      count: transactions.length,
    });
  } catch (error: any) {
    console.error('Error fetching account transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch account transactions',
    });
  }
});

/**
 * GET /api/indexer/account/:address/optin/:asaId
 * Check if account has opted into an ASA
 */
router.get('/account/:address/optin/:asaId', async (req: Request, res: Response) => {
  try {
    const { address, asaId } = req.params;
    const network = (req.query.network as 'testnet' | 'mainnet') || 'testnet';

    if (!address || !asaId || isNaN(parseInt(asaId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address or ASA ID',
      });
    }

    const indexer = getIndexerService(network);
    const hasOptedIn = await indexer.hasOptedIn(address, parseInt(asaId));

    res.json({
      success: true,
      address,
      asaId: parseInt(asaId),
      hasOptedIn,
    });
  } catch (error: any) {
    console.error('Error checking opt-in status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check opt-in status',
    });
  }
});

/**
 * POST /api/indexer/assets/batch
 * Get information for multiple assets
 */
router.post('/assets/batch', async (req: Request, res: Response) => {
  try {
    const { asaIds, network = 'testnet' } = req.body;

    if (!Array.isArray(asaIds) || asaIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ASA IDs array',
      });
    }

    if (asaIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 assets per batch request',
      });
    }

    const indexer = getIndexerService(network as 'testnet' | 'mainnet');
    const results = await indexer.getMultipleAssetInfo(asaIds);

    // Convert Map to object
    const assetsObj: Record<number, any> = {};
    results.forEach((value, key) => {
      assetsObj[key] = value;
    });

    res.json({
      success: true,
      assets: assetsObj,
      count: results.size,
    });
  } catch (error: any) {
    console.error('Error fetching batch asset info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch batch asset information',
    });
  }
});

/**
 * GET /api/indexer/search
 * Search for assets by name
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query, network = 'testnet', limit = 20 } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const indexer = getIndexerService(network as 'testnet' | 'mainnet');
    const assets = await indexer.searchAssets(query, parseInt(limit as string));

    res.json({
      success: true,
      assets,
      count: assets.length,
    });
  } catch (error: any) {
    console.error('Error searching assets:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search assets',
    });
  }
});

export default router;
