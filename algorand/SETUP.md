# Algorand Development Environment Setup

## Quick Setup Guide

### 1. Install Dependencies

#### Python (for smart contracts):
```bash
pip install pyteal py-algorand-sdk
```

#### Node.js (for frontend):
```bash
npm install algosdk @txnlab/use-wallet
```

#### AlgoKit (recommended):
```bash
pip install algokit
algokit --version
```

---

### 2. Setup Algorand Sandbox (Local Testnet)

```bash
# Clone sandbox
git clone https://github.com/algorand/sandbox.git
cd sandbox

# Start testnet
./sandbox up testnet

# Check status
./sandbox status

# Get testnet account
./sandbox goal account list
```

---

### 3. Create Deployer Account

```bash
# Generate new account
python -c "from algosdk import account, mnemonic; pk, addr = account.generate_account(); mn = mnemonic.from_private_key(pk); print(f'Address: {addr}\nMnemonic: {mn}')"
```

**Save the mnemonic securely!**

---

### 4. Fund Account

#### Testnet:
Visit: https://bank.testnet.algorand.network/

#### Sandbox:
```bash
./sandbox goal clerk send -a 10000000 -f [SANDBOX_ACCOUNT] -t [YOUR_ADDRESS]
```

---

### 5. Compile Contracts

```bash
cd algorand

# Compile all
python contracts/asset_registry.py
python contracts/nft_credential.py
python contracts/escrow.py
python contracts/crowdfunding.py

# Check build directory
ls contracts/build/
```

---

### 6. Deploy Contracts

#### Set deployer mnemonic:
```bash
export DEPLOYER_MNEMONIC="word1 word2 word3 ... word25"
```

#### Deploy to testnet:
```bash
python scripts/deploy.py --network testnet
```

#### Deploy to sandbox:
```bash
python scripts/deploy.py --network sandbox
```

---

### 7. Verify Deployment

Check `deployed_testnet.json`:
```json
{
  "asset_registry": 123456789,
  "nft_credential": 123456790,
  "escrow": 123456791,
  "crowdfunding": 123456792
}
```

View on explorer:
```
https://testnet.algoexplorer.io/application/[APP_ID]
```

---

### 8. Run Frontend

```bash
cd apps/algorand-frontend
npm install
npm run dev
```

Open: http://localhost:3000

---

## Environment Variables

Create `.env.local`:
```env
# Network
NEXT_PUBLIC_ALGORAND_NETWORK=testnet

# Contract IDs (from deployed_testnet.json)
NEXT_PUBLIC_ASSET_REGISTRY_ID=123456789
NEXT_PUBLIC_NFT_CREDENTIAL_ID=123456790
NEXT_PUBLIC_ESCROW_ID=123456791
NEXT_PUBLIC_CROWDFUNDING_ID=123456792

# API endpoints
NEXT_PUBLIC_ALGOD_SERVER=https://testnet-api.algonode.cloud
NEXT_PUBLIC_INDEXER_SERVER=https://testnet-idx.algonode.cloud
```

---

## Troubleshooting

### Problem: "pyteal module not found"
```bash
pip install --upgrade pyteal
```

### Problem: "Insufficient balance"
Fund your account:
- Testnet: https://bank.testnet.algorand.network/
- Sandbox: Use goal clerk send

### Problem: "Contract compilation failed"
Check Python version:
```bash
python --version  # Should be 3.8+
```

### Problem: "Transaction rejected"
- Ensure you're on correct network
- Check account has ALGOs for fees
- Verify contract ABI matches

---

## Development Workflow

1. **Write contract** → `contracts/*.py`
2. **Compile** → `python contracts/*.py`
3. **Deploy** → `python scripts/deploy.py`
4. **Test** → `pytest tests/`
5. **Integrate** → Update frontend with contract IDs

---

## Useful Commands

### Check balance:
```python
from utils.algorand_sdk import AlgorandClient
client = AlgorandClient("testnet")
balance = client.get_balance("YOUR_ADDRESS")
print(f"{balance / 1_000_000} ALGO")
```

### View account info:
```bash
./sandbox goal account info -a [ADDRESS]
```

### Read contract state:
```bash
./sandbox goal app info --app-id [APP_ID]
```

### Call contract:
```bash
./sandbox goal app call --app-id [APP_ID] --from [CALLER] --app-arg "str:method_name"
```

---

## Next Steps

- ✅ [Tutorial 1: Getting Started](tutorials/01-getting-started.md)
- ✅ [Tutorial 2: Create Tokens](tutorials/02-create-tokens.md)
- ✅ [Tutorial 3: NFT Credentials](tutorials/03-nft-credentials.md)
- ✅ [Tutorial 4: Smart Contracts](tutorials/04-smart-contracts.md)

---

**Need Help?**
- Discord: https://discord.gg/algorand
- Docs: https://developer.algorand.org/
- Forum: https://forum.algorand.org/
