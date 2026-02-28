# 🚀 Algorand TestNet Deployment Guide

## Step 1: Fund Your TestNet Account ✅

**Account Address:** `CZBNQWHGVNNRRMSDTJPZVFGQY6QDEVGVTAX77H745WJAKQCZAHPJJ7HE6A`

**Mnemonic (SAVE THIS SECURELY):**
```
dice naive industry poet dash laundry exact chef tuna caution legal pipe indicate melt judge envelope chaos surround code embody drill wealth salt drip
```

### Get TestNet ALGO:
1. Visit: **https://bank.testnet.algorand.network/**
2. Paste the address: `CZBNQWHGVNNRRMSDTJPZVFGQY6QDEVGVTAX77H745WJAKQCZAHPJJ7HE6A`
3. Complete captcha
4. Click "Dispense"
5. You'll receive **10 TestNet ALGO** (enough for all deployments)

---

## Step 2: Create Test ASA 📦

After funding, run:
```bash
cd "c:\Asset Tokenization\algorand\scripts"

python create_asa.py \
  --network testnet \
  --creator-mnemonic "dice naive industry poet dash laundry exact chef tuna caution legal pipe indicate melt judge envelope chaos surround code embody drill wealth salt drip" \
  --asset-name "Campus Dorm Room 301" \
  --unit-name "CDR301" \
  --total 10000 \
  --url "https://asset-linked-c4ef2.web.app" \
  --decimals 0
```

**Expected Output:** ASA ID (e.g., 123456789)

---

## Step 3: Deploy Smart Contracts 🔷

### 3A. Deploy Verification Contract
```bash
python deploy_verification.py \
  --network testnet \
  --creator-mnemonic "dice naive industry poet dash laundry exact chef tuna caution legal pipe indicate melt judge envelope chaos surround code embody drill wealth salt drip"
```
**Expected Output:** `appId` (e.g., 111111111)

### 3B. Deploy Income Distribution Contract
```bash
python deploy_income.py \
  --network testnet \
  --creator-mnemonic "dice naive industry poet dash laundry exact chef tuna caution legal pipe indicate melt judge envelope chaos surround code embody drill wealth salt drip" \
  --asa-id <YOUR_ASA_ID>
```
**Expected Output:** `appId` (e.g., 222222222)

### 3C. Deploy Governance Contract
```bash
python deploy_governance.py \
  --network testnet \
  --creator-mnemonic "dice naive industry poet dash laundry exact chef tuna caution legal pipe indicate melt judge envelope chaos surround code embody drill wealth salt drip" \
  --asa-id <YOUR_ASA_ID>
```
**Expected Output:** `appId` (e.g., 333333333)

---

## Step 4: Configure Environment Variables 🔧

### Backend (.env)
Create/update `apps/backend/.env`:
```env
# Algorand Configuration
ALGORAND_NETWORK=testnet
ADMIN_ALGORAND_MNEMONIC=dice naive industry poet dash laundry exact chef tuna caution legal pipe indicate melt judge envelope chaos surround code embody drill wealth salt drip
ADMIN_ALGORAND_ADDRESS=CZBNQWHGVNNRRMSDTJPZVFGQY6QDEVGVTAX77H745WJAKQCZAHPJJ7HE6A

# Smart Contract App IDs (replace with your deployed IDs)
VERIFICATION_APP_ID=<VERIFICATION_APP_ID>
INCOME_APP_ID=<INCOME_APP_ID>
GOVERNANCE_APP_ID=<GOVERNANCE_APP_ID>

# Test ASA ID
TEST_ASA_ID=<YOUR_ASA_ID>
```

### Frontend (.env.local)
Update `apps/frontend/.env.local`:
```env
# Existing config...
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
```

---

## Step 5: Test End-to-End Flow 🧪

### Test 1: Wallet Connection
1. Open: http://localhost:3000/algorand-demo
2. Connect Pera Wallet (scan QR code)
3. Verify connection successful

### Test 2: ASA Creation
1. Go to: http://localhost:3000/list-asset
2. Fill asset form (Campus Gym Equipment)
3. Submit → Check console for ASA ID
4. Verify on AlgoExplorer

### Test 3: Verification
1. Go to: http://localhost:3000/admin/verification
2. See pending assets
3. Click "Verify" → Confirm transaction
4. Check AlgoExplorer for verification TX

### Test 4: Buy Fractions
1. Go to: http://localhost:3000/marketplace
2. Click asset with ASA badge
3. Click "Buy Fraction" button
4. Enter units → Confirm atomic swap
5. Verify on AlgoExplorer

### Test 5: Income Distribution
1. Admin deposits 5 ALGO to income contract
2. Holder navigates to asset page
3. Clicks "Claim Income"
4. Receives proportional ALGO
5. Verify on AlgoExplorer

### Test 6: Governance
1. Admin creates "Pause Trading" proposal
2. Holders vote (weighted by ASA balance)
3. After deadline, execute if passed
4. Verify contract state change

---

## Step 6: Remove Mock Data 🧹

Files to clean:
- `apps/frontend/src/app/admin/verification/page.tsx` - Remove mock pendingAssets
- `apps/frontend/src/components/algorand/ClaimIncomeButton.tsx` - Connect to real contract state
- Any hardcoded ASA IDs in components

---

## Cost Breakdown 💰

All operations on TestNet (FREE):
- Create ASA: ~0.001 ALGO
- Deploy Verification: ~0.002 ALGO
- Deploy Income: ~0.002 ALGO
- Deploy Governance: ~0.002 ALGO
- Verify Asset: ~0.001 ALGO
- Atomic Swap: ~0.002 ALGO
- Claim Income: ~0.001 ALGO
- Vote: ~0.001 ALGO

**Total for full testing: ~0.5 ALGO** (out of 10 ALGO dispensed)

---

## Troubleshooting 🔧

### Error: "overspend"
→ Account not funded. Visit TestNet dispenser.

### Error: "application does not exist"
→ App ID not deployed or wrong network.

### Error: "invalid mnemonic"
→ Check mnemonic has exactly 25 words.

### Error: "box not found"
→ First operation on box storage needs extra funds.

---

## AlgoExplorer Links 🔗

- **Account:** https://testnet.algoexplorer.io/address/CZBNQWHGVNNRRMSDTJPZVFGQY6QDEVGVTAX77H745WJAKQCZAHPJJ7HE6A
- **ASA:** https://testnet.algoexplorer.io/asset/<YOUR_ASA_ID>
- **Verification Contract:** https://testnet.algoexplorer.io/application/<VERIFICATION_APP_ID>
- **Income Contract:** https://testnet.algoexplorer.io/application/<INCOME_APP_ID>
- **Governance Contract:** https://testnet.algoexplorer.io/application/<GOVERNANCE_APP_ID>

---

## Next Steps After Testing ✅

1. ✅ Verify all transactions on AlgoExplorer
2. ✅ Test with multiple accounts
3. ✅ Export audit CSV reports
4. ✅ Document any bugs
5. ✅ Prepare 5-minute demo video
6. ✅ Submit to hackathon with TestNet links

**🏆 Ready for Algorand x Encode AI Hackathon!**
