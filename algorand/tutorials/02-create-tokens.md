# Tutorial 2: Create Campus Asset Tokens (ASAs)

## Objectives
- Understand Algorand Standard Assets (ASAs)
- Create a campus asset token (dorm room shares)
- Transfer tokens between students
- Understand opt-in mechanism

---

## What are ASAs?

**Algorand Standard Assets (ASAs)** are native Layer-1 tokens with built-in features:
- ✅ Low cost (0.001 ALGO to create)
- ✅ Fast transactions (~4.5s)
- ✅ Clawback (reclaim tokens)
- ✅ Freeze (pause transfers)
- ✅ Manager (modify settings)
- ✅ Perfect for real-world assets!

---

## Campus Use Case: Dorm Room Tokenization

**Problem**: Dorm rooms are expensive, students can't afford full ownership.

**Solution**: Tokenize dorm room → 1000 ASA tokens
- Students buy tokens (e.g., 100 tokens = 10% ownership)
- Earn rental income proportional to ownership
- Trade tokens on marketplace

---

## Step 1: Create a Dorm Room Token

### Code:
```python
from utils.algorand_sdk import AlgorandClient

# Initialize
client = AlgorandClient("testnet")

# Use your wallet from Tutorial 1
creator_private_key = "YOUR_PRIVATE_KEY"

# Create ASA
asset_id = client.create_asa(
    creator_private_key=creator_private_key,
    asset_name="Dorm Room 301",
    unit_name="DORM301",
    total=1000,  # 1000 shares
    decimals=0,  # No fractional shares
    url="ipfs://QmDormRoom301Metadata",
    manager=None,  # Immutable
    reserve=None,
    freeze=None,  # No freeze
    clawback=None  # No clawback
)

print(f"✅ Created Dorm Token: {asset_id}")
print(f"View: https://testnet.algoexplorer.io/asset/{asset_id}")
```

### Parameters Explained:
- **asset_name**: Human-readable name (max 32 bytes)
- **unit_name**: Ticker symbol (max 8 bytes)
- **total**: Total token supply (cannot change if manager=None)
- **decimals**: 0 = no fractions, 18 = like Ethereum
- **url**: Metadata link (IPFS recommended)
- **manager**: Can modify manager/reserve/freeze/clawback
- **reserve**: Receives uncirculated supply
- **freeze**: Can freeze account holdings
- **clawback**: Can reclaim tokens

---

## Step 2: Opt-In to Receive Tokens

**CRITICAL**: On Algorand, accounts must **opt-in** before receiving any ASA.

### Why Opt-In?
- Prevents spam
- User consent required
- Increases minimum balance (0.1 ALGO per ASA)

### Code:
```python
# Student wallet
student_private_key = "STUDENT_PRIVATE_KEY"

# Opt-in to dorm token
client.opt_in_asset(
    account_private_key=student_private_key,
    asset_id=asset_id
)

print(f"✅ Student opted-in to asset {asset_id}")
```

**Cost**: 0.1 ALGO minimum balance increase (refundable when opted-out)

---

## Step 3: Transfer Tokens

### Transfer Shares to Student:
```python
# Creator transfers 100 tokens to student
student_address = "STUDENT_ADDRESS"

tx_id = client.send_asset(
    sender_private_key=creator_private_key,
    receiver=student_address,
    asset_id=asset_id,
    amount=100  # 10% ownership (100/1000)
)

print(f"✅ Transferred 100 DORM301 tokens")
print(f"TX: https://testnet.algoexplorer.io/tx/{tx_id}")
```

### Verify Balance:
```python
# Get student's asset holdings
account_info = client.algod_client.account_info(student_address)

for asset in account_info.get('assets', []):
    if asset['asset-id'] == asset_id:
        print(f"Balance: {asset['amount']} DORM301")
        print(f"Ownership: {asset['amount'] / 10}%")
```

---

## 🎯 Challenge: Campus Gym Membership

**Scenario**: Create a gym membership token system.

### Requirements:
1. Create ASA: "Campus Gym Pass"
2. Total supply: 500 passes
3. Symbol: "GYMPAS"
4. Metadata URL: Link to gym info
5. Transfer to 3 students

### Solution:
```python
# 1. Create gym pass token
gym_pass_id = client.create_asa(
    creator_private_key=creator_private_key,
    asset_name="Campus Gym Pass",
    unit_name="GYMPAS",
    total=500,
    decimals=0,
    url="https://campus.edu/gym-info.json"
)

# 2. Students opt-in
students = [student1_pk, student2_pk, student3_pk]
for student_pk in students:
    client.opt_in_asset(student_pk, gym_pass_id)

# 3. Distribute passes
student_addresses = [addr1, addr2, addr3]
for addr in student_addresses:
    client.send_asset(
        sender_private_key=creator_private_key,
        receiver=addr,
        asset_id=gym_pass_id,
        amount=1  # 1 pass per student
    )

print("✅ Distributed 3 gym passes")
```

---

## Advanced: Clawback & Freeze

### Use Case: Revocable Credentials

**Scenario**: Student expelled → revoke gym pass

```python
# Create with clawback enabled
gym_pass_id = client.create_asa(
    creator_private_key=creator_private_key,
    asset_name="Revocable Gym Pass",
    unit_name="RGYMPAS",
    total=500,
    clawback=creator_address  # Enable clawback
)

# Later: Revoke pass
from algosdk.transaction import AssetTransferTxn

params = client.algod_client.suggested_params()

# Clawback: Take 1 pass from student, send to creator
clawback_txn = AssetTransferTxn(
    sender=creator_address,  # Clawback address
    sp=params,
    receiver=creator_address,  # Return to creator
    amt=1,
    index=gym_pass_id,
    revocation_target=student_address  # Take from this student
)

signed_txn = clawback_txn.sign(creator_private_key)
tx_id = client.algod_client.send_transaction(signed_txn)
print(f"✅ Revoked gym pass from student")
```

---

## 📚 Key Concepts

### ASA Properties Matrix

| Property | Immutable (None) | Mutable (Address) |
|----------|------------------|-------------------|
| **Manager** | Cannot change other properties | Can update manager/reserve/freeze/clawback |
| **Reserve** | Cannot receive uncirculated supply | Receives uncirculated tokens |
| **Freeze** | Cannot freeze accounts | Can freeze/unfreeze accounts |
| **Clawback** | Cannot revoke tokens | Can reclaim tokens |

### Best Practices

**✅ DO**:
- Set manager=None for permanent assets
- Use IPFS for metadata URLs
- Test on testnet first
- Document token purpose

**❌ DON'T**:
- Share private keys
- Create spam tokens
- Forget opt-in step
- Use mainnet for testing

---

## ✅ Quiz

1. **What happens if you send ASA to someone who hasn't opted-in?**
   - A) Transaction succeeds anyway
   - B) Transaction fails ✅
   - C) Tokens are burned
   - D) Auto opt-in happens

2. **What's the cost to create an ASA?**
   - A) Free
   - B) 0.001 ALGO ✅
   - C) 0.1 ALGO
   - D) 1 ALGO

3. **Which property allows reclaiming tokens?**
   - A) Manager
   - B) Reserve
   - C) Freeze
   - D) Clawback ✅

---

## 🚀 Next Steps

Continue to:
- **Tutorial 3**: Student Credential NFTs
- **Tutorial 4**: Campus Marketplace with Escrow
- **Tutorial 5**: PyTeal Smart Contracts

---

**Estimated Time**: 30 minutes  
**Difficulty**: ⭐⭐ Intermediate  
**Prerequisites**: Tutorial 1
