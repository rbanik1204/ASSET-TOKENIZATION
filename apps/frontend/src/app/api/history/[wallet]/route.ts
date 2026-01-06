import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, fallback, formatUnits, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { ABIS, getContractsForChain } from '@/config/contracts';

type TransactionType = 'BUY' | 'SELL' | 'CLAIM' | 'TRANSFER';
type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

interface Transaction {
  id: string;
  type: TransactionType;
  assetName: string;
  assetToken: string;
  amount: string;
  value: string;
  fee: string;
  status: TransactionStatus;
  timestamp: string;
  txHash: string;
}

// RPC endpoints for Sepolia
const rpcUrls = [
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
  'https://ethereum-sepolia.publicnode.com',
  'https://sepolia.drpc.org',
  'https://rpc.sepolia.org',
].filter(Boolean) as string[];

function getDefaultChainId(): number {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 11155111;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const chainId = getDefaultChainId();
    const contracts = getContractsForChain(chainId);

    // Create public client for reading blockchain data
    const client = createPublicClient({
      chain: chainId === 11155111 ? sepolia : undefined,
      transport: fallback(rpcUrls.map((url) => http(url))),
    });

    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock > 100000n ? currentBlock - 100000n : 0n; // Look back ~2 weeks

    const transactions: Transaction[] = [];

    // 1. Fetch BUY transactions (TokensPurchased events from PrimarySale)
    try {
      const purchaseLogs = await client.getLogs({
        address: contracts.PRIMARY_SALE as `0x${string}`,
        event: parseAbiItem('event TokensPurchased(address indexed token, address indexed buyer, uint256 amount, uint256 totalCost)'),
        args: {
          buyer: wallet as `0x${string}`,
        },
        fromBlock,
        toBlock: currentBlock,
      });

      for (const log of purchaseLogs) {
        const { token, buyer, amount, totalCost } = log.args;
        const block = await client.getBlock({ blockNumber: log.blockNumber });
        const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();

        // Try to get token name and symbol
        let assetName = `Asset ${token?.slice(0, 8)}...`;
        try {
          const nameResult = await client.readContract({
            address: token as `0x${string}`,
            abi: ABIS.ASSET_TOKEN,
            functionName: 'name',
          });
          assetName = String(nameResult);
        } catch {}

        transactions.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'BUY',
          assetName,
          assetToken: token || '',
          amount: formatUnits(amount || 0n, 18),
          value: `$${formatUnits(totalCost || 0n, 6)}`,
          fee: '$0.00', // Fee info not in event
          status: 'SUCCESS',
          timestamp,
          txHash: log.transactionHash,
        });
      }
    } catch (error) {
      console.error('Error fetching purchase events:', error);
    }

    // 2. Fetch SELL transactions (Redeemed events from FinalSale)
    try {
      const redeemLogs = await client.getLogs({
        address: contracts.FINAL_SALE as `0x${string}`,
        event: parseAbiItem('event Redeemed(address indexed token, address indexed seller, uint256 tokenAmount, uint256 payoutWei)'),
        args: {
          seller: wallet as `0x${string}`,
        },
        fromBlock,
        toBlock: currentBlock,
      });

      for (const log of redeemLogs) {
        const { token, seller, tokenAmount, payoutWei } = log.args;
        const block = await client.getBlock({ blockNumber: log.blockNumber });
        const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();

        let assetName = `Asset ${token?.slice(0, 8)}...`;
        try {
          const nameResult = await client.readContract({
            address: token as `0x${string}`,
            abi: ABIS.ASSET_TOKEN,
            functionName: 'name',
          });
          assetName = String(nameResult);
        } catch {}

        transactions.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'SELL',
          assetName,
          assetToken: token || '',
          amount: formatUnits(tokenAmount || 0n, 18),
          value: `$${formatUnits(payoutWei || 0n, 18)}`, // ETH payout
          fee: '$0.00',
          status: 'SUCCESS',
          timestamp,
          txHash: log.transactionHash,
        });
      }
    } catch (error) {
      console.error('Error fetching redeem events:', error);
    }

    // 3. Fetch CLAIM transactions (IncomeClaimed events from IncomeDistributor)
    try {
      const claimLogs = await client.getLogs({
        address: contracts.INCOME_DISTRIBUTOR as `0x${string}`,
        event: parseAbiItem('event IncomeClaimed(address indexed assetToken, address indexed user, address indexed incomeToken, uint256 amount, uint256 timestamp)'),
        args: {
          user: wallet as `0x${string}`,
        },
        fromBlock,
        toBlock: currentBlock,
      });

      for (const log of claimLogs) {
        const { assetToken, user, incomeToken, amount } = log.args;
        const block = await client.getBlock({ blockNumber: log.blockNumber });
        const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();

        let assetName = `Asset ${assetToken?.slice(0, 8)}...`;
        try {
          const nameResult = await client.readContract({
            address: assetToken as `0x${string}`,
            abi: ABIS.ASSET_TOKEN,
            functionName: 'name',
          });
          assetName = String(nameResult);
        } catch {}

        transactions.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'CLAIM',
          assetName,
          assetToken: assetToken || '',
          amount: '0', // Claim doesn't transfer asset tokens
          value: `$${formatUnits(amount || 0n, 6)}`, // USDC income
          fee: '$0.00',
          status: 'SUCCESS',
          timestamp,
          txHash: log.transactionHash,
        });
      }
    } catch (error) {
      console.error('Error fetching claim events:', error);
    }

    // 4. Fetch TRANSFER transactions (ERC20 Transfer events from asset tokens)
    // This is more complex as we need to track all known asset tokens
    // For now, skip this or implement based on indexed asset registry

    // Sort by timestamp (newest first)
    transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history', transactions: [] },
      { status: 500 }
    );
  }
}
