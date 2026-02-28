# 🚀 Algorand Wallet Setup Guide

## Quick Wallet Setup (3 Minutes)

### Option 1: Pera Wallet (Recommended - Mobile)

1. **Download Pera Wallet**
   - iOS: https://apps.apple.com/app/pera-algo-wallet/id1459898525
   - Android: https://play.google.com/store/apps/details?id=com.algorand.android

2. **Create New Wallet**
   - Open app → "Create a new account"
   - Write down your 25-word recovery phrase (CRITICAL - keep secure!)
   - Set a PIN code

3. **Get Testnet ALGO** (for development)
   - Visit: https://bank.testnet.algorand.network/
   - Paste your wallet address
   - Click "Dispense"
   - Receive 10 ALGO (~5 seconds)

4. **Connect to Website**
   - Open your browser
   - Navigate to the demo page
   - Click "Connect Algorand Wallet"
   - Select "Pera Wallet"
   - Scan QR code or use WalletConnect

---

### Option 2: Defly Wallet (Mobile)

1. **Download Defly Wallet**
   - iOS: https://apps.apple.com/app/defly-wallet/id1593055973
   - Android: https://play.google.com/store/apps/details?id=com.defly.app

2. **Create Wallet & Fund** (same as Pera above)

3. **Connect** via WalletConnect

---

### Option 3: MyAlgo Wallet (Browser Extension)

1. **Install Extension**
   - Chrome: https://chrome.google.com/webstore (search "MyAlgo")
   - Firefox: https://addons.mozilla.org (search "MyAlgo")

2. **Create Account**
   - Click extension icon → "Create Account"
   - Save 25-word passphrase securely
   - Set password

3. **Fund** via testnet faucet (link above)

4. **Connect** - automatically detected by website

---

## Test Your Wallet

### Step 1: Check Balance
```bash
# Your wallet should show:
Balance: 10.00 ALGO (after faucet)
```

### Step 2: Send Test Payment
1. Copy a friend's address (or use a second wallet)
2. Send 0.1 ALGO with note "Test payment"
3. Transaction confirmed in ~4.5 seconds ⚡
4. Fee: 0.001 ALGO (~$0.0002)

### Step 3: View on Explorer
Visit: https://testnet.algoexplorer.io/
Search your address to see transaction history

---

## Connect to Demo App

### Start Frontend:
```bash
cd apps/frontend
npm run dev
```

### Navigate to Demo:
```
http://localhost:3000/algorand-demo
```

### Connect Wallet:
1. Click "Connect Algorand Wallet"
2. Choose your wallet (Pera/Defly/MyAlgo)
3. Approve connection
4. ✅ Connected!

---

## Try These Features:

### 1. Send ALGO Payment
- Receiver: [Friend's address]
- Amount: 0.5 ALGO
- Note: "Coffee money ☕"

### 2. Create Campus Asset Token
- Name: "Dorm Room 301"
- Unit: "DORM301"
- Total: 1000
- Decimals: 0
- Cost: 0.001 ALGO

### 3. Opt-in to Asset
- Get asset ID from creation
- Opt-in (required before receiving)
- Cost: 0.001 ALGO + 0.1 ALGO min balance

### 4. Transfer Assets
- Asset ID: [Your created asset]
- Receiver: [Friend who opted-in]
- Amount: 10

---

## Troubleshooting

### Problem: "Insufficient balance"
**Solution**: Visit https://bank.testnet.algorand.network/ to get more testnet ALGO

### Problem: "Asset transfer failed"
**Solution**: Receiver must opt-in to the asset first

### Problem: "Wallet not connecting"
**Solution**: 
- Clear browser cache
- Reinstall wallet app
- Try different wallet provider

### Problem: "Transaction rejected"
**Solution**: Check you have enough ALGO for:
- Transaction amount
- Network fee (0.001 ALGO)
- Minimum balance requirements

---

## Security Notes

### ✅ DO:
- Write down your 25-word recovery phrase on paper
- Store it in a secure location (safe, vault)
- Never share your private key
- Use testnet for learning

### ❌ DON'T:
- Screenshot your recovery phrase
- Store it digitally (email, cloud, notes app)
- Share it with anyone
- Use mainnet funds for testing

---

## Mainnet vs Testnet

| Feature | Testnet | Mainnet |
|---------|---------|---------|
| **Purpose** | Development & testing | Production |
| **ALGO Value** | Free (no real value) | Real money |
| **Network** | `testnet` | `mainnet` |
| **Faucet** | ✅ Free ALGO | ❌ Must buy |
| **Explorer** | testnet.algoexplorer.io | algoexplorer.io |

**⚠️ Important**: Always use testnet for learning and development!

---

## Next Steps

After wallet setup, try:
1. ✅ [Tutorial 1: Getting Started](../../algorand/tutorials/01-getting-started.md)
2. ✅ [Tutorial 2: Create Tokens](../../algorand/tutorials/02-create-tokens.md)
3. ✅ [Tutorial 3: NFT Credentials](../../algorand/tutorials/03-nft-credentials.md)

---

## Resources

- **Wallet Comparison**: https://www.algorand.foundation/ecosystem/wallets
- **Pera Docs**: https://docs.perawallet.app/
- **Defly Docs**: https://defly.app/docs
- **Algorand Faucet**: https://bank.testnet.algorand.network/
- **Explorer**: https://testnet.algoexplorer.io/
- **Discord**: https://discord.gg/algorand

---

**Ready? Let's tokenize some assets! 🚀**
