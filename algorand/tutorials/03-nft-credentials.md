# Tutorial 3: Mint Student Credential NFTs

## 📖 What You'll Learn

By the end of this tutorial, you'll be able to:
- ✅ Mint NFTs on Algorand
- ✅ Understand ARC-3 metadata standard
- ✅ Create student achievement credentials
- ✅ Verify NFT authenticity
- ✅ Implement batch minting for events

**Prerequisites**: Complete Tutorial 1 & 2
**Time**: 45-60 minutes  
**Difficulty**: ⭐⭐⭐ Intermediate-Advanced

---

## 🎓 NFTs on Algorand

### What Makes Algorand NFTs Different?

On Algorand, NFTs are just ASAs with:
- **Total supply**: 1 (only one exists)
- **Decimals**: 0 (indivisible)
- **Unique metadata**: IPFS link or on-chain data

**Benefits**:
- No smart contract needed for basic NFTs
- Layer-1 support (built into protocol)
- Low cost (~$0.0002 per mint)
- Instant finality (4.5 seconds)

---

## 📋 ARC-3 Metadata Standard

Algorand NFTs follow the [ARC-3 standard](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md):

```json
{
  "name": "Computer Science Degree",
  "description": "Bachelor of Science in Computer Science",
  "image": "ipfs://Qm...",
  "properties": {
    "student": "Alice Johnson",
    "institution": "Campus University",
    "graduation_date": "2024-05-15",
    "gpa": "3.85",
    "honors": "Magna Cum Laude"
  }
}
```

This JSON is uploaded to IPFS, and the CID (Content ID) is stored in the NFT's `url` field.

---

## 🛠 Part 1: Mint Your First Credential NFT

### Step 1: Prepare Metadata

```python
import json
from utils.algorand_sdk import AlgorandClient

# Create metadata
metadata = {
    "name": "Introduction to Blockchain - Completion Certificate",
    "description": "Successfully completed CS450: Introduction to Blockchain",
    "image": "ipfs://QmXXX...",  # Upload badge image to IPFS first
    "properties": {
        "student_name": "Alice Johnson",
        "course_code": "CS450",
        "completion_date": "2024-03-15",
        "grade": "A",
        "instructor": "Prof. Smith",
        "credential_type": "course_completion"
    }
}

# Convert to JSON
metadata_json = json.dumps(metadata)
print(metadata_json)
```

### Step 2: Upload to IPFS

**Option A**: Use web3.storage (free)
```python
import requests

def upload_to_ipfs(metadata_json):
    # Get API token from https://web3.storage
    headers = {"Authorization": "Bearer YOUR_WEB3STORAGE_TOKEN"}
    
    files = {"file": ("metadata.json", metadata_json)}
    response = requests.post(
        "https://api.web3.storage/upload",
        headers=headers,
        files=files
    )
    
    cid = response.json()["cid"]
    return f"ipfs://{cid}"

metadata_url = upload_to_ipfs(metadata_json)
print(f"Metadata URL: {metadata_url}")
```

**Option B**: Use Pinata (easier)
```bash
# Upload via web: https://pinata.cloud/
# Returns: ipfs://QmXXX...
```

### Step 3: Mint NFT

```python
# Initialize client
client = AlgorandClient("testnet")

# Your credentials (from Tutorial 1)
creator_private_key = "YOUR_PRIVATE_KEY"  # Keep secure!
creator_address = "YOUR_ADDRESS"

# Mint NFT
nft_id = client.create_asa(
    creator_private_key=creator_private_key,
    asset_name="CS450 Certificate",
    unit_name="CS450CERT",
    total=1,              # NFT = only 1 exists
    decimals=0,           # NFT = indivisible
    url=metadata_url,     # IPFS link
    manager=creator_address,    # Can update metadata
    reserve=student_address,    # Indicates credential holder
    freeze=None,          # Cannot be frozen
    clawback=None         # Cannot be revoked
)

print(f"🎉 NFT minted! Asset ID: {nft_id}")
print(f"View on AlgoExplorer: https://testnet.algoexplorer.io/asset/{nft_id}")
```

### Step 4: Transfer NFT to Student

```python
# Student must opt-in first
student_private_key = "STUDENT_PRIVATE_KEY"
client.opt_in_asset(student_private_key, nft_id)

# Transfer NFT from creator to student
client.send_asset(
    sender_private_key=creator_private_key,
    receiver=student_address,
    asset_id=nft_id,
    amount=1  # NFT: always 1
)

print(f"✅ NFT transferred to {student_address}")
```

---

## 🏫 Part 2: Campus Credential System

### Use Cases:
1. **Course Completion**: CS450, MATH201, etc.
2. **Achievements**: Dean's List, President's Award
3. **Competitions**: Hackathon Winner, Research Symposium
4. **Events**: Attended AI Conference, Workshop Certificate
5. **Skills**: Python Certified, AWS Cloud Practitioner

### Smart Contract Integration

Deploy our `nft_credential.py` contract for advanced features:

```python
# Deploy contract (one-time)
from algosdk.transaction import StateSchema

global_schema = StateSchema(num_uints=2, num_byte_slices=1)
local_schema = StateSchema(num_uints=0, num_byte_slices=0)

# Load compiled contract
with open("contracts/build/nft_credential_approval.teal") as f:
    approval_teal = f.read()

with open("contracts/build/nft_credential_clear.teal") as f:
    clear_teal = f.read()

# Compile & deploy
import base64
approval_compiled = client.algod_client.compile(approval_teal)
approval_bytes = base64.b64decode(approval_compiled['result'])

clear_compiled = client.algod_client.compile(clear_teal)
clear_bytes = base64.b64decode(clear_compiled['result'])

app_id = client.deploy_contract(
    creator_private_key=admin_private_key,
    approval_program=approval_bytes,
    clear_program=clear_bytes,
    global_schema=global_schema,
    local_schema=local_schema
)

print(f"📄 Contract deployed: {app_id}")
```

### Mint via Contract

```python
from algosdk.transaction import ApplicationCallTxn, PaymentTxn
from algosdk import encoding

# Prepare arguments
args = [
    "mint_credential",
    student_address.encode(),
    "course_completion".encode(),
    metadata_cid.encode()  # IPFS CID only (without ipfs://)
]

# Call contract
sp = client.algod_client.suggested_params()
txn = ApplicationCallTxn(
    sender=admin_address,
    sp=sp,
    index=app_id,
    on_complete=0,  # NoOp
    app_args=args
)

# Sign & send
signed_txn = txn.sign(admin_private_key)
tx_id = client.algod_client.send_transaction(signed_txn)
client._wait_for_confirmation(tx_id)

print(f"✅ Credential minted via contract: {tx_id}")
```

---

## 🎯 Part 3: Batch Minting (Events)

Mint multiple NFTs for event attendees:

```python
def batch_mint_event_credentials(
    client: AlgorandClient,
    admin_pk: str,
    event_name: str,
    attendees: list[str]  # List of addresses
) -> list[int]:
    """Mint NFTs for all event attendees"""
    
    nft_ids = []
    
    for i, attendee in enumerate(attendees):
        # Create unique metadata for each attendee
        metadata = {
            "name": f"{event_name} - Participation Certificate",
            "description": f"Attended {event_name}",
            "image": "ipfs://QmEvent...",
            "properties": {
                "event": event_name,
                "participant": attendee,
                "date": "2024-03-20",
                "certificate_number": i + 1
            }
        }
        
        # Upload to IPFS (use batch upload API for efficiency)
        metadata_url = upload_to_ipfs(json.dumps(metadata))
        
        # Mint NFT
        nft_id = client.create_asa(
            creator_private_key=admin_pk,
            asset_name=f"{event_name[:20]} #{i+1}",
            unit_name=f"EVENT{i+1}",
            total=1,
            decimals=0,
            url=metadata_url
        )
        
        # Opt-in + transfer (assumes attendee wallets exist)
        # In production, use atomic transaction group
        
        nft_ids.append(nft_id)
        print(f"  Minted NFT {i+1}/{len(attendees)}: {nft_id}")
    
    return nft_ids

# Example: Hackathon 2024
attendees = [
    "ALICE_ADDRESS",
    "BOB_ADDRESS",
    "CHARLIE_ADDRESS"
]

nfts = batch_mint_event_credentials(
    client,
    admin_private_key,
    "Campus Hackathon 2024",
    attendees
)

print(f"\n🎉 Minted {len(nfts)} participation NFTs!")
```

---

## 🔍 Part 4: Verify Credential Authenticity

### Check if NFT is legitimate:

```python
def verify_credential(client: AlgorandClient, asset_id: int, expected_issuer: str) -> dict:
    """Verify if credential NFT is authentic"""
    
    # Get asset info
    asset_info = client.algod_client.asset_info(asset_id)
    params = asset_info['params']
    
    # Checks
    is_nft = params['total'] == 1 and params['decimals'] == 0
    is_from_issuer = params['creator'] == expected_issuer
    has_metadata = 'url' in params and params['url'].startswith('ipfs://')
    
    return {
        "valid": is_nft and is_from_issuer and has_metadata,
        "asset_id": asset_id,
        "name": params['name'],
        "creator": params['creator'],
        "metadata_url": params.get('url', ''),
        "holder": params.get('reserve', 'Unknown')
    }

# Example
CAMPUS_ISSUER = "YOUR_CAMPUS_OFFICIAL_ADDRESS"
result = verify_credential(client, nft_id, CAMPUS_ISSUER)

if result['valid']:
    print("✅ Credential is authentic!")
else:
    print("⚠️  Credential verification failed")

print(json.dumps(result, indent=2))
```

---

## 🏆 Challenge: Build a Credential Registry

**Task**: Create a system where:
1. Admin can mint credentials
2. Students can claim their credentials (opt-in)
3. Employers can verify credentials
4. Display all credentials earned by a student

### Solution Skeleton:

```python
class CredentialRegistry:
    def __init__(self, client: AlgorandClient, issuer_address: str):
        self.client = client
        self.issuer = issuer_address
        self.credentials = {}  # asset_id -> metadata
    
    def mint_credential(self, student_addr, credential_type, metadata):
        """Mint new credential"""
        # 1. Upload metadata to IPFS
        # 2. Create NFT
        # 3. Transfer to student
        # 4. Store in registry
        pass
    
    def get_student_credentials(self, student_addr):
        """Get all credentials for a student"""
        # Query Algorand Indexer for all NFTs owned by student from issuer
        pass
    
    def verify_credential(self, asset_id):
        """Verify credential is from this issuer"""
        # Check creator == self.issuer
        pass

# Usage
registry = CredentialRegistry(client, CAMPUS_ISSUER)

# Mint degree
degree_nft = registry.mint_credential(
    student_addr="ALICE_ADDRESS",
    credential_type="degree",
    metadata={
        "name": "Bachelor of Science - Computer Science",
        "graduation_date": "2024-05-15",
        "gpa": "3.85"
    }
)
```

**Bonus**: Add a web interface where students can view their credential collection!

---

## 📊 Comparison: NFTs vs Traditional Certificates

| Feature | Paper Certificate | PDF Certificate | Algorand NFT |
|---------|------------------|-----------------|--------------|
| **Cost** | $5-10/print | Free | $0.0002 |
| **Forgery Risk** | High | High | Zero |
| **Verification** | Manual | Email/call | Instant (blockchain) |
| **Transferable** | No | No | Yes (if allowed) |
| **Permanent** | Degrades | Can be lost | Immutable |
| **Global Access** | No | Requires email | Yes (wallet) |
| **Environmentally Friendly** | No | Yes | Yes (carbon-negative) |

---

## 🧠 Quiz

### Question 1:
What makes an ASA an NFT on Algorand?
- A) Smart contract implementation
- B) Total supply = 1 and decimals = 0
- C) High transaction fee
- D) Special NFT flag

<details>
<summary>Answer</summary>
**B) Total supply = 1 and decimals = 0**

NFTs are just ASAs with a single, indivisible unit. No special smart contract needed!
</details>

### Question 2:
Where is NFT metadata typically stored?
- A) On-chain in Algorand global state
- B) In a centralized database
- C) On IPFS (decentralized storage)
- D) In the transaction note field

<details>
<summary>Answer</summary>
**C) On IPFS (decentralized storage)**

The ARC-3 standard uses IPFS for metadata. Only the IPFS CID is stored on-chain in the `url` field.
</details>

### Question 3:
Why must students opt-in before receiving credential NFTs?
- A) To pay the minting fee
- B) To prevent spam and ensure consent
- C) To verify their identity
- D) It's not required

<details>
<summary>Answer</summary>
**B) To prevent spam and ensure consent**

Algorand's opt-in mechanism prevents unauthorized assets from appearing in your wallet. Costs 0.1 ALGO minimum balance increase.
</details>

---

## 🚀 Next Steps

You now know how to:
- ✅ Mint NFTs on Algorand
- ✅ Follow ARC-3 metadata standard
- ✅ Create student credentials
- ✅ Verify authenticity
- ✅ Batch mint for events

**Continue to**: [Tutorial 4: Build a Campus Marketplace](04-marketplace.md)

**Challenge**: Mint a set of 5 different achievement NFTs for your campus profile!

---

## 📚 Additional Resources

- **ARC-3 Standard**: https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md
- **ARC-69 (Enhanced Metadata)**: https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0069.md
- **IPFS Documentation**: https://docs.ipfs.tech/
- **: https://web3.storage/
- **NFT Explorer**: https://www.nftexplorer.app/

---

**Questions?** Join the [Algorand Discord](https://discord.gg/algorand) or check the [developer forum](https://forum.algorand.org/)!
