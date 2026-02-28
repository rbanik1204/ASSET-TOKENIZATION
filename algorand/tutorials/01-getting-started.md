# Getting Started with Algorand

## Tutorial 1: Create Your First Wallet and Send a Payment

### Objectives
- Create an Algorand wallet
- Fund it with testnet ALGOs
- Send your first payment transaction
- Check balance and transaction history

### Prerequisites
- Python 3.8+ or Node.js 18+
- Internet connection

---

## Step 1: Create a Wallet

### Using Python:
```python
from utils.algorand_sdk import AlgorandClient

# Initialize client
client = AlgorandClient("testnet")

# Create new wallet
wallet = client.create_wallet()

print(f"Your Address: {wallet['address']}")
print(f"Your Mnemonic: {wallet['mnemonic']}")
print("\n⚠️  SAVE YOUR MNEMONIC SECURELY!")
```

### Using JavaScript:
```javascript
import algosdk from 'algosdk';

// Generate account
const account = algosdk.generateAccount();
const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

console.log("Address:", account.addr);
console.log("Mnemonic:", mnemonic);
console.log("\n⚠️  SAVE YOUR MNEMONIC SECURELY!");
```

**Output:**
```
Your Address: ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX1234YZAB5678
Your Mnemonic: word1 word2 word3 ... word25

⚠️  SAVE YOUR MNEMONIC SECURELY!
```

---

## Step 2: Fund Your Wallet

### Get Testnet ALGOs (FREE)
1. Copy your address from Step 1
2. Visit: **https://bank.testnet.algorand.network/**
3. Paste your address
4. Click "Dispense"
5. You'll receive 10 ALGO (~30 seconds)

### Verify Balance:
```python
balance = client.get_balance(wallet['address'])
print(f"Balance: {balance / 1_000_000} ALGO")
```

Expected: `Balance: 10.0 ALGO`

---

## Step 3: Send Your First Payment

### Send ALGO to Another Address:
```python
# Example receiver (use your friend's address)
receiver = "RECEIVER_ADDRESS_HERE"

# Send 1 ALGO (1,000,000 microAlgos)
tx_id = client.send_payment(
    sender_private_key=wallet['private_key'],
    receiver=receiver,
    amount=1_000_000,  # 1 ALGO
    note="My first Algorand transaction!"
)

print(f"Transaction ID: {tx_id}")
print(f"View on AlgoExplorer: https://testnet.algoexplorer.io/tx/{tx_id}")
```

**Transaction Details:**
- **Amount**: 1 ALGO
- **Fee**: 0.001 ALGO (automatic)
- **Confirmation**: ~4.5 seconds
- **Note**: "My first Algorand transaction!"

---

## Step 4: Check Transaction History

### View on AlgoExplorer:
```
https://testnet.algoexplorer.io/address/YOUR_ADDRESS
```

### Programmatically:
```python
import algosdk

# Get account info
account_info = client.algod_client.account_info(wallet['address'])

print(f"Balance: {account_info['amount'] / 1_000_000} ALGO")
print(f"Total Transactions: {account_info.get('total-apps-opted-in', 0) + account_info.get('total-assets-opted-in', 0)}")
```

---

## 🎯 Challenge: Campus Coffee Payment

**Scenario**: You want to buy coffee from your campus café using ALGO.

### Task:
1. Create 2 wallets: "Student" and "Café"
2. Fund student wallet with testnet ALGO
3. Student sends 0.5 ALGO to café for coffee
4. Add note: "Coffee - Latte"
5. Verify transaction on AlgoExplorer

### Solution:
```python
# Create wallets
student = client.create_wallet()
cafe = client.create_wallet()

# Fund student (use testnet faucet)
print("Fund student:", student['address'])

# Wait for funding...
input("Press Enter after funding...")

# Buy coffee
tx_id = client.send_payment(
    sender_private_key=student['private_key'],
    receiver=cafe['address'],
    amount=500_000,  # 0.5 ALGO
    note="Coffee - Latte ☕"
)

print(f"✅ Payment sent! TX: {tx_id}")
print(f"Café balance: {client.get_balance(cafe['address']) / 1_000_000} ALGO")
```

---

## 📚 Key Concepts Learned

### Algorand Wallet
- **Address**: Public identifier (58 characters)
- **Private Key**: Secret key for signing (DO NOT SHARE)
- **Mnemonic**: 25-word backup phrase

### Transactions
- **Atomic**: Confirmed in ~4.5 seconds
- **Low Cost**: 0.001 ALGO fee
- **Notes**: Can attach text/data (up to 1KB)

### MicroAlgos
- 1 ALGO = 1,000,000 microAlgos
- Always use microAlgos in code
- Convert for display: `microAlgos / 1_000_000`

---

## ✅ Quiz

1. **How many words are in an Algorand mnemonic?**
   - A) 12
   - B) 24
   - C) 25 ✅
   - D) 32

2. **What is the transaction fee on Algorand?**
   - A) 0.0001 ALGO
   - B) 0.001 ALGO ✅
   - C) 0.01 ALGO
   - D) Variable (gas)

3. **How long does confirmation take?**
   - A) ~4.5 seconds ✅
   - B) ~15 seconds
   - C) ~60 seconds
   - D) ~10 minutes

---

## 🚀 Next Steps

**Ready for more?** Continue to:
- **Tutorial 2**: Create Algorand Standard Assets (ASAs)
- **Tutorial 3**: Build a Student Credential NFT System
- **Tutorial 4**: Deploy Your First Smart Contract

---

## 🆘 Troubleshooting

### Problem: "Insufficient balance"
**Solution**: Fund your wallet at https://bank.testnet.algorand.network/

### Problem: "Transaction rejected"
**Solution**: 
- Check receiver address is valid (58 chars, starts with A-Z)
- Ensure you have > 0.001 ALGO for fees
- Verify you're on testnet

### Problem: "Invalid private key"
**Solution**: Use `private_key`, not `mnemonic` in transactions

---

## 📖 Additional Resources

- **Algorand Developer Docs**: https://developer.algorand.org/
- **AlgoKit**: https://developer.algorand.org/docs/get-started/algokit/
- **Testnet Explorer**: https://testnet.algoexplorer.io/
- **Discord Community**: https://discord.gg/algorand

---

**Estimated Time**: 15-20 minutes  
**Difficulty**: ⭐ Easy (Beginner)  
**Prerequisites**: None
