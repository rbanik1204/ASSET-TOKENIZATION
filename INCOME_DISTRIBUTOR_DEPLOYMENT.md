# Deploying the IncomeDistributor Contract

## Prerequisites

You need to install Foundry (the Solidity development toolkit). Choose one method:

### Option 1: Using Foundryup (Recommended)
```powershell
# Install Foundryup from https://book.getfoundry.sh/getting-started/installation
# Then run:
foundryup
```

### Option 2: Using Cargo (Rust package manager)
```powershell
cargo install --git https://github.com/foundry-rs/foundry foundry-cli anvil cast forge
```

### Option 3: Download Pre-built Binaries
Download from: https://github.com/foundry-rs/foundry/releases

---

## Deployment Steps

Once Foundry is installed, follow these steps:

### 1. Make sure Anvil (local testnet) is running
```powershell
cd "C:\Asset Tokenization\contracts"
anvil
```

Keep this terminal open. Anvil will run on `http://127.0.0.1:8545`.

### 2. Deploy the contracts (in a new terminal)
```powershell
cd "C:\Asset Tokenization\contracts"
forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

This will:
- Deploy all contracts including the new `IncomeDistributor`
- Write contract addresses to `apps/frontend/.env.contracts.local`
- Display deployed addresses in the console

### 3. Copy contract addresses to frontend config
```powershell
# Copy the auto-generated env file to your local config
cp apps/frontend/.env.contracts.local apps/frontend/.env.local

# Or merge it if you already have .env.local:
cat apps/frontend/.env.contracts.local >> apps/frontend/.env.local
```

### 4. Start the indexer
```powershell
npm run indexer:dev
```

Keep this running. It will poll the blockchain and update `.data/indexer.json`.

### 5. Start the frontend
```powershell
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## Verification

1. Connect your wallet (use one of the Anvil test accounts)
2. Go to the **Income** page
3. You should see your assets listed
4. Click **Claim** on any asset to test the contract integration

**Note:** Since income distribution is new, you'll need to manually deposit income first:

```powershell
# Using cast to deposit test income
cast send $INCOME_DISTRIBUTOR_ADDRESS \
  "depositIncome(address,address,uint256)" \
  $ASSET_TOKEN_ADDRESS \
  0x0000000000000000000000000000000000000000 \
  0 \
  --value 1ether \
  --private-key $PRIVATE_KEY \
  --rpc-url http://127.0.0.1:8545
```

Replace:
- `$INCOME_DISTRIBUTOR_ADDRESS` with the deployed IncomeDistributor address
- `$ASSET_TOKEN_ADDRESS` with an asset token address
- `$PRIVATE_KEY` with the Anvil deployer private key (check `.env` in contracts folder)

---

## Next Steps

After successful deployment and testing:

1. **Update the indexer** to read `IncomeClaimed` and `IncomeDeposited` events from the contract (instead of computing placeholder income off-chain)
2. **Create an admin UI** for depositing income (`depositIncome()` function)
3. **Deploy to Sepolia testnet** for public testing
4. **Proceed to Week 2 tasks**: FinalSaleContract and AssetApprovalQueue contracts
