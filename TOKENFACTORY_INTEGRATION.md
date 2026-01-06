# TokenFactory Integration - Frontend Update

After deploying the TokenFactory contract, the frontend needs to be updated to:
1. Deploy a new ERC20 token for each asset
2. Use the deployed token address when submitting to the approval queue

## Changes Required

### File: `apps/frontend/src/app/list-asset/page.tsx`

Replace the current token address logic (around line 220-240) with:

```typescript
// 4. Deploy ERC20 token via TokenFactory
console.log('Deploying ERC20 token for asset...');

if (!contracts.TOKEN_FACTORY) {
  alert('TokenFactory not deployed. Using USDC placeholder.');
  const tokenAddress = contracts.USDC as `0x${string}`;
  
  // Submit with USDC (fallback)
  writeContract({
    address: contracts.ASSET_APPROVAL_QUEUE as `0x${string}`,
    abi: ABIS.ASSET_APPROVAL_QUEUE,
    functionName: 'submit',
    args: [tokenAddress, metadataURI],
    gas: 500000n,
  });
  return;
}

// Deploy new token via factory
const totalSupplyUnits = parseUnits(formData.totalSupply, 18);

try {
  // Step 1: Deploy token
  const deployHash = await writeContractAsync({
    address: contracts.TOKEN_FACTORY as `0x${string}`,
    abi: ABIS.TOKEN_FACTORY,
    functionName: 'createToken',
    args: [
      formData.tokenName,
      formData.tokenSymbol,
      totalSupplyUnits,
      18 // decimals
    ],
  });

  console.log('Token deployment tx:', deployHash);
  console.log('Waiting for confirmation...');

  // Step 2: Wait for deployment
  const deployReceipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
  });

  // Step 3: Extract token address from TokenCreated event
  const tokenCreatedLog = deployReceipt.logs.find(log => {
    try {
      const decoded = decodeEventLog({
        abi: ABIS.TOKEN_FACTORY,
        data: log.data,
        topics: log.topics,
      });
      return decoded.eventName === 'TokenCreated';
    } catch {
      return false;
    }
  });

  if (!tokenCreatedLog) {
    throw new Error('TokenCreated event not found in logs');
  }

  const decoded = decodeEventLog({
    abi: ABIS.TOKEN_FACTORY,
    data: tokenCreatedLog.data,
    topics: tokenCreatedLog.topics,
  });

  const tokenAddress = decoded.args.token as `0x${string}`;
  console.log('✅ Token deployed:', tokenAddress);

  // Step 4: Submit to approval queue
  console.log('Submitting to approval queue...');
  writeContract({
    address: contracts.ASSET_APPROVAL_QUEUE as `0x${string}`,
    abi: ABIS.ASSET_APPROVAL_QUEUE,
    functionName: 'submit',
    args: [tokenAddress, metadataURI],
    gas: 500000n,
  });

} catch (error) {
  console.error('Token deployment failed:', error);
  throw error;
}
```

### Required Imports

Add to the top of the file:

```typescript
import { decodeEventLog } from 'viem';
```

And update the wagmi hooks to include `writeContractAsync`:

```typescript
const { writeContract, writeContractAsync, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();
```

## Manual Update Instructions

Since you need to deploy the TokenFactory first, here's what to do:

### Step 1: Deploy TokenFactory
Follow: [DEPLOY_TOKEN_FACTORY.md](DEPLOY_TOKEN_FACTORY.md)

### Step 2: Add Address to Config
After deployment, add to `apps/frontend/.env.local`:
```env
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_SEPOLIA=0xYOUR_FACTORY_ADDRESS
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0xYOUR_FACTORY_ADDRESS
```

### Step 3: Update Frontend Code
I'll update the code automatically once you provide the TokenFactory address, OR you can manually update `apps/frontend/src/app/list-asset/page.tsx` using the code above.

### Step 4: Deploy Frontend
```powershell
cd "c:\Asset Tokenization"
firebase deploy --only hosting
```

## Testing the Integration

1. **Fill out asset form**
2. **Click "Submit to Approval Queue"**
3. **MetaMask will show TWO transactions**:
   - Transaction 1: Deploy ERC20 token (via TokenFactory)
   - Transaction 2: Submit to AssetApprovalQueue
4. **Confirm both** in MetaMask
5. **Wait for confirmations** (~24 seconds total)
6. **Check Admin → Approval Queue** - submission should appear with unique token!

## Benefits

✅ Each asset gets its own unique ERC20 token  
✅ No more "TokenAlreadySubmitted" errors  
✅ Production-ready solution  
✅ Proper token ownership (minted to submitter)  
✅ Can submit unlimited assets  

## Current Status vs After Integration

**Current (USDC placeholder)**:
- ❌ Only 1 submission allowed
- ❌ All assets share same token
- ❌ Not production-ready

**After TokenFactory**:
- ✅ Unlimited submissions
- ✅ Each asset has unique token
- ✅ Production-ready
- ✅ Proper token ownership

---

**Next Steps**: Deploy TokenFactory using Remix IDE (5 minutes), then I'll update the frontend code automatically!
