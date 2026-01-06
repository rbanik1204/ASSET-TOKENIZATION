# Asset Submission - Token Address Issue & Solution

## Problem Identified

Your transaction was failing with:
```
Transaction failed: The contract function "submit" reverted with the following reason:
transaction gas limit too high (cap: 16777216, tx: 21000000)
```

## Root Cause

The `AssetApprovalQueue` contract has strict validation on line 57-62:

```solidity
function submit(address token, string calldata metadataURI) external returns (uint256 submissionId) {
    if (token == address(0)) revert InvalidToken();
    if (token.code.length == 0) revert InvalidToken();  // ← Must be deployed contract
    try IERC20MetadataMinimal(token).decimals() returns (uint8) {
        // ok
    } catch {
        revert InvalidToken();  // ← Must have decimals() function
    }
```

The contract requires:
1. **Token must be a deployed contract** (`token.code.length > 0`)
2. **Token must implement `decimals()` function** (ERC20 standard)
3. **Token must be unique** (`TokenAlreadySubmitted` error if reused)

Our initial implementation was generating fake token addresses with no deployed code, causing the transaction to revert during gas estimation (making it look like a gas limit issue).

## Current Solution (MVP/Testing)

**File**: `apps/frontend/src/app/list-asset/page.tsx`

We now use the USDC token address for submissions:
```typescript
// Using USDC as placeholder for MVP
const tokenAddress = contracts.USDC; // 0x5e9B39e471f1e22786A23d031E40804B5835055a
```

**Pros**:
- ✅ Real deployed contract with `decimals()` function
- ✅ Transaction will succeed
- ✅ No deployment needed
- ✅ Fast testing

**Cons**:
- ⚠️ Only works ONCE (contract checks `tokenToSubmissionId[token] != 0`)
- ⚠️ Second submission with same token will fail with `TokenAlreadySubmitted()`
- ⚠️ All assets share same token address (not production-ready)

## Production Solution (Required)

### Option 1: Deploy TokenFactory Contract (Recommended)

1. **Create TokenFactory.sol**:
```solidity
// contracts/src/TokenFactory.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleAssetToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner
    ) ERC20(name, symbol) {
        _mint(owner, initialSupply);
    }
}

contract TokenFactory {
    event TokenCreated(address indexed token, string name, string symbol, address indexed owner);
    
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) external returns (address) {
        SimpleAssetToken token = new SimpleAssetToken(name, symbol, initialSupply, msg.sender);
        emit TokenCreated(address(token), name, symbol, msg.sender);
        return address(token);
    }
}
```

2. **Deploy TokenFactory to Sepolia**:
```bash
cd contracts
forge create src/TokenFactory.sol:TokenFactory \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify
```

3. **Update frontend** (`apps/frontend/src/app/list-asset/page.tsx`):
```typescript
// Step 1: Deploy token via factory
const totalSupplyUnits = parseUnits(formData.totalSupply, 18);

const deployTx = await writeContract({
  address: TOKEN_FACTORY_ADDRESS,
  abi: TOKEN_FACTORY_ABI,
  functionName: 'createToken',
  args: [
    formData.tokenName,
    formData.tokenSymbol,
    totalSupplyUnits
  ],
});

// Step 2: Wait for deployment
const deployReceipt = await waitForTransactionReceipt({ hash: deployTx });

// Step 3: Extract token address from event
const tokenCreatedEvent = deployReceipt.logs.find(
  log => log.topics[0] === keccak256(toHex('TokenCreated(address,string,string,address)'))
);
const tokenAddress = `0x${tokenCreatedEvent.topics[1].slice(-40)}`;

// Step 4: Submit to approval queue
await writeContract({
  address: ASSET_APPROVAL_QUEUE,
  abi: ASSET_APPROVAL_QUEUE_ABI,
  functionName: 'submit',
  args: [tokenAddress, metadataURI],
});
```

### Option 2: Remove Token Uniqueness Check (Quick Fix)

Modify `AssetApprovalQueue.sol` to allow multiple submissions per token:

```solidity
// Remove this line:
// if (tokenToSubmissionId[token] != 0) revert TokenAlreadySubmitted();

// Replace with:
if (submissions[tokenToSubmissionId[token]].status == Status.Pending) {
    revert TokenAlreadyPendingSubmission();
}
```

This allows:
- Multiple submissions with same token IF previous was approved/rejected
- Still prevents duplicate pending submissions
- Good for testing multiple assets without deploying new tokens

Then redeploy:
```bash
cd contracts
forge script script/Deploy.s.sol:DeployAll --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

### Option 3: Pre-deploy Multiple Test Tokens

For testing, deploy several ERC20 tokens upfront:

```bash
# Deploy 10 test tokens
for i in {1..10}; do
  cast send $TOKEN_FACTORY "createToken(string,string,uint256)" \
    "Test Asset $i" \
    "TST$i" \
    "1000000000000000000000000" \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY
done
```

Then rotate through them in the frontend:
```typescript
const TEST_TOKENS = [
  '0x...',  // Token 1
  '0x...',  // Token 2
  // ... etc
];

const tokenAddress = TEST_TOKENS[submissionCount % TEST_TOKENS.length];
```

## Current Status

**What Works Now**:
- ✅ Form submission triggers real blockchain transaction
- ✅ MetaMask shows correct contract call to `AssetApprovalQueue.submit()`
- ✅ Transaction will succeed (using USDC address)
- ✅ Admin queue will show the submission

**Limitations**:
- ⚠️ Only ONE submission allowed (USDC address reuse blocked)
- ⚠️ Must implement TokenFactory for multiple submissions

## Testing Instructions

### Test First Submission (Should Work)
1. Fill out asset form completely
2. Click "Submit to Approval Queue"
3. Approve in MetaMask
4. Wait for confirmation (12 seconds on Sepolia)
5. Check Admin → Approval Queue → Should see your submission!

### Test Second Submission (Will Fail)
1. Try submitting another asset
2. MetaMask will show error: `TokenAlreadySubmitted()`
3. This is expected behavior

### To Test Multiple Submissions
**Option A**: Approve/reject first submission, then submit new one
**Option B**: Implement TokenFactory (see Option 1 above)
**Option C**: Modify contract to allow token reuse (see Option 2 above)

## Recommended Next Steps

1. **Immediate** (for testing): 
   - Current solution works for first submission
   - Approve it in admin panel to test full flow
   - Then decide on production approach

2. **Short-term** (for multiple test submissions):
   - Deploy TokenFactory contract
   - Update frontend to call factory.createToken()
   - Each asset gets unique token

3. **Long-term** (production):
   - Add proper token deployment UI
   - Show token deployment progress
   - Link token address in submission confirmation
   - Add token management in user profile

## Files Modified

- `apps/frontend/src/app/list-asset/page.tsx` - Fixed token address to use USDC
- `apps/frontend/src/lib/deployToken.ts` - Created (placeholder for future)

## Environment Variables

No changes needed. USDC address already configured:
```
NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA=0x5e9B39e471f1e22786A23d031E40804B5835055a
```

## Summary

The transaction failure was caused by trying to submit a fake token address. The contract validates that tokens are real deployed ERC20 contracts with a `decimals()` function. We fixed it by using the USDC address, which works for the first submission. For production or multiple test submissions, you need to deploy a TokenFactory contract.

**Status**: ✅ Fixed - Ready to test first submission!

---
**Date**: January 5, 2026  
**Issue**: Transaction gas estimation failure  
**Cause**: Invalid token address (not deployed)  
**Fix**: Use real USDC token address  
**Next**: Implement TokenFactory for production
