# 🚀 WEEK 2 IMPLEMENTATION GUIDE
## ASA Tokenization - Integration Steps

**Status:** 🚧 Backend Complete | Frontend Integration Pending  
**Date:** February 28, 2026

---

## ✅ What's Been Built

### Backend Services

#### 1. **AlgorandAssetService** (`apps/backend/src/services/algorandAssetService.ts`)
Comprehensive service for ASA management:
- ✅ Create ASA with full metadata
- ✅ Transfer ASA units
- ✅ Freeze assets (compliance)
- ✅ Clawback assets (emergency)
- ✅ Get asset info from blockchain
- ✅ Generate AlgoExplorer URLs

#### 2. **AtomicSwapService** (`apps/backend/src/services/atomicSwapService.ts`)
Trustless atomic swap implementation:
- ✅ Execute atomic swaps (ALGO ↔ ASA)
- ✅ Parameter validation
- ✅ Fee estimation
- ✅ Transaction URLs

### API Routes

#### 1. **Algorand Routes** (`apps/backend/src/routes/algorand.ts`)
- `POST /api/algorand/create-asa` - Create ASA for asset
- `POST /api/algorand/transfer-asset` - Transfer ASA units
- `GET /api/algorand/asset/:asaId` - Get ASA info
- `POST /api/algorand/freeze-asset` - Freeze/unfreeze asset
- `POST /api/algorand/clawback-asset` - Clawback asset

#### 2. **Atomic Swap Routes** (`apps/backend/src/routes/atomicSwap.ts`)
- `POST /api/swap/execute` - Execute atomic swap
- `POST /api/swap/estimate` - Estimate swap costs
- `GET /api/swap/status/:txId` - Check swap status

### Python Scripts

#### 1. **create_asa.py** (`algorand/scripts/create_asa.py`)
CLI tool to create ASAs with full metadata and compliance controls.

**Usage:**
```bash
python algorand/scripts/create_asa.py \
  --network testnet \
  --creator-mnemonic "your 25 word mnemonic" \
  --asset-name "Dorm Room 401" \
  --unit-name "DORM401" \
  --total 1000000 \
  --decimals 0 \
  --metadata '{ "type": "real-estate", "location": "Building A" }'
```

#### 2. **atomic_swap.py** (`algorand/scripts/atomic_swap.py`)
Execute trustless atomic swaps.

**Usage:**
```bash
python algorand/scripts/atomic_swap.py \
  --network testnet \
  --buyer-mnemonic "buyer 25 words" \
  --seller-mnemonic "seller 25 words" \
  --asa-id 12345 \
  --asa-amount 100 \
  --algo-amount 5000000
```

### Frontend Components

#### 1. **AsaBadge** (`apps/frontend/src/components/algorand/AsaBadge.tsx`)
- Display ASA ID with AlgoExplorer link
- Network indicator (TestNet/MainNet)
- Status indicators (creating, error, success)

**Usage:**
```tsx
import { AsaBadge, AsaStatus, AsaInfoCard } from '@/components/algorand/AsaBadge';

// Simple badge
<AsaBadge asaId={12345} network="testnet" />

// Status indicator
<AsaStatus asaId={12345} creating={false} error={undefined} />

// Full info card
<AsaInfoCard
  asaId={12345}
  assetName="Dorm Room 401"
  unitName="DORM401"
  totalSupply={1000000}
  decimals={0}
  manager="ALGORAND_ADDRESS"
/>
```

### Database Schema

**Migration:** `database/migrations/002_add_algorand_support.sql`

**New Tables:**
- `assets` - Enhanced with ASA columns
- `transactions` - All Algorand transactions
- `asset_holders` - Track ASA holders and balances
- `income_distributions` - Revenue distributions (Week 6)
- `income_claims` - Individual claims (Week 6)
- `verification_logs` - Verification audit trail (Week 3)

**New Views:**
- `assets_with_algorand` - Assets with ASA data and holder count
- `transaction_history` - Formatted transaction history

---

## 🔧 Integration Steps

### Step 1: Run Database Migration

```bash
# Navigate to database directory
cd "c:\Asset Tokenization\database"

# Run migration (adjust for your setup)
psql -U your_user -d your_database -f migrations/002_add_algorand_support.sql
```

### Step 2: Update Backend Main Server

In `apps/backend/src/index.ts`, import and register routes:

```typescript
import algorandRoutes from './routes/algorand';
import atomicSwapRoutes from './routes/atomicSwap';

// Register routes
app.use('/api/algorand', algorandRoutes);
app.use('/api/swap', atomicSwapRoutes);
```

### Step 3: Set Environment Variables

In `apps/backend/.env`:

```env
# Algorand Configuration
ALGORAND_NETWORK=testnet
ADMIN_ALGORAND_MNEMONIC=your_25_word_mnemonic_here

# Admin Control Addresses (same or different wallets)
FREEZE_ADDRESS=YOUR_FREEZE_ADDRESS
FREEZE_MNEMONIC=freeze_wallet_25_words
CLAWBACK_ADDRESS=YOUR_CLAWBACK_ADDRESS
CLAWBACK_MNEMONIC=clawback_wallet_25_words
```

### Step 4: Modify List Asset API

Update `apps/backend/src/routes/assets.ts` to create ASA when listing asset:

```typescript
import { AlgorandAssetService } from '../services/algorandAssetService';

const algorandService = new AlgorandAssetService();

// In your POST /api/assets route
router.post('/assets', authenticateToken, async (req, res) => {
  try {
    // 1. Save asset to database (existing logic)
    const asset = await saveAssetToDb(req.body);

    // 2. Create ASA on Algorand
    const asaResult = await algorandService.createAssetToken({
      creatorMnemonic: process.env.ADMIN_ALGORAND_MNEMONIC!,
      assetName: asset.name,
      unitName: asset.symbol || asset.name.substring(0, 8),
      totalSupply: asset.totalShares || 1000000,
      decimals: 0,
      metadata: {
        assetType: asset.type,
        location: asset.location,
        valuation: asset.valuation,
        documentHash: asset.ipfsHash || '',
        description: asset.description
      },
      url: `https://asset-linked-c4ef2.web.app/assets/${asset.id}`,
      managerAddress: process.env.ADMIN_ALGORAND_ADDRESS,
      freezeAddress: process.env.FREEZE_ADDRESS,
      clawbackAddress: process.env.CLAWBACK_ADDRESS
    });

    // 3. Update asset with ASA ID
    if (asaResult.success) {
      await updateAssetAsaId(asset.id, {
        asa_id: asaResult.asaId,
        asa_creator: asaResult.creator,
        asa_network: 'testnet',
        asa_created_at: new Date()
      });
    }

    res.json({
      success: true,
      asset,
      asa: asaResult
    });

  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});
```

### Step 5: Update Asset Cards

Update `apps/frontend/src/components/assets/AssetCard.tsx`:

```tsx
import { AsaBadge } from '@/components/algorand/AsaBadge';

function AssetCard({ asset }) {
  return (
    <div className="asset-card">
      <h3>{asset.name}</h3>
      <p>{asset.description}</p>
      
      {/* Add ASA Badge */}
      {asset.asa_id && (
        <div className="mt-4">
          <AsaBadge asaId={asset.asa_id} network={asset.asa_network} />
        </div>
      )}
      
      {/* Buy Button - now uses atomic swap */}
      <button onClick={() => buyWithAtomicSwap(asset)}>
        Buy Fraction
      </button>
    </div>
  );
}

async function buyWithAtomicSwap(asset) {
  const response = await fetch('/api/swap/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerMnemonic: localStorage.getItem('walletMnemonic'), // Handle securely
      sellerMnemonic: asset.owner_mnemonic, // From seller
      asaId: asset.asa_id,
      asaAmount: 100, // Units to buy
      algoAmount: 5000000 // 5 ALGO in microAlgos
    })
  });
  
  const result = await response.json();
  if (result.success) {
    alert(`Success! TX: ${result.txId}`);
    window.open(result.transactionUrl, '_blank');
  }
}
```

### Step 6: Update Marketplace

Update `apps/frontend/src/app/marketplace/page.tsx`:

```tsx
'use client';

import { AsaBadge } from '@/components/algorand/AsaBadge';

export default function MarketplacePage() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    // Fetch assets with ASA data
    fetch('/api/algorand/assets')
      .then(res => res.json())
      .then(data => {
        // Filter: Only show assets with ASA ID
        const algorandAssets = data.filter(a => a.asa_id);
        setAssets(algorandAssets);
      });
  }, []);

  return (
    <div>
      <h1>🟣 Algorand Marketplace</h1>
      {assets.map(asset => (
        <div key={asset.id}>
          <h2>{asset.name}</h2>
          <AsaBadge asaId={asset.asa_id} />
          <p>Available: {asset.available} units</p>
          <button>Buy Fraction</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🧪 Testing

### Test ASA Creation

```bash
# Using curl
curl -X POST http://localhost:3001/api/algorand/create-asa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "assetName": "Test Dorm Room",
    "unitName": "TESTDRM",
    "totalSupply": 1000000,
    "decimals": 0,
    "metadata": {
      "assetType": "real-estate",
      "location": "TestNet Campus",
      "valuation": 50000,
      "documentHash": "QmTest123",
      "description": "Test asset"
    },
    "url": "https://test.com"
  }'
```

### Test Atomic Swap

```bash
curl -X POST http://localhost:3001/api/swap/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "buyerMnemonic": "buyer 25 word mnemonic",
    "sellerMnemonic": "seller 25 word mnemonic",
    "asaId": 12345,
    "asaAmount": 100,
    "algoAmount": 5000000
  }'
```

---

## 📋 Checklist

### Backend
- [x] AlgorandAssetService created
- [x] AtomicSwapService created
- [x] API routes created
- [x] Python scripts created
- [ ] Routes registered in main server
- [ ] Environment variables set
- [ ] Database migration run

### Frontend
- [x] AsaBadge component created
- [ ] Integrated into asset cards
- [ ] Integrated into marketplace
- [ ] Buy flow updated to use atomic swaps
- [ ] AlgoExplorer links added

### Database
- [x] Migration script created
- [ ] Migration executed
- [ ] Verified tables exist
- [ ] Tested queries

### Documentation
- [x] Roadmap created (`ALGORAND_ROADMAP.md`)
- [x] Integration guide created (this file)
- [ ] API documentation
- [ ] Testing documentation

---

## 🎯 Next Steps (Priority Order)

1. **TODAY**
   - [ ] Run database migration
   - [ ] Register routes in backend
   - [ ] Set environment variables
   - [ ] Test ASA creation endpoint

2. **TOMORROW**
   - [ ] Integrate ASA creation into List Asset flow
   - [ ] Update asset cards with AsaBadge
   - [ ] Test full asset listing → ASA creation flow

3. **THIS WEEK**
   - [ ] Implement atomic swap in Buy flow
   - [ ] Test full purchase flow
   - [ ] Add AlgoExplorer links everywhere
   - [ ] Update marketplace to show only ASA assets

4. **NEXT WEEK (Week 3)**
   - [ ] Deploy verification smart contract
   - [ ] Admin verification panel
   - [ ] Marketplace verification filter

---

## 🐛 Troubleshooting

### Python Script Fails
```bash
# Ensure algosdk is installed
pip install py-algorand-sdk

# Test Python path
python -c "from algorand.utils.algorand_sdk import AlgorandClient; print('OK')"
```

### ASA Creation Fails
- Check mnemonic is valid (25 words)
- Verify account has ALGO balance (0.1+ ALGO)
- Check network connectivity to algonode.cloud

### Atomic Swap Fails
- Ensure buyer has opted-in to ASA
- Verify buyer has sufficient ALGO
- Check seller has ASA balance
- Confirm both mnemonics are valid

---

## 📚 Resources

- **Algorand Docs:** https://developer.algorand.org/
- **ASA Guide:** https://developer.algorand.org/docs/get-details/asa/
- **Atomic Transfers:** https://developer.algorand.org/docs/get-details/atomic_transfers/
- **TestNet Faucet:** https://testnet.algoexplorer.io/dispenser
- **AlgoExplorer:** https://testnet.algoexplorer.io/

---

**Questions? Check `ALGORAND_ROADMAP.md` for full 9-week plan!**
