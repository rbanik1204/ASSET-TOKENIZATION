// Smart Contract Addresses and ABIs
//
// This frontend is paired with the Foundry contracts in /AssetToken/src.
// Addresses are injected at runtime via NEXT_PUBLIC_* env vars.
import { parseAbi, type Abi } from 'viem';

// IMPORTANT (Next.js env inlining):
// - In client bundles, Next only inlines env vars when they are referenced as
//   `process.env.NEXT_PUBLIC_FOO` (static property access).
// - Computed access like `process.env[dynamicKey]` will be undefined in the browser.
// To support per-chain vars like NEXT_PUBLIC_*_ADDRESS_SEPOLIA, we snapshot the
// known env vars into a plain object using static references.
const ENV: Record<string, string | undefined> = {
  NEXT_PUBLIC_DEFAULT_CHAIN_ID: process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID,

  // Base (single-chain / default-chain fallback)
  NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS,
  NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS: process.env.NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS,
  NEXT_PUBLIC_PRIMARY_SALE_ADDRESS: process.env.NEXT_PUBLIC_PRIMARY_SALE_ADDRESS,
  NEXT_PUBLIC_PLATFORM_FEE_CONTROLLER_ADDRESS: process.env.NEXT_PUBLIC_PLATFORM_FEE_CONTROLLER_ADDRESS,
  NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS: process.env.NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS,
  NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS: process.env.NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS,
  NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS: process.env.NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS,
  NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS,
  NEXT_PUBLIC_FINAL_SALE_ADDRESS: process.env.NEXT_PUBLIC_FINAL_SALE_ADDRESS,
  NEXT_PUBLIC_AMM_POOL_ADDRESS: process.env.NEXT_PUBLIC_AMM_POOL_ADDRESS,
  NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS,

  // Sepolia (production target)
  NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_PRIMARY_SALE_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_PRIMARY_SALE_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_PLATFORM_FEE_CONTROLLER_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_PLATFORM_FEE_CONTROLLER_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_FINAL_SALE_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_FINAL_SALE_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_AMM_POOL_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_AMM_POOL_ADDRESS_SEPOLIA,
  NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_SEPOLIA,

  // Local (dev fallback)
  NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS_LOCAL,
  NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS_LOCAL,
  NEXT_PUBLIC_PRIMARY_SALE_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_PRIMARY_SALE_ADDRESS_LOCAL,
  NEXT_PUBLIC_PLATFORM_FEE_CONTROLLER_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_PLATFORM_FEE_CONTROLLER_ADDRESS_LOCAL,
  NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS_LOCAL,
  NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS_LOCAL,
  NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS_LOCAL,
  NEXT_PUBLIC_USDC_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_USDC_ADDRESS_LOCAL,
  NEXT_PUBLIC_FINAL_SALE_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_FINAL_SALE_ADDRESS_LOCAL,
  NEXT_PUBLIC_AMM_POOL_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_AMM_POOL_ADDRESS_LOCAL,
  NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_LOCAL: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_LOCAL,
};

export const CONTRACTS = {
  ASSET_REGISTRY: ENV.NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS || '',
  ASSET_APPROVAL_QUEUE: ENV.NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS || '',
  PRIMARY_SALE: ENV.NEXT_PUBLIC_PRIMARY_SALE_ADDRESS || '',
  PLATFORM_FEE_CONTROLLER: ENV.NEXT_PUBLIC_PLATFORM_FEE_CONTROLLER_ADDRESS || '',
  ORACLE_PRICE_FEED: ENV.NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS || '',
  PROOF_OF_RESERVE: ENV.NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS || '',
  INCOME_DISTRIBUTOR: ENV.NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS || '',
  USDC: ENV.NEXT_PUBLIC_USDC_ADDRESS || '',
  FINAL_SALE: ENV.NEXT_PUBLIC_FINAL_SALE_ADDRESS || '',
  TOKEN_FACTORY: ENV.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS || '',

  // AMM pools are deployed per-asset-token; wire a pool address when you need to trade a specific token.
  AMM_POOL: ENV.NEXT_PUBLIC_AMM_POOL_ADDRESS || '',
};

export type ContractKey = keyof typeof CONTRACTS;

const CHAIN_ENV_SUFFIX: Record<number, string> = {
  1: 'ETHEREUM',
  11155111: 'SEPOLIA',
  56: 'BSC',
  97: 'BSC_TESTNET',
  137: 'POLYGON',
  80002: 'POLYGON_AMOY',
  31337: 'LOCAL',
};

function getDefaultChainId(): number | null {
  const raw = ENV.NEXT_PUBLIC_DEFAULT_CHAIN_ID;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

const FALLBACK_TO_BASE_ENV_CHAIN_IDS = new Set<number>([31337]);

function readAddressEnvVar(baseEnvVar: string, chainId: number): string {
  const suffix = CHAIN_ENV_SUFFIX[chainId];
  const defaultChainId = getDefaultChainId();
  const allowFallback = FALLBACK_TO_BASE_ENV_CHAIN_IDS.has(chainId) || (defaultChainId !== null && chainId === defaultChainId);

  const withSuffix = suffix ? ENV[`${baseEnvVar}_${suffix}`] : undefined;
  if (withSuffix && withSuffix.trim()) return withSuffix.trim();

  if (allowFallback) {
    const base = ENV[baseEnvVar];
    if (base && base.trim()) return base.trim();
  }

  return '';
}

export function getContractsForChain(chainId: number) {
  return {
    ASSET_REGISTRY: readAddressEnvVar('NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS', chainId),
    ASSET_APPROVAL_QUEUE: readAddressEnvVar('NEXT_PUBLIC_ASSET_APPROVAL_QUEUE_ADDRESS', chainId),
    PRIMARY_SALE: readAddressEnvVar('NEXT_PUBLIC_PRIMARY_SALE_ADDRESS', chainId),
    PLATFORM_FEE_CONTROLLER: readAddressEnvVar('NEXT_PUBLIC_PLATFORM_FEE_CONTROLLER_ADDRESS', chainId),
    ORACLE_PRICE_FEED: readAddressEnvVar('NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS', chainId),
    PROOF_OF_RESERVE: readAddressEnvVar('NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS', chainId),
    INCOME_DISTRIBUTOR: readAddressEnvVar('NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS', chainId),
    USDC: readAddressEnvVar('NEXT_PUBLIC_USDC_ADDRESS', chainId),
    FINAL_SALE: readAddressEnvVar('NEXT_PUBLIC_FINAL_SALE_ADDRESS', chainId),
    TOKEN_FACTORY: readAddressEnvVar('NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS', chainId),

    // AMM pools are deployed per-asset-token; wire a pool address when you need to trade a specific token.
    AMM_POOL: readAddressEnvVar('NEXT_PUBLIC_AMM_POOL_ADDRESS', chainId),
  } as const;
}

function isLikelyAddress(value: string | undefined): boolean {
  return Boolean(value && value.startsWith('0x') && value.length === 42);
}

export function isContractsConfiguredFor(chainId: number, required: ContractKey[]): boolean {
  const contracts = getContractsForChain(chainId);
  return required.every((key) => isLikelyAddress(contracts[key]));
}

// Minimal ABI fragments covering the methods used by the app.
// (You can replace these with full ABIs generated from Foundry when Foundry is installed.)
export const ABIS = {
  ASSET_TOKEN: parseAbi([
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
  ]),
  OWNABLE: parseAbi(['function owner() view returns (address)']),
  ASSET_REGISTRY: [
    {
      type: 'function',
      name: 'assetCount',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'approvalQueue',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'address' }],
    },
    {
      type: 'function',
      name: 'registerAsset',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'metadataURI', type: 'string' },
      ],
      outputs: [],
    },
    {
      type: 'function',
      name: 'deactivateAsset',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'assetId', type: 'uint256' }],
      outputs: [],
    },
    {
      type: 'function',
      name: 'getAsset',
      stateMutability: 'view',
      inputs: [{ name: 'assetId', type: 'uint256' }],
      outputs: [
        {
          name: 'asset',
          type: 'tuple',
          components: [
            { name: 'token', type: 'address' },
            { name: 'owner', type: 'address' },
            { name: 'metadataURI', type: 'string' },
            { name: 'active', type: 'bool' },
          ],
        },
      ],
    },
    {
      type: 'function',
      name: 'getAssetIdByToken',
      stateMutability: 'view',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
  ] as const satisfies Abi,
  ASSET_APPROVAL_QUEUE: parseAbi([
    'function owner() view returns (address)',
    'function submissionCount() view returns (uint256)',
    'function submit(address token, string metadataURI) returns (uint256)',
    'function approve(uint256 submissionId)',
    'function reject(uint256 submissionId, string reason)',
    'function getSubmission(uint256 submissionId) view returns ((address token, address submitter, string metadataURI, uint40 submittedAt, uint8 status, uint40 reviewedAt, address reviewer))',
    'function getSubmissionInfoByToken(address token) view returns (uint256 submissionId, address submitter, string metadataURI, uint8 status)',
    'error InvalidToken()',
    'error InvalidMetadataURI()',
    'error TokenAlreadySubmitted()',
    'error SubmissionNotFound()',
    'error SubmissionNotPending()',
    'event SubmissionCreated(uint256 indexed submissionId, address indexed token, address indexed submitter, string metadataURI, uint256 timestamp)',
    'event SubmissionApproved(uint256 indexed submissionId, address indexed token, address indexed reviewer, uint256 timestamp)',
    'event SubmissionRejected(uint256 indexed submissionId, address indexed token, address indexed reviewer, string reason, uint256 timestamp)',
  ]) as Abi,
  TOKEN_FACTORY: parseAbi([
    'function createToken(string name, string symbol, uint256 initialSupply, uint8 decimals) returns (address)',
    'function getUserTokens(address user) view returns (address[])',
    'function getTokenCount() view returns (uint256)',
    'function allTokens(uint256) view returns (address)',
    'event TokenCreated(address indexed token, string name, string symbol, uint256 initialSupply, address indexed owner)',
  ]) as Abi,
  PRIMARY_SALE: [
    {
      type: 'function',
      name: 'createSale',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'pricePerToken', type: 'uint256' },
        { name: 'tokensForSale', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
      ],
      outputs: [],
    },
    {
      type: 'function',
      name: 'purchaseTokens',
      stateMutability: 'payable',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'tokenAmount', type: 'uint256' },
      ],
      outputs: [],
    },
    {
      type: 'function',
      name: 'finalizeSale',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [],
    },
    {
      type: 'function',
      name: 'withdrawFunds',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [],
    },
    {
      type: 'function',
      name: 'getPurchaseAmount',
      stateMutability: 'view',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'buyer', type: 'address' },
      ],
      outputs: [{ type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'getSale',
      stateMutability: 'view',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [
        {
          name: 'sale',
          type: 'tuple',
          components: [
            { name: 'token', type: 'address' },
            { name: 'seller', type: 'address' },
            { name: 'pricePerToken', type: 'uint256' },
            { name: 'tokensForSale', type: 'uint256' },
            { name: 'tokensSold', type: 'uint256' },
            { name: 'fundsWithdrawn', type: 'uint256' },
            { name: 'startTime', type: 'uint256' },
            { name: 'endTime', type: 'uint256' },
            { name: 'active', type: 'bool' },
            { name: 'finalized', type: 'bool' },
          ],
        },
      ],
    },
  ] as const satisfies Abi,
  AMM_POOL: parseAbi([
    'function token() view returns (address)',
    'function addLiquidity(uint256 tokenAmount, uint256 minTokenAmount, uint256 minETHAmount) payable',
    'function removeLiquidity(uint256 liquidity, uint256 minTokenAmount, uint256 minETHAmount)',
    'function swapETHForTokens(uint256 minTokensOut) payable',
    'function swapTokensForETH(uint256 tokenAmountIn, uint256 minETHOut)',
    'function getAmountOut(uint256 amountIn, bool ethIn) view returns (uint256)',
    'function getReserves() view returns (uint256, uint256)',
  ]),
  PLATFORM_FEE_CONTROLLER: parseAbi([
    'function feeRecipient() view returns (address)',
    'function primarySaleFeeBPS() view returns (uint256)',
    'function ammSwapFeeBPS() view returns (uint256)',
    'function liquidityFeeBPS() view returns (uint256)',
    'function calculatePrimarySaleFee(uint256 amount) view returns (uint256)',
    'function calculateAMMSwapFee(uint256 amount) view returns (uint256)',
    'function calculateLiquidityFee(uint256 amount) view returns (uint256)',
  ]),
  ERC20: parseAbi([
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ]),
  INCOME_DISTRIBUTOR: parseAbi([
    'function depositIncome(address assetToken, address incomeToken, uint256 amount) payable',
    'function claimIncome(address assetToken, address incomeToken)',
    'function getClaimableIncome(address assetToken, address user, address incomeToken) view returns (uint256)',
    'function getTotalClaimed(address assetToken, address user) view returns (uint256)',
    'function getTotalDeposited(address assetToken) view returns (uint256)',
    'event IncomeDeposited(address indexed assetToken, address indexed incomeToken, uint256 amount, uint256 newIncomePerToken, uint256 timestamp)',
    'event IncomeClaimed(address indexed assetToken, address indexed user, address indexed incomeToken, uint256 amount, uint256 timestamp)',
  ]) as Abi,
  ORACLE_PRICE_FEED: parseAbi([
    'function getPrice(address token) view returns (int256, uint8)',
    'function tokenPriceFeed(address token) view returns (address)',
  ]) as Abi,
  PROOF_OF_RESERVE: parseAbi([
    'function checkReserve(address token) view returns (uint256 reserveAmount, uint256 totalSupply, bool isValid)',
    'function tokenReserveFeed(address token) view returns (address)',
    'function tokenTotalSupply(address token) view returns (uint256)',
  ]) as Abi,
  FINAL_SALE: parseAbi([
    'function pricePerTokenWei(address token) view returns (uint256)',
    'function redeem(address token, uint256 tokenAmount)',
    'event Redeemed(address indexed token, address indexed seller, uint256 tokenAmount, uint256 payoutWei)',
  ]) as Abi,
};
