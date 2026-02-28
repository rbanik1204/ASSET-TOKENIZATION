# Algorand Integration - Complete Documentation

## 🎯 Overview

A **production-grade campus asset tokenization platform** built for the **Algorand x Encode AI Hackathon**. This platform enables the fractionalized ownership of campus real estate, intellectual property, equipment, and artworks on the **Algorand blockchain**.

## 🌟 Key Features

### ✅ Complete Implementation (9 Weeks)

#### **Week 1: Wallet Integration** ✅
- Pera Wallet integration with QR code support
- Defly Wallet integration
- AlgorandWalletButton component with multi-wallet support
- ChainSelector for TestNet/MainNet switching
- Live deployment: https://asset-linked-c4ef2.web.app

#### **Week 2: ASA Tokenization** ✅
- **Backend Services**:
  - `AlgorandAssetService`: ASA creation, balance queries, opt-in
  - `AtomicSwapService`: Trustless P2P asset swaps
  - 7 API endpoints for ASA operations
- **Python Scripts**:
  - `create_asa.py`: Creates Algorand Standard Assets with metadata
  - `atomic_swap.py`: Executes atomic transaction groups
- **Frontend Components**:
  - `AsaBadge`: Displays ASA IDs with AlgoExplorer links
  - `BuyFractionModal`: Buy asset fractions via atomic swaps
  - Integration in AssetCard and list-asset flow
- **Database**: PostgreSQL schema with 6 tables for ASA tracking

#### **Week 3: Verification Smart Contract** ✅
- **PyTeal Smart Contract** (`asset_verification.py`):
  - Admin-controlled asset verification
  - Box storage for scalable verification data
  - Methods: verify_asset, reject_asset, get_verification, bulk_verify
  - Global state tracking: total verified/rejected, paused status
- **Python Scripts**:
  - `deploy_verification.py`: Deploy contract with state schema
  - `verify_asset.py`: CLI for verify/reject operations
- **Backend**: `verificationService.ts` + API routes
- **Frontend**: Admin verification page with pending assets review

#### **Week 4: Atomic Swaps Frontend** ✅
- `BuyFractionModal.tsx` component (350 lines):
  - Units input with increment/decrement controls
  - Cost breakdown: price, fees (0.002 ALGO), total
  - Status tracking: idle → estimating → swapping → confirming → success
  - Integration with `/api/swap/estimate` and `/api/swap/execute`
  - AlgoExplorer link opening on success
- Integrated into AssetCard with "Buy Fraction" button
- Educational banner about atomic swap trustless nature

#### **Week 5: Marketplace ASA Integration** ✅
- **Indexer Service** (`indexerService.ts`):
  - Query ASA info: supply, circulation, holder count
  - Transaction history fetching
  - Batch asset queries (up to 50 assets)
  - Account balance and opt-in checks
- **Frontend Components**:
  - `AsaAnalytics.tsx`: Live on-chain stats (supply, holders, reserves)
  - `TransactionHistory.tsx`: Recent transfers with AlgoExplorer links
- **API Routes**: 9 indexer endpoints for blockchain queries

#### **Week 6: Income Distribution** ✅
- **PyTeal Smart Contract** (`income_distribution.py`):
  - Admin deposits income (ALGO)
  - ASA holders claim proportional shares
  - Box storage for per-holder claimed amounts
  - Claimable calculation: (balance/total_supply) * total_deposited - claimed
- **Python Scripts**:
  - `deploy_income.py`: Deploy income contract
  - `income_operations.py`: Deposit/claim operations
- **Backend**: `incomeService.ts` + API routes
- **Frontend**: `ClaimIncomeButton.tsx` with claimable amount display

#### **Week 7: History & Audit** (In Progress)
- Algorand Indexer integration for complete audit trail
- All ASA transfers displayed with timestamps
- AlgoExplorer links for every transaction
- CSV export functionality for compliance

#### **Week 8: Governance** ✅
- **PyTeal Smart Contract** (`governance.py`):
  - Proposal creation (pause/unpause, admin changes)
  - Weighted voting based on ASA holdings
  - Quorum requirements (configurable, default 51%)
  - Time-limited voting periods
  - Automatic execution of approved proposals
- Box storage for proposals and votes
- Prevents double-voting per address

#### **Week 9: Production Polish** (In Progress)
- Remove all mock/fake data
- ASA IDs displayed on all asset pages
- AlgoExplorer links everywhere
- Comprehensive documentation
- 5-minute demo script
- Video walkthrough for judges

## 🏗️ Architecture

### **Tech Stack**
- **Frontend**: Next.js 14.2.18, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Blockchain**: Algorand TestNet (configurable to MainNet)
- **Smart Contracts**: PyTeal version 8
- **Database**: PostgreSQL 16
- **Deployment**: Firebase Hosting

### **Algorand Integration**
- **Wallets**: Pera Wallet, Defly Wallet (WalletConnect compatible)
- **Smart Contracts**: 3 deployed contracts (verification, income, governance)
- **Storage**: Box storage for scalable per-asset/per-user data
- **Transactions**: Atomic transaction groups for trustless swaps
- **Indexer**: Real-time blockchain queries via Algonode API
- **Network**: TestNet for development, MainNet-ready

### **Smart Contracts Overview**

| Contract | Purpose | Box Storage | Global State |
|----------|---------|-------------|--------------|
| **asset_verification** | Admin verifies/rejects assets on-chain | `verify_<asa_id>` → status, reason | admin, total_verified, total_rejected, paused |
| **income_distribution** | Distribute ALGO income to ASA holders | `claim_<address>` → claimed_amount | admin, asa_id, total_deposited, total_claimed, paused |
| **governance** | Decentralized governance via voting | `prop_<id>`, `vote_<prop>_<addr>` | admin, asa_id, proposal_count, quorum, paused |

### **Database Schema**
#### Tables:
1. **algorand_assets**: Maps ERC20 tokens to ASA IDs
2. **atomic_swaps**: Tracks all swap transactions
3. **verification_logs**: On-chain verification audit trail
4. **income_distributions**: Income deposit/claim history
5. **governance_proposals**: All governance proposals
6. **governance_votes**: Individual vote records

## 🚀 Getting Started

### Prerequisites
```bash
# Install Node.js dependencies
cd apps/frontend && npm install
cd apps/backend && npm install

# Install Python dependencies
pip install pyteal py-algorand-sdk
```

### Environment Variables
```env
# Backend (.env)
ALGORAND_NETWORK=testnet
ADMIN_ALGORAND_MNEMONIC=<25_word_mnemonic>
VERIFICATION_APP_ID=<deployed_verification_app_id>
INCOME_APP_ID=<deployed_income_app_id>
GOVERNANCE_APP_ID=<deployed_governance_app_id>

# Frontend (.env.local)
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
```

### Deploy Smart Contracts
```bash
# 1. Deploy Verification Contract
cd algorand/scripts
python deploy_verification.py --network testnet --creator-mnemonic "your 25 words..."

# 2. Deploy Income Distribution Contract (per ASA)
python deploy_income.py --network testnet --creator-mnemonic "your 25 words..." --asa-id 12345

# 3. Deploy Governance Contract (per ASA)
python deploy_governance.py --network testnet --creator-mnemonic "your 25 words..." --asa-id 12345
```

### Run Development Servers
```bash
# Frontend
cd apps/frontend
npm run dev
# → http://localhost:3000

# Backend
cd apps/backend
npm run dev
# → http://localhost:5001
```

## 📊 Code Statistics

| Component | Files | Lines of Code |
|-----------|-------|---------------|
| **Smart Contracts** | 3 | ~950 lines (PyTeal) |
| **Python Scripts** | 7 | ~800 lines |
| **Backend Services** | 5 | ~1,100 lines (TypeScript) |
| **API Routes** | 5 | ~850 lines |
| **Frontend Components** | 8 | ~1,450 lines (React/TypeScript) |
| **Database Migrations** | 1 | ~150 lines (SQL) |
| **Total** | **29 files** | **~5,300 lines** |

## 🎥 Demo Flow (5 Minutes)

1. **Wallet Connection** (0:30)
   - Connect Pera Wallet
   - Show TestNet balance
   - Demonstrate ChainSelector

2. **Asset Tokenization** (1:00)
   - List new campus dorm room
   - Create ASA with metadata
   - Show ASA ID and AlgoExplorer link

3. **Verification** (0:45)
   - Admin reviews pending asset
   - On-chain verification via smart contract
   - ASA badge appears on marketplace

4. **Buy Fractions** (1:15)
   - Open BuyFractionModal
   - Estimate costs
   - Execute atomic swap
   - Confirm on-chain

5. **Income Distribution** (0:45)
   - Admin deposits 10 ALGO
   - Holder claims proportional share
   - Show transaction on AlgoExplorer

6. **Governance** (0:45)
   - Create pause proposal
   - Cast weighted vote
   - Execute approved proposal

## 🔗 Links

- **Live Demo**: https://asset-linked-c4ef2.web.app
- **Algorand TestNet**: https://testnet.algoexplorer.io
- **Pera Wallet**: https://perawallet.app
- **Defly Wallet**: https://defly.app

## 🏆 Hackathon Highlights

### **Why Algorand?**
1. **Pure Proof-of-Stake**: Energy-efficient, carbon-negative consensus
2. **Layer-1 Smart Contracts**: No need for Layer-2 scaling solutions
3. **Fast Finality**: 3.7 second block times
4. **Low Fees**: ~0.001 ALGO per transaction ($0.0003)
5. **ASA Standard**: Built-in tokenization without custom contracts
6. **Box Storage**: Scalable per-asset data storage
7. **Atomic Transactions**: Trustless multi-party swaps built-in

### **Technical Innovations**
- **TypeScript ↔ Python Bridge**: Backend calls Python scripts for Algorand operations
- **Box Storage Pattern**: Scalable verification/income/vote data per asset/user
- **Atomic Swap UX**: Modal-based buying with real-time cost estimation
- **Indexer Integration**: Real-time on-chain analytics without custom indexing
- **Weighted Governance**: Votes proportional to ASA holdings (1 token = 1 vote)

### **Production-Ready Features**
- Authentication middleware for admin operations
- Error handling with user-friendly messages
- AlgoExplorer integration on every transaction
- Responsive Tailwind CSS design
- PostgreSQL database for off-chain metadata
- Firebase deployment for public access

## 📝 License

MIT License - Built for Algorand x Encode AI Hackathon

## 👥 Team

Solo developer submission showcasing full-stack Algorand integration.

---

**Built with 💜 for Algorand Ecosystem**
