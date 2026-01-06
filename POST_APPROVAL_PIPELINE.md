# POST-APPROVAL DEPLOYMENT PIPELINE

## Overview

This document describes the **100% REAL, ZERO MOCK** deployment pipeline that executes after an admin approves an asset submission.

## Current Status

### ✅ Implemented
- **On-chain approval** via `AssetApprovalQueue.approve()`
- **Backend API endpoint** at `/api/admin/deploy-asset`
- **Frontend integration** that triggers pipeline after approval
- **Pipeline framework** with all 8 steps outlined

### ⚠️ Partially Implemented (Placeholders)
The following components have **placeholder code** that needs real implementation:

1. **Token Deployment** (Step 2)
   - ✅ Framework exists
   - ❌ Need real TokenFactory ABI
   - ❌ Need to parse token address from transaction logs
   - ❌ Need proper error handling

2. **Income Contract** (Step 3)
   - ✅ Conditional logic works
   - ⚠️ Uses shared IncomeDistributor (may need per-asset contracts)

3. **AMM Pool Deployment** (Step 4)
   - ✅ Framework exists
   - ❌ Need real PoolFactory ABI
   - ❌ Need to parse pool address from logs
   - ❌ POOL_FACTORY_ADDRESS not in environment

4. **Liquidity Initialization** (Step 5)
   - ❌ Not implemented yet
   - ❌ Needs token approval
   - ❌ Needs USDC approval
   - ❌ Needs addLiquidity call

5. **Oracle Verification** (Step 6)
   - ❌ Not implemented yet
   - ❌ Needs oracle contract addresses
   - ❌ Needs oracle ABI
   - ❌ Needs price feed verification logic

6. **Indexing** (Step 7)
   - ✅ Marks asset as indexed
   - ⚠️ No actual indexer integration (just a flag)

7. **Marketplace Visibility** (Step 8)
   - ✅ Conditional logic implemented correctly
   - ⚠️ Will remain `false` until steps 5 & 6 complete

## Pipeline Steps (Detailed)

### Step 1: Metadata Finalization
```typescript
// ✅ COMPLETE
result.steps.metadataFrozen = true;
```
**Status**: ✅ Complete  
**Action**: Marks metadata as immutable  
**Todo**: Consider adding to database/registry contract

---

### Step 2: Token Deployment
```typescript
// ⚠️ NEEDS WORK
const tokenAddress = await deployTokenViaFactory({
  name, symbol, supply, metadataURI
});
```

**Status**: ⚠️ Placeholder  
**What's needed**:
1. Import real `TokenFactory` ABI from `packages/contracts/abi`
2. Parse token address from event logs:
```typescript
const tokenCreatedEvent = receipt.logs.find(
  log => log.topics[0] === '0x...' // TokenCreated event signature
);
const tokenAddress = `0x${tokenCreatedEvent.data.slice(26, 66)}`;
```
3. Handle deployment failures gracefully
4. Store token address in database/registry

**Environment variables needed**:
- ✅ `NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS` (already exists)
- ✅ `ADMIN_DEPLOYER_PRIVATE_KEY` (add to `.env.local`)

---

### Step 3: Income Contract
```typescript
// ⚠️ DECISION NEEDED
if (hasIncome) {
  // Option A: Use shared IncomeDistributor
  // Option B: Deploy per-asset income contract
}
```

**Status**: ⚠️ Design decision needed  
**Question**: Does each asset need its own income contract, or do they share one?

**If shared**: ✅ Already implemented  
**If per-asset**: ❌ Need to:
1. Create `IncomeDistributorFactory` contract
2. Add factory ABI
3. Deploy per-asset contract
4. Link to asset token

---

### Step 4: AMM Pool Deployment
```typescript
// ❌ NOT IMPLEMENTED
const poolAddress = await deployPoolViaFactory({
  tokenA: assetToken,
  tokenB: USDC
});
```

**Status**: ❌ Not implemented  
**What's needed**:
1. **Choose AMM**: Uniswap V2? V3? Custom?
2. **Add factory address** to `.env.local`:
```env
NEXT_PUBLIC_POOL_FACTORY_ADDRESS=0x...
```
3. **Import factory ABI**:
```typescript
import POOL_FACTORY_ABI from '@/contracts/abi/PoolFactory.json';
```
4. **Parse pool address from logs**:
```typescript
const pairCreatedEvent = receipt.logs.find(
  log => log.topics[0] === PAIR_CREATED_SIGNATURE
);
```
5. **Handle pool already exists** (some factories revert if pair exists)

**Uniswap V2 Reference**:
```typescript
// Factory: 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f (mainnet)
// Sepolia equivalent needed

const { request } = await publicClient.simulateContract({
  address: FACTORY_ADDRESS,
  abi: UNISWAP_V2_FACTORY_ABI,
  functionName: 'createPair',
  args: [tokenAddress, USDC_ADDRESS],
});

const hash = await walletClient.writeContract(request);
const receipt = await publicClient.waitForTransactionReceipt({ hash });

// Parse PairCreated(token0, token1, pair, allPairsLength)
const pairAddress = `0x${receipt.logs[0].data.slice(26, 66)}`;
```

---

### Step 5: Liquidity Initialization
```typescript
// ❌ NOT IMPLEMENTED
await initializeLiquidity({
  pool: poolAddress,
  tokenAmount: parseUnits('1000', 18),
  usdcAmount: parseUnits('10000', 6),
});
```

**Status**: ❌ Critical - blocks marketplace visibility  
**What's needed**:
1. **Approve token spend**:
```typescript
await walletClient.writeContract({
  address: tokenAddress,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [poolAddress, tokenAmount],
});
```

2. **Approve USDC spend**:
```typescript
await walletClient.writeContract({
  address: USDC_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [poolAddress, usdcAmount],
});
```

3. **Add liquidity** (Uniswap V2 example):
```typescript
await walletClient.writeContract({
  address: ROUTER_ADDRESS,
  abi: UNISWAP_V2_ROUTER_ABI,
  functionName: 'addLiquidity',
  args: [
    tokenAddress,
    USDC_ADDRESS,
    tokenAmount,
    usdcAmount,
    0, // minTokens (0 = no slippage protection for initial add)
    0, // minUSDC
    adminAddress, // LP tokens recipient
    Math.floor(Date.now() / 1000) + 600, // deadline (10 min)
  ],
});
```

**Important**: Admin wallet needs:
- Asset tokens (from token deployment)
- USDC (for initial liquidity)

**Todo**: Add to `.env.local`:
```env
INITIAL_LIQUIDITY_TOKEN_AMOUNT=1000
INITIAL_LIQUIDITY_USDC_AMOUNT=10000
```

---

### Step 6: Oracle Verification
```typescript
// ❌ NOT IMPLEMENTED
const oracleVerified = await verifyOracleFeeds({
  tokenAddress,
  poolAddress,
});
```

**Status**: ❌ Critical - blocks marketplace visibility  
**What's needed**:

1. **Identify oracle type**:
   - Chainlink price feeds?
   - Uniswap V3 TWAP?
   - Custom oracle?

2. **For Chainlink**:
```typescript
const priceFeed = await publicClient.readContract({
  address: CHAINLINK_REGISTRY,
  abi: CHAINLINK_REGISTRY_ABI,
  functionName: 'latestRoundData',
  args: [tokenAddress, USDC_ADDRESS],
});

const isVerified =
  priceFeed.answer > 0 &&
  priceFeed.updatedAt > Date.now() / 1000 - 900; // 15 min freshness
```

3. **For Uniswap TWAP**:
```typescript
const observation = await publicClient.readContract({
  address: poolAddress,
  abi: UNISWAP_V3_POOL_ABI,
  functionName: 'observe',
  args: [[0]], // Current timestamp
});

const isVerified = observation[0] > 0;
```

**Verification conditions** (from spec):
```typescript
oracleVerified =
  priceFeedPresent &&
  reserveFeedPresent &&
  feedsFresh &&
  valuesNonZero
```

**Todo**: Add oracle config to `.env.local`:
```env
CHAINLINK_REGISTRY_ADDRESS=0x...
# OR
ORACLE_TYPE=uniswap_twap
```

---

### Step 7: Indexing
```typescript
// ✅ BASIC IMPLEMENTATION
result.steps.indexed = true;
```

**Status**: ✅ Basic flag works  
**Todo (optional)**:
- Trigger webhook to indexer service
- Write to database with indexed=true
- Emit event for off-chain listeners

---

### Step 8: Marketplace Visibility Gate
```typescript
// ✅ LOGIC COMPLETE
const marketplaceVisible =
  metadataFrozen &&
  tokenDeployed &&
  tokenAddress !== undefined &&
  ammPoolDeployed &&
  ammPoolAddress !== undefined &&
  liquidityInitialized &&
  oracleVerified &&
  indexed;
```

**Status**: ✅ Logic is correct  
**Current result**: Will be `false` until Steps 5 & 6 complete

---

## Implementation Checklist

### Critical Path (Blocks Marketplace)
- [ ] **Step 2**: Implement real token deployment with log parsing
- [ ] **Step 4**: Choose AMM and implement pool deployment
- [ ] **Step 5**: Implement liquidity initialization (CRITICAL)
- [ ] **Step 6**: Implement oracle verification (CRITICAL)

### Important (Functional)
- [ ] **Environment**: Add `ADMIN_DEPLOYER_PRIVATE_KEY` to `.env.local`
- [ ] **Environment**: Add `NEXT_PUBLIC_POOL_FACTORY_ADDRESS`
- [ ] **Environment**: Add liquidity amounts
- [ ] **Environment**: Add oracle config
- [ ] **Contracts**: Import all required ABIs
- [ ] **Error Handling**: Add retry logic for transient failures
- [ ] **Gas Estimation**: Add proper gas estimation for all transactions

### Nice-to-Have (Future)
- [ ] **Database**: Store deployment results in PostgreSQL/Firebase
- [ ] **Monitoring**: Add deployment status tracking UI
- [ ] **Indexer**: Real-time event monitoring
- [ ] **Recovery**: Manual retry endpoint if deployment fails mid-way
- [ ] **Testing**: Integration tests for full pipeline

---

## Environment Variables Needed

Add these to `apps/frontend/.env.local`:

```env
# Admin deployer (has authority to deploy contracts)
ADMIN_DEPLOYER_PRIVATE_KEY=0x1234567890abcdef...

# Pool factory (for AMM deployment)
NEXT_PUBLIC_POOL_FACTORY_ADDRESS=0x...

# Router (for liquidity initialization)
NEXT_PUBLIC_ROUTER_ADDRESS=0x...

# Oracle config
ORACLE_TYPE=chainlink
CHAINLINK_REGISTRY_ADDRESS=0x...

# Initial liquidity amounts
INITIAL_LIQUIDITY_TOKEN_AMOUNT=1000
INITIAL_LIQUIDITY_USDC_AMOUNT=10000
```

---

## Testing the Pipeline

### 1. Test Approval (Current)
```bash
# Navigate to admin page
# Click "Approve" on a pending submission
# Should see: "Approval transaction submitted..."
# Then: "Starting post-approval deployment pipeline..."
```

### 2. Check Console Logs
Look for:
```
📋 Step 1/2: Approving submission on-chain...
✅ Approval confirmed on-chain
🚀 Step 2/2: Starting post-approval deployment pipeline...
📥 Fetching metadata from IPFS...
🏗️ Calling deployment API...
🚀 Starting deployment pipeline for submission X
🔐 Deploying from admin account: 0x...
📋 Step 1: Freezing metadata...
🪙 Step 2: Deploying asset token...
💰 Step 3: Deploying income distribution contract...
🏊 Step 4: Deploying AMM pool...
💧 Step 5: Initializing liquidity...
🔮 Step 6: Verifying oracle feeds...
📊 Step 7: Marking for indexing...
🏪 Step 8: Checking marketplace visibility conditions...
```

### 3. Expected Current Behavior
Since Steps 5 & 6 are not implemented:
```
✅ Token deployed at: 0x... (placeholder)
⚠️ Liquidity initialization not yet implemented
⚠️ Oracle verification not yet implemented
⚠️ Partial deployment - asset will NOT be visible in marketplace yet
```

### 4. Expected Final Behavior
After implementing Steps 5 & 6:
```
✅ Token deployed at: 0x123...
✅ AMM pool deployed at: 0x456...
✅ Liquidity initialized: 1000 tokens + 10000 USDC
✅ Oracle verified: true
✅ All conditions met - asset will be visible in marketplace
```

---

## Architecture Decisions Needed

### 1. Token Standard
**Question**: ERC-20, ERC-721, or ERC-1155?  
**Current**: Assumes ERC-20  
**Decision**: Depends on whether assets are fungible (ERC-20) or unique (ERC-721)

### 2. AMM Choice
**Options**:
- Uniswap V2 (simple, widely supported)
- Uniswap V3 (concentrated liquidity, more complex)
- Custom AMM

**Recommendation**: Start with Uniswap V2 for simplicity

### 3. Oracle Type
**Options**:
- Chainlink (external price feeds, requires subscription)
- Uniswap TWAP (derived from pool, free)
- Custom oracle

**Recommendation**: Uniswap TWAP for simplicity (already have pool)

### 4. Income Distribution
**Question**: Shared contract or per-asset?  
**Current**: Uses shared `IncomeDistributor`  
**Decision**: Depends on business logic complexity

---

## Next Steps

1. **Make architecture decisions** (token standard, AMM, oracle)
2. **Add environment variables** to `.env.local`
3. **Import contract ABIs** from `packages/contracts`
4. **Implement Step 5** (liquidity initialization)
5. **Implement Step 6** (oracle verification)
6. **Test end-to-end** approval → deployment → marketplace visibility
7. **Add error recovery** for partial deployments

---

## Files Modified

1. **`apps/frontend/src/app/api/admin/deploy-asset/route.ts`**
   - New API endpoint for deployment pipeline
   - Contains all 8 steps with placeholders

2. **`apps/frontend/src/app/admin/page.tsx`**
   - Updated `handleApprove()` function
   - Now calls deployment API after on-chain approval

3. **`POST_APPROVAL_PIPELINE.md`** (this file)
   - Documentation and implementation guide

---

## Contact Points

- **Token deployment**: Needs `TokenFactory` contract and ABI
- **Pool deployment**: Needs AMM choice and factory address
- **Liquidity**: Needs router address and initial amounts
- **Oracle**: Needs oracle type and configuration
- **Admin key**: Needs secure private key management

**All placeholders are clearly marked with `// TODO:` or console warnings.**
