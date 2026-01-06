# List Asset - Blockchain Submission Implementation

## Overview
Fixed the asset submission flow to submit directly to the blockchain's `AssetApprovalQueue` contract instead of calling a mock API endpoint.

## Problem Identified
- **User Report**: "I have submitted a land declaration from list your asset section where do the admin gives confirmation"
- **Root Cause**: The List Asset page was calling `/api/assets/submit` (mock API) instead of blockchain
- **Impact**: Submissions never reached the blockchain, so admin approval queue remained empty

## Solution Implemented

### 1. Added Blockchain Dependencies
**File**: `apps/frontend/src/app/list-asset/page.tsx`

Added wagmi and viem imports for blockchain interaction:
```typescript
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi';
import { getContractsForChain, ABIS } from '@/config/contracts';
import { parseUnits, encodeFunctionData, keccak256, toHex } from 'viem';
```

### 2. Initialized Blockchain Hooks
```typescript
const chainId = useChainId();
const publicClient = usePublicClient();
const contracts = getContractsForChain(chainId || 11155111);
const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();
const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });
```

### 3. Rewrote handleSubmit Function

**Previous Flow** (Mock):
```
1. Upload documents to IPFS (mock)
2. Create metadata JSON
3. Upload metadata to IPFS (mock)
4. Call /api/assets/submit → Mock API
5. Show success message
```

**New Flow** (Blockchain):
```
1. Upload documents to IPFS (mock - to be replaced with Pinata)
2. Create metadata JSON with all form data
3. Upload metadata to IPFS → Get metadataURI
4. Generate deterministic token address (temporary)
5. Call AssetApprovalQueue.submit(tokenAddress, metadataURI) on blockchain
6. Wait for transaction confirmation
7. Redirect to portfolio
```

**Key Changes**:
- Added wallet connection check
- Added contract configuration validation
- Generate deterministic token address using CREATE2-like hashing
- Call `writeContract()` to submit to blockchain
- Transaction states handled by hooks

### 4. Added Transaction State Handling

**Success Handler**:
```typescript
useEffect(() => {
  if (isTxSuccess && !isSubmitting) {
    alert('Asset submitted successfully to the approval queue! The admin will review your submission.');
    router.push('/portfolio');
  }
}, [isTxSuccess, isSubmitting, router]);
```

**Error Handler**:
```typescript
useEffect(() => {
  if (writeError) {
    console.error('Transaction error:', writeError);
    alert(`Transaction failed: ${writeError.message}`);
    setIsSubmitting(false);
  }
}, [writeError]);
```

### 5. Updated Submit Button UI

Added transaction status indicators:
```typescript
disabled={!isStep4Valid || isSubmitting || isWritePending || isTxLoading}

{isWritePending ? 'Confirm in Wallet...' : 
 isTxLoading ? 'Confirming Transaction...' : 
 'Processing...'}
```

Button text changed from "Submit for Review" to "Submit to Approval Queue"

## Smart Contract Integration

### AssetApprovalQueue.submit()
```solidity
function submit(address token, string metadataURI) external;
```

**Parameters**:
- `token`: Address of the ERC20 token representing the asset
- `metadataURI`: IPFS URI containing asset metadata JSON

**Returns**: Emits `AssetSubmitted(uint256 submissionId, address token, string metadataURI, address submitter)`

## Token Address Generation (Temporary)

Currently generating deterministic token addresses using CREATE2-like hashing:
```typescript
const salt = keccak256(toHex(JSON.stringify({
  name: formData.tokenName,
  symbol: formData.tokenSymbol,
  creator: address,
  timestamp: Date.now()
})));

const tokenAddress = `0x${keccak256(
  toHex(contracts.ASSET_APPROVAL_QUEUE + salt.slice(2))
).slice(26)}`;
```

**⚠️ Note**: This is a temporary solution. In production, we should:
1. Deploy a `TokenFactory` contract
2. Deploy actual ERC20 tokens via the factory
3. Use the real deployed token address

## User Flow After Implementation

1. **User** fills asset details in List Asset form
2. **User** clicks "Submit to Approval Queue"
3. **System** uploads documents and metadata to IPFS
4. **System** generates token address
5. **MetaMask** prompts user to confirm transaction
6. **User** confirms in wallet → Button shows "Confirm in Wallet..."
7. **Blockchain** processes transaction → Button shows "Confirming Transaction..."
8. **System** waits for confirmation (1-2 blocks)
9. **Success** message appears, redirects to portfolio
10. **Admin** sees submission in Admin → Approval Queue tab
11. **Admin** can approve/reject the submission

## Admin Integration

The Admin Approval Queue page (already implemented) reads from the same `AssetApprovalQueue` contract:
- Fetches submissions via blockchain indexer
- Shows submission details (token address, metadata, submitter)
- Provides "Approve" and "Reject" buttons
- On approve: Registers asset in `AssetRegistry` contract

## Testing Instructions

### 1. Submit Asset
```bash
1. Navigate to List Asset page
2. Fill all required fields:
   - Asset Details (name, type, location, jurisdiction, description, valuation)
   - Tokenization Config (token name, symbol, supply, price)
   - Upload Documents (title deed, valuation report, legal opinion)
   - Accept Declarations
3. Click "Submit to Approval Queue"
4. Confirm transaction in MetaMask
5. Wait for confirmation message
```

### 2. Verify Submission
```bash
1. Navigate to Admin page → Approval Queue tab
2. Verify submission appears in queue
3. Check submission details match form data
4. Verify submitter address matches wallet
```

### 3. Approve Submission
```bash
1. Click "Approve" on the submission
2. Confirm transaction in MetaMask
3. Wait for confirmation
4. Verify asset appears in Asset Registry
```

## Known Limitations & Future Improvements

### 1. Token Deployment
**Current**: Generates deterministic addresses (not real tokens)
**Future**: Deploy actual ERC20 tokens via TokenFactory contract

**Implementation Plan**:
```typescript
// Deploy token first
const deployTx = await writeContract({
  address: TOKEN_FACTORY,
  abi: TOKEN_FACTORY_ABI,
  functionName: 'deployToken',
  args: [formData.tokenName, formData.tokenSymbol, totalSupplyUnits]
});

const receipt = await waitForTransaction(deployTx);
const tokenAddress = receipt.logs[0].address; // Extract from event

// Then submit to queue
await writeContract({
  address: ASSET_APPROVAL_QUEUE,
  abi: ASSET_APPROVAL_QUEUE_ABI,
  functionName: 'submit',
  args: [tokenAddress, metadataURI]
});
```

### 2. IPFS Upload
**Current**: Mock IPFS upload (returns dummy CIDs)
**Future**: Real Pinata integration

**Implementation**:
```typescript
async function uploadToIPFS(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/ipfs/upload', {
    method: 'POST',
    body: formData
  });
  
  const { IpfsHash } = await response.json();
  return `ipfs://${IpfsHash}`;
}
```

### 3. Transaction Monitoring
**Current**: Basic success/error alerts
**Future**: Rich transaction UI with progress indicators

**Proposed UI**:
- Transaction hash display with explorer link
- Block confirmation counter (1/2 confirmations)
- Estimated time remaining
- Submission ID display after success
- "View in Admin Queue" button

### 4. Error Handling
**Current**: Generic error messages
**Future**: Specific error handling for:
- Insufficient gas
- User rejected transaction
- Network congestion
- Contract errors (e.g., already submitted)
- IPFS upload failures

## Files Modified

1. **apps/frontend/src/app/list-asset/page.tsx**
   - Added blockchain imports (lines 3-6)
   - Added blockchain hooks (lines 13-18)
   - Added isSubmitting state (line 22)
   - Added transaction success handler (lines 25-31)
   - Added transaction error handler (lines 33-40)
   - Rewrote handleSubmit function (lines 220-267)
   - Updated submit button UI (lines 920-945)

## Contract Addresses

Configured in `apps/frontend/src/config/contracts.ts`:

**Sepolia Testnet**:
- AssetApprovalQueue: `0x...` (from contracts config)
- AssetRegistry: `0x...` (for approved assets)
- AssetPlatform: `0x...` (for investment)

## Environment Variables

None required for this implementation. All contract addresses are in the config file.

## Dependencies

Already installed:
- `wagmi` - React hooks for Ethereum
- `viem` - TypeScript Ethereum library
- `@rainbow-me/rainbowkit` - Wallet connection UI

## Deployment Checklist

- [x] Update List Asset page imports
- [x] Add blockchain hooks initialization
- [x] Rewrite handleSubmit to use blockchain
- [x] Add transaction state handlers
- [x] Update submit button UI
- [x] Remove duplicate state declarations
- [x] Fix TypeScript errors
- [ ] Test submission flow end-to-end
- [ ] Deploy TokenFactory contract (future)
- [ ] Integrate real IPFS (Pinata) (future)
- [ ] Add transaction monitoring UI (future)

## Success Metrics

After deployment, verify:
1. ✅ Form submission triggers MetaMask prompt
2. ✅ Transaction appears on blockchain explorer
3. ✅ Admin sees submission in queue
4. ✅ Submission contains correct metadata URI
5. ✅ Admin can approve/reject submission
6. ✅ Approved assets appear in registry

## Rollback Plan

If issues occur:
1. Revert `list-asset/page.tsx` to previous version
2. Submissions will go to mock API (broken but safe)
3. No blockchain state affected
4. Fix issues in development
5. Redeploy

## Support & Troubleshooting

**Issue**: Transaction fails with "User rejected transaction"
**Solution**: User clicked "Reject" in MetaMask. Try again.

**Issue**: Transaction fails with "Insufficient gas"
**Solution**: Increase gas limit or wait for lower network congestion.

**Issue**: Submission doesn't appear in admin queue
**Solution**: 
- Check transaction on explorer (verify it succeeded)
- Verify correct network (Sepolia testnet)
- Refresh admin page (may need to wait for indexer)

**Issue**: "AssetApprovalQueue contract not configured"
**Solution**: Contract address missing in config for current network.

## Contact

For questions or issues with this implementation, refer to the conversation history or check the admin approval queue directly.

---
**Last Updated**: Today
**Status**: ✅ Implementation Complete, Testing Pending
