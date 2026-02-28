# 🚀 Algorand Frontend - Quick Start Guide

## ✅ Prerequisites Completed
- [x] AlgoKit installed
- [x] Algorand SDK installed
- [x] Sandbox testnet running
- [x] Frontend dependencies installed

---

## 🎯 Step 1: Get a Wallet & Testnet ALGO

### Option A: Pera Wallet (Mobile - Recommended)
```bash
# 1. Download Pera Wallet from App Store / Play Store
# 2. Create new account
# 3. Save 25-word recovery phrase securely
```

### Option B: Create Wallet Programmatically
```bash
cd algorand
python -c "from algosdk import account, mnemonic; pk, addr = account.generate_account(); mn = mnemonic.from_private_key(pk); print(f'Address: {addr}\nMnemonic: {mn}')"
```

**Save the output securely!**

### Get Free Testnet ALGO:
1. Visit: https://bank.testnet.algorand.network/
2. Paste your address
3. Click "Dispense"
4. Receive 10 ALGO in ~5 seconds

---

## 🎨 Step 2: Start the Frontend

```bash
cd apps/frontend
npm run dev
```

**Server will start at**: http://localhost:3000

---

## 🌐 Step 3: Access Algorand Demo

Open your browser and navigate to:
```
http://localhost:3000/algorand-demo
```

---

## 🔗 Step 4: Connect Your Wallet

### If using Pera Wallet (Mobile):
1. Click "Connect Algorand Wallet"
2. Select "Pera Wallet"
3. Scan QR code with Pera app
4. Approve connection
5. ✅ Connected!

### If using MyAlgo (Browser Extension):
1. Install MyAlgo extension
2. Import your wallet using 25-word mnemonic
3. Click "Connect Algorand Wallet"
4. Select "MyAlgo Wallet"
5. Approve connection
6. ✅ Connected!

---

## 🎮 Step 5: Try Features

### Feature 1: Send ALGO Payment
```
1. Go to "Send Payment" tab
2. Enter receiver address
3. Enter amount (e.g., 0.5 ALGO)
4. Add note: "Test payment 🚀"
5. Click "Send Payment"
6. Confirm in wallet
7. Transaction confirmed in ~4.5 seconds!
```

**Cost**: 0.001 ALGO (~$0.0002)

---

### Feature 2: Create Campus Asset Token
```
1. Go to "Manage Assets" tab
2. Fill in form:
   - Asset Name: "Dorm Room 301"
   - Unit Name: "DORM301"
   - Total Supply: 1000
   - Decimals: 0
3. Click "Create Asset"
4. Confirm in wallet
5. Asset created!
6. View on explorer
```

**Cost**: 0.001 ALGO
**Result**: New ASA with ID (e.g., 123456789)

---

### Feature 3: Opt-in to Asset
```
1. Get asset ID from creation or friend
2. Go to "Manage Assets" → "Opt-in to Asset"
3. Enter asset ID
4. Click "Opt-in to Asset"
5. Confirm in wallet
```

**Cost**: 0.001 ALGO + 0.1 ALGO minimum balance increase
**Why?**: Prevents spam - you must explicitly accept assets

---

### Feature 4: Transfer Asset
```
1. Go to "Manage Assets" → "Transfer Asset"
2. Enter:
   - Asset ID: (your created asset)
   - Receiver: (friend's address who opted-in)
   - Amount: 10
3. Click "Transfer Asset"
4. Confirm in wallet
```

**Cost**: 0.001 ALGO

---

### Feature 5: View Your Assets
```
1. Go to "My Assets" tab
2. See all assets you own
3. Click "View →" to see on explorer
```

---

## 📊 What You'll See

### After Connecting:
```
╔══════════════════════════════════════╗
║  Algorand Demo                       ║
║  Network: TESTNET                    ║
║                                      ║
║  Balance: 10.00 ALGO                 ║
║  Assets Owned: 0                     ║
║  Network Fee: 0.001 ALGO             ║
╚══════════════════════════════════════╝
```

### After Creating Dorm Token:
```
Asset Created!
Asset ID: 176395983
View on AlgoExplorer →
```

---

## 🧪 Campus Use Case Examples

### Example 1: Tokenize Dorm Room
```
Asset Name: "Dorm Room 301 - Spring Semester"
Unit Name: "DORM301"
Total: 1000 tokens
Price: 0.1 ALGO per token

Result: 
- Students buy tokens → own % of room
- Rental income distributed proportionally
- Tradeable on marketplace
```

### Example 2: Gym Membership Pass
```
Asset Name: "Campus Gym - Monthly Pass"
Unit Name: "GYMPASS"
Total: 500 tokens
Decimals: 0 (NFT-style)

Features:
- Each token = 1 gym pass
- Non-divisible (decimals=0)
- Transferable to friends
```

### Example 3: Course Certificate NFT
```
Asset Name: "CS450 - Blockchain Certificate"
Unit Name: "CS450"
Total: 1 (NFT)
Decimals: 0
URL: "ipfs://QmXXX..." (certificate metadata)

Result:
- Unique achievement NFT
- Verifiable on-chain
- Can't be forged
```

---

## 🔍 View Transactions

### On AlgoExplorer:
```
https://testnet.algoexplorer.io/address/[YOUR_ADDRESS]
```

### What you'll see:
- All transactions
- Asset holdings
- ALGO balance
- Transaction times (~4.5s)
- Network fees (0.001 ALGO)

---

## 🎓 Tutorials (Progressive Learning)

### Tutorial 1: Getting Started (15 min)
```bash
# Location: algorand/tutorials/01-getting-started.md
Topics: Wallet creation, payments, verification
Difficulty: ⭐ Easy
```

### Tutorial 2: Create Tokens (30 min)
```bash
# Location: algorand/tutorials/02-create-tokens.md
Topics: ASA creation, opt-in, transfers
Difficulty: ⭐⭐ Intermediate
```

### Tutorial 3: NFT Credentials (45 min)
```bash
# Location: algorand/tutorials/03-nft-credentials.md
Topics: NFT minting, ARC-3 standard, batch minting
Difficulty: ⭐⭐⭐ Intermediate-Advanced
```

---

## 🐛 Troubleshooting

### Problem: "Wallet not connecting"
```bash
# Solution:
1. Check wallet app is installed
2. For mobile: Ensure WalletConnect is enabled
3. For browser: Refresh page
4. Try different wallet provider
```

### Problem: "Insufficient balance"
```bash
# Solution:
Visit testnet faucet: https://bank.testnet.algorand.network/
Request more ALGO (can request every 24 hours)
```

### Problem: "Asset transfer failed"
```bash
# Solution:
Receiver must opt-in to asset first!
Cost to opt-in: 0.001 ALGO + 0.1 ALGO min balance
```

### Problem: "Transaction rejected"
```bash
# Check:
1. Do you have enough ALGO for transaction + fee?
2. Is receiver address valid (58 characters)?
3. For assets: Did receiver opt-in?
4. Network connected? (testnet.algoexplorer.io accessible)
```

---

## 📱 Multi-Chain Integration

### Switch Between Chains:
```
The platform now supports both:
1. Ethereum (Sepolia) - For existing features
2. Algorand (Testnet) - For new fast/cheap features

Use the chain selector to switch!
```

### When to use which?
```
Ethereum:
✅ Complex DeFi operations
✅ Wide adoption
✅ Existing infrastructure

Algorand:
✅ Fast payments (4.5s vs 12s)
✅ Low cost ($0.0002 vs $2-50)
✅ Student-friendly
✅ Campus use cases
```

---

## 🚀 Next Steps

### For Developers:
```bash
# 1. Deploy smart contracts
cd algorand
export DEPLOYER_MNEMONIC="your 25 words here"
python scripts/deploy.py --network testnet

# 2. Update contract IDs in .env.local
NEXT_PUBLIC_ASSET_REGISTRY_ID=[deployed_id]
NEXT_PUBLIC_NFT_CREDENTIAL_ID=[deployed_id]
# etc...

# 3. Integrate with existing features
# See: apps/frontend/src/components/algorand/
```

### For Users:
```
1. ✅ Complete Tutorial 1-3
2. ✅ Create your first asset token
3. ✅ Mint a credential NFT
4. ✅ Trade on marketplace
5. ✅ Join crowdfunding campaign
```

---

## 📚 Resources

### Documentation:
- [Algorand Docs](https://developer.algorand.org/)
- [PyTeal Guide](https://pyteal.readthedocs.io/)
- [ASA Standards](https://developer.algorand.org/docs/get-details/asa/)

### Wallets:
- [Pera Wallet](https://perawallet.app/)
- [Defly Wallet](https://defly.app/)
- [MyAlgo](https://wallet.myalgo.com/)

### Tools:
- [Testnet Faucet](https://bank.testnet.algorand.network/)
- [AlgoExplorer](https://testnet.algoexplorer.io/)
- [AlgoKit](https://developer.algorand.org/algokit/)

### Community:
- [Discord](https://discord.gg/algorand)
- [Forum](https://forum.algorand.org/)
- [Twitter](https://twitter.com/algorand)

---

## ✨ Demo Checklist

Before showing to judges:

- [ ] Wallet connected (Pera/Defly/MyAlgo)
- [ ] Balance > 1 ALGO
- [ ] Created at least 1 asset token
- [ ] Opted-in and transferred asset
- [ ] Viewed transactions on explorer
- [ ] Understand ~4.5s confirmation time
- [ ] Understand 0.001 ALGO fee

**Pro tip**: Create demo assets beforehand with cool names!

---

## 🎉 You're Ready!

Your multi-chain asset tokenization platform now supports:
- ✅ Ethereum (Existing features)
- ✅ Algorand (New fast/cheap features)
- ✅ Wallet integration (5+ wallet providers)
- ✅ Payment transactions
- ✅ Asset tokenization
- ✅ NFT credentials
- ✅ P2P marketplace
- ✅ Crowdfunding

**Access the demo**: http://localhost:3000/algorand-demo

**Questions?** Check [WALLET_SETUP.md](WALLET_SETUP.md) or [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

**Happy tokenizing! 🚀🎓**
