# Deployment Pipeline Setup & Testing Guide

## 1. Environment Variables Setup

Edit `apps/frontend/.env.local` and configure the following:

### Required Variables (Already Configured ✅)
```bash
# RPC Endpoint
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Contract Addresses (Sepolia Testnet)
NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS_SEPOLIA=0x5104a0C15a463F6B4E576a7cdf73Dab357C9Edb7
NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS_SEPOLIA=0x03f970dce702C768a0663D0625890bAA173EaDd1
NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS_SEPOLIA=0x07Fa7C0cf041D7f2919BE76833030F1d1Ca90Cd5
```

### Required Variable (Needs Configuration ⚠️)
```bash
# Admin wallet private key for deploying contracts
ADMIN_DEPLOYER_PRIVATE_KEY=0x1234567890abcdef...your_private_key
```

**⚠️ SECURITY WARNING:**
- Never commit your private key to version control
- Ensure `.env.local` is in your `.gitignore`
- Use a dedicated testnet wallet with only test ETH
- For production, use a secure key management system (AWS KMS, HashiCorp Vault, etc.)

### Getting Test ETH for Sepolia

1. Visit a Sepolia faucet:
   - https://sepoliafaucet.com/
   - https://www.alchemy.com/faucets/ethereum-sepolia
   - https://faucet.quicknode.com/ethereum/sepolia

2. Send 0.1-0.5 test ETH to your admin wallet address

3. Verify balance:
   ```bash
   # Check balance on Etherscan
   https://sepolia.etherscan.io/address/YOUR_ADMIN_ADDRESS
   ```

## 2. Start Development Server

```bash
cd apps/frontend
npm run dev
```

The server should start on `http://localhost:3000`

## 3. Test the Deployment Pipeline

### Option A: Using the Test Script (Recommended)

```bash
cd apps/frontend
node scripts/test-deployment.js
```

Or with custom parameters:
```bash
node scripts/test-deployment.js "my-submission-id" "ipfs://QmYourIPFSHash"
```

### Option B: Using curl

```bash
curl -X POST http://localhost:3000/api/admin/deploy-asset \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "test-001",
    "metadataURI": "ipfs://bafkreitest",
    "metadata": {
      "assetDetails": {
        "name": "Test Property",
        "type": "Real Estate"
      },
      "tokenization": {
        "tokenName": "Test Property Token",
        "tokenSymbol": "TPT",
        "totalSupply": "1000000"
      }
    }
  }'
```

### Option C: Using Postman/Insomnia

1. Import the request:
   - Method: `POST`
   - URL: `http://localhost:3000/api/admin/deploy-asset`
   - Headers: `Content-Type: application/json`
   - Body: (see curl example above)

## 4. Monitor Deployment Progress

### Console Logs

The deployment pipeline outputs detailed logs:

```
🚀 Starting deployment pipeline for submission test-001
📄 Metadata URI: ipfs://bafkreitest
🔐 Deploying from admin account: 0x1234...

📋 Step 1: Freezing metadata...
✅ Metadata frozen. CID is now immutable

🪙 Step 2: Deploying asset token...
📡 Token deployment tx: 0xabc123...
✅ Token deployed at: 0x5678...

💰 Step 3: Deploying income distribution contract...
✅ Income contract configured

🏊 Step 4: Deploying AMM pool...
📡 Pool deployment tx: 0xdef456...
✅ AMM pool deployed at: 0x9abc...

💧 Step 5: Initializing liquidity...
📝 Approving token spend...
✅ Token approval confirmed
💧 Adding liquidity to pool...
✅ Liquidity initialized: 1000 tokens + 0.01 ETH

🔮 Step 6: Verifying oracle feeds...
📊 Oracle price: 0 - Valid: false
🏦 Reserve amount: 0 - Valid: false
⚠️  Oracle verification failed - feeds may need manual registration

📊 Step 7: Marking for indexing...
✅ Asset marked for indexing

🏪 Step 8: Checking marketplace visibility conditions...
⚠️  Partial deployment - asset will NOT be visible in marketplace yet
Missing conditions:
  - Oracle not verified

🏁 Deployment pipeline complete
```

### Expected Behavior

✅ **Successful Steps:**
1. Metadata frozen
2. Token deployed (new address on Sepolia)
3. Income contract configured (existing shared contract)
4. AMM pool deployed (new address on Sepolia)
5. Liquidity initialized (1000 tokens + 0.01 ETH)
7. Asset indexed

⚠️ **Expected Partial Failures:**
6. Oracle verification - May fail if asset not yet registered with oracle contracts

### Verifying On-Chain

After deployment, verify on Sepolia Etherscan:

```bash
# Token Contract
https://sepolia.etherscan.io/address/{tokenAddress}

# AMM Pool Contract
https://sepolia.etherscan.io/address/{poolAddress}
```

Check:
- Contract verified and deployed
- Token supply minted to admin
- Pool has liquidity reserves
- Transactions in contract history

## 5. Troubleshooting

### Error: "Insufficient funds"
**Solution:** Add more test ETH to your admin wallet

### Error: "ADMIN_DEPLOYER_PRIVATE_KEY not set"
**Solution:** Add the private key to `.env.local`

### Error: "Transaction reverted"
**Possible causes:**
- Not enough gas
- Contract constructor parameters incorrect
- Admin wallet doesn't have enough token balance for liquidity

### Error: "Oracle verification failed"
**Expected behavior:** Oracle contracts may not have price feeds for newly deployed tokens. This is non-fatal - the asset deploys successfully but won't be marketplace-visible until oracle registration.

**Manual fix:** Register the token with oracle contracts using admin functions.

## 6. Production Deployment Checklist

Before deploying to production:

- [ ] Use secure key management (AWS KMS, HashiCorp Vault)
- [ ] Set up monitoring and alerting
- [ ] Configure mainnet RPC endpoints (Alchemy, Infura)
- [ ] Update contract addresses for mainnet
- [ ] Test with small amounts first
- [ ] Set up transaction retry logic
- [ ] Implement proper error handling and notifications
- [ ] Add rate limiting to prevent abuse
- [ ] Set up admin authentication/authorization
- [ ] Configure automatic oracle registration
- [ ] Set up indexer for marketplace visibility
- [ ] Test rollback procedures

## 7. Next Steps

1. ✅ Test deployment on Sepolia
2. Register deployed token with oracle contracts
3. Verify marketplace visibility
4. Test trading on AMM pool
5. Monitor gas costs and optimize
6. Deploy to production
