# Architecture Documentation
## Asset Tokenization Platform - System Design & Trust Boundaries

**Last Updated:** January 4, 2026  
**Version:** 1.0  
**Network:** Ethereum Sepolia Testnet

---

## Table of Contents

1. [System Overview](#system-overview)
2. [End-to-End Flow](#end-to-end-flow)
3. [Trust Boundaries](#trust-boundaries)
4. [Oracle Role](#oracle-role)
5. [Admin Limitations](#admin-limitations)
6. [Smart Contract Architecture](#smart-contract-architecture)
7. [Security Model](#security-model)

---

## System Overview

The Asset Tokenization Platform enables real-world assets (real estate, commodities, etc.) to be tokenized as ERC-20 tokens on Ethereum, with trustless verification via Chainlink oracles.

### Core Principle
**Verification is derived from on-chain oracle data ONLY. Admin approval enables asset listing, but oracle verification determines marketplace status.**

### Key Components

1. **Smart Contracts** (Solidity 0.8.20)
   - AssetRegistry: Asset registration and metadata
   - AssetApprovalQueue: Admin review workflow
   - OraclePriceFeed: Chainlink price oracle registry
   - ProofOfReserve: Reserve verification with staleness checks
   - PrimarySale: Initial token offering
   - AMMPool: Constant product AMM for secondary trading
   - FinalSale: Exit mechanism for token holders
   - IncomeDistributor: Yield distribution to token holders

2. **Frontend** (Next.js 15 + Firebase Hosting)
   - Marketplace: Asset discovery with oracle-derived verification
   - Asset Detail Page: Comprehensive disclosure (legal, oracle, tokenomics, liquidity)
   - Purchase Flow: Oracle-gated token acquisition
   - Admin Dashboard: Review queue, income deposits, system health monitoring
   - Portfolio: User holdings and claimable income

3. **Verification Layer** (Chainlink Oracles)
   - Price feeds: Real-time asset valuation
   - Reserve feeds: Proof of backing (reserve amount)
   - Staleness enforcement: MAX_ORACLE_AGE = 1 hour
   - Deviation checking: 5% tolerance between reserves and supply

---

## End-to-End Flow

### Phase 1: Asset Submission

1. Asset owner creates ERC-20 token contract
2. Owner calls `AssetRegistry.registerAsset(token, metadataURI)`
   - Metadata stored on IPFS (legal docs, property details, images)
   - Asset registered but `active = false`
3. Owner calls `AssetApprovalQueue.submitForApproval(token)`
   - Enters admin review queue

### Phase 2: Admin Review

1. Admin views submission in dashboard
2. Admin reviews:
   - Legal documentation (title deeds, ownership proof)
   - Asset metadata completeness
   - Token contract validity
3. Admin decision:
   - **Approve:** Calls `AssetApprovalQueue.approveAsset(token)`
     - Sets `active = true` in AssetRegistry
     - Asset can now appear in marketplace
   - **Reject:** Calls `AssetApprovalQueue.rejectAsset(token, reason)`
     - Asset remains inactive

### Phase 3: Oracle Configuration (Admin)

1. Admin deploys/identifies Chainlink feeds for asset
2. Admin calls `OraclePriceFeed.setPriceFeed(token, chainlinkPriceFeed)`
3. Admin calls `ProofOfReserve.setReserveFeed(token, chainlinkReserveFeed)`
4. Admin calls `ProofOfReserve.setTotalSupply(token, expectedSupply)`

**CRITICAL:** Only oracle owner (admin wallet) can set feeds. This is the single source of verification truth.

### Phase 4: Marketplace Verification

1. Marketplace API calls `ProofOfReserve.checkReserve(token)`
2. Contract checks:
   - Reserve feed exists
   - Data is fresh (< 1 hour old)
   - Reserve matches supply within 5% deviation
3. Verification result:
   - `verified`: All checks pass
   - `missing-feed`: No oracle feed configured
   - `stale-data`: Oracle data > 1 hour old
   - `reserve-deviation`: Reserves don't match supply

### Phase 5: User Purchase Flow

1. User discovers asset on Marketplace
   - Sees oracle verification status badge
2. User navigates to Asset Detail Page
   - Reviews legal summary (documents from metadata)
   - Checks oracle status (real-time verification)
   - Reviews tokenomics (supply, balance, decimals)
   - Checks AMM pool health (liquidity depth)
3. **Oracle verification REQUIRED**
   - "Proceed to Purchase" button disabled if verification fails
   - Frontend calls `ProofOfReserve.checkReserve()` before enabling purchase
4. User clicks "Proceed to Purchase"
   - Routed to `/purchase?assetId=123`
   - Purchase page requires `assetId` (no manual token address entry)
5. User purchases via PrimarySale or AMMPool
   - **Note:** Smart contracts do NOT enforce oracle check (frontend responsibility)
   - Users can bypass frontend and call contracts directly (at their own risk)

### Phase 6: Secondary Trading

1. Users trade tokens on AMMPool
   - Constant product formula: `x * y = k`
   - 1% swap fee
2. AMM does NOT require oracle verification
   - Trading permitted even if verification fails
   - Liquidity providers assume risk

### Phase 7: Income Distribution

1. Asset generates income (rent, dividends, etc.)
2. Admin deposits income:
   - Calls `IncomeDistributor.depositIncome(assetToken, USDC, amount)`
   - Converts income to USDC
3. Token holders claim proportionally:
   - Calls `IncomeDistributor.claimIncome(assetToken, USDC)`
   - Receives USDC based on token ownership percentage

### Phase 8: Exit

1. Token holder wants to exit position
2. Options:
   - **Option A:** Sell on AMM (if liquidity exists)
   - **Option B:** Redeem via FinalSale (if exit price set)
     - Calls `FinalSale.redeem(token, amount)`
     - Receives ETH at predetermined exit price
   - **Option C:** Hold and collect income distributions

---

## Trust Boundaries

### Boundary 1: Oracle vs Admin

**CRITICAL SEPARATION: Admin approval ≠ Oracle verification**

- **Admin Role:** Decides if asset can be listed (active = true/false)
- **Oracle Role:** Provides verification status (verified/not-verified)
- **No Override Path:** Admin cannot manually mark asset as "verified" without oracle

```solidity
// Admin CAN do this:
assetRegistry.registerAsset(token, metadataURI);
approvalQueue.approveAsset(token); // Sets active = true

// Admin CANNOT do this:
// There is NO function: proofOfReserve.markAsVerified(token)
// Verification ONLY comes from: proofOfReserve.checkReserve(token)
```

### Boundary 2: On-Chain vs Frontend

**On-Chain Truth:**
- Asset active status (AssetRegistry)
- Oracle verification (ProofOfReserve)
- Token ownership (ERC-20 balances)
- Sale configuration (PrimarySale, AMMPool)

**Frontend Enforcement:**
- Purchase flow gating (oracle check before purchase button)
- Asset detail as single entry point
- Manual token address entry disabled

**User Responsibility:**
- Direct contract interaction bypasses frontend checks
- Users calling `PrimarySale.purchaseTokens()` directly don't get frontend oracle check
- **Design Decision:** We trust frontend enforcement for UX; contract-level enforcement would block legitimate use cases (e.g., admin testing, advanced users)

### Boundary 3: Marketplace vs Purchase

**Marketplace Page:**
- Shows all active assets
- Displays oracle verification badges
- Summary view only

**Asset Detail Page:**
- Comprehensive disclosure (legal, oracle, tokenomics, liquidity)
- Real-time oracle verification check
- Single entry point to purchase flow

**Purchase Page:**
- Requires `assetId` parameter (no manual entry)
- Final transaction execution
- Should only be reachable from Asset Detail

### Boundary 4: User vs Admin Operations

**User Operations (No Admin Required):**
- Purchase tokens (PrimarySale, AMMPool)
- Transfer tokens
- Sell tokens (AMMPool)
- Claim income (IncomeDistributor)
- Redeem tokens (FinalSale)

**Admin-Only Operations:**
- Approve/reject assets (AssetApprovalQueue)
- Set oracle feeds (OraclePriceFeed, ProofOfReserve)
- Deposit income (IncomeDistributor)
- Configure sales (PrimarySale, FinalSale)

**CRITICAL:** All user operations continue to function even if admin disappears. Admin is NOT required for ongoing trading/claiming.

---

## Oracle Role

### Purpose

Oracles provide **trustless verification** that real-world asset reserves match on-chain token supply.

### Architecture

```
Real World Asset → Custodian → Chainlink Node → On-Chain Oracle → Verification Contract
                                      ↓
                            (Signed Data Feed)
```

### Oracle Contracts

**1. OraclePriceFeed**
- Maps token address → Chainlink price feed address
- Returns asset price in USD (or other denomination)
- Used for: Valuation, liquidation thresholds

**2. ProofOfReserve**
- Maps token address → Chainlink reserve feed address
- Verifies reserves match token supply
- Enforces staleness check (MAX_ORACLE_AGE = 1 hour)
- Enforces deviation check (5% tolerance)

### Verification Logic

```solidity
function checkReserve(address token) public view returns (
    uint256 reserveAmount,
    uint256 totalSupply,
    bool isValid
) {
    // 1. Fetch reserve from Chainlink feed
    (, int256 answer,, uint256 updatedAt,) = reserveFeed.latestRoundData();
    
    // 2. Check staleness
    if (block.timestamp - updatedAt > MAX_ORACLE_AGE) revert StalePrice();
    
    // 3. Fetch total supply
    totalSupply = expectedTotalSupply[token];
    
    // 4. Check deviation (5% tolerance)
    uint256 deviation = abs(reserveAmount - totalSupply) * 10000 / totalSupply;
    isValid = deviation <= 500; // 5% = 500 basis points
}
```

### Staleness Enforcement

- **MAX_ORACLE_AGE = 1 hour**
- If oracle data is older than 1 hour, verification FAILS
- Prevents stale data from being used
- Requires oracle to update regularly

### Why Oracles are Trustless

1. **Cryptographic Signatures:** Chainlink nodes sign data feeds
2. **Decentralized Network:** Multiple nodes provide data (not single point of failure)
3. **On-Chain Verification:** Anyone can verify signatures on-chain
4. **No Admin Override:** Admin cannot bypass oracle check

---

## Admin Limitations

### What Admin CAN Do

1. **Asset Approval:**
   - Approve/reject asset submissions
   - Set `active` status in registry

2. **Oracle Configuration:**
   - Set Chainlink feed addresses
   - Update expected token supplies
   - Change feed addresses if needed

3. **Income Management:**
   - Deposit income to IncomeDistributor
   - Trigger distributions

4. **Sale Configuration:**
   - Create primary sales
   - Set exit prices for redemptions
   - Withdraw sale proceeds

### What Admin CANNOT Do

1. **Override Oracle Verification:**
   - No function exists to mark asset as "verified" without oracle
   - Verification ONLY comes from `ProofOfReserve.checkReserve()`

2. **Block User Exits:**
   - Users can always transfer tokens
   - Users can sell on AMM (if liquidity exists)
   - Admin cannot freeze token transfers

3. **Steal User Funds:**
   - Admin has no access to user token balances
   - Funds in PrimarySale can only be withdrawn by seller
   - AMM LP tokens belong to liquidity providers

4. **Bypass Onboarding Queue:**
   - Assets must go through approval process
   - Direct registration leaves asset inactive (`active = false`)

### Emergency Controls

**Admin DOES have emergency powers:**

1. **Disable Stale Oracle:**
   - Can remove oracle feed if data becomes unreliable
   - Removes verification (asset shows as "missing-feed")
   - Does NOT fake verification

2. **Reject Asset:**
   - Can set `active = false` to delist asset
   - Users can still trade existing tokens
   - Removes from marketplace

3. **Pause Deposits:**
   - Can stop new income deposits (if contract has pause mechanism)
   - Existing claims remain accessible

**These powers are TRANSPARENT:**
- All admin actions emit events
- On-chain transaction history is public
- Users can monitor admin wallet activity

---

## Smart Contract Architecture

### Contract Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Layer                             │
│  (Wallet interactions, Frontend, Direct contract calls)         │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    Application Layer                            │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐       │
│  │ Marketplace │  │ Asset Detail │  │ Purchase Flow  │       │
│  │   (Summary) │──┤  (Disclosure)│──┤   (Execution)  │       │
│  └─────────────┘  └──────────────┘  └────────────────┘       │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                     Contract Layer                              │
│                                                                 │
│  ┌───────────────┐     ┌─────────────────┐                    │
│  │ AssetRegistry │────▶│ ApprovalQueue   │ (Admin Review)     │
│  │  (Ownership)  │     │ (active flag)   │                    │
│  └───────┬───────┘     └─────────────────┘                    │
│          │                                                      │
│          │             ┌─────────────────┐                    │
│          │            │ OraclePriceFeed │                     │
│          │            │ (Price data)    │                     │
│          │            └────────┬────────┘                     │
│          │                     │                               │
│          │            ┌────────▼────────┐                     │
│          └───────────▶│ ProofOfReserve  │ (Verification)     │
│                       │ (Reserve check) │                     │
│                       └─────────────────┘                     │
│                                                                 │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────────────┐   │
│  │ PrimarySale │  │ AMMPool  │  │ IncomeDistributor     │   │
│  │ (Initial)   │  │ (Trading)│  │ (Yield)               │   │
│  └─────────────┘  └──────────┘  └───────────────────────┘   │
│                                                                 │
│  ┌─────────────┐                                              │
│  │ FinalSale   │  (Exit)                                      │
│  └─────────────┘                                              │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                     Oracle Layer                                │
│                                                                 │
│  ┌──────────────────┐         ┌─────────────────────┐         │
│  │ Chainlink Price  │         │ Chainlink Reserve   │         │
│  │   Feed (LINK)    │         │   Feed (LINK)       │         │
│  └──────────────────┘         └─────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Contract Dependencies

```
AssetToken (ERC-20)
    ↓
AssetRegistry.registerAsset()
    ↓
AssetApprovalQueue.submitForApproval()
    ↓
AssetApprovalQueue.approveAsset() → Sets active = true
    ↓
OraclePriceFeed.setPriceFeed() → Admin configures oracle
    ↓
ProofOfReserve.setReserveFeed() → Admin configures oracle
    ↓
ProofOfReserve.checkReserve() → Verification result
    ↓
[Marketplace shows verified/not-verified]
    ↓
User purchases via PrimarySale/AMMPool
```

---

## Security Model

### Threat Model

**Assumed Threats:**
1. Malicious admin attempts to fake verification
2. Oracle becomes stale/unreliable
3. AMM liquidity drains
4. User attempts to bypass onboarding
5. Admin disappears

### Mitigations

**1. Admin Cannot Override Oracle**
- No function exists to bypass `ProofOfReserve.checkReserve()`
- Verification logic is immutable (contracts not upgradeable)
- Admin can only remove feeds (shows "missing-feed"), not fake verification

**2. Staleness Enforced On-Chain**
- `MAX_ORACLE_AGE = 1 hour` hardcoded in contract
- Stale data causes revert (not silent failure)
- Frontend shows clear error state

**3. Multiple Exit Routes**
- Users can: transfer tokens, sell on AMM, redeem via FinalSale
- Funds never stuck (even if admin disappears)

**4. Onboarding Queue**
- Assets without approval remain inactive (`active = false`)
- Marketplace must check `active` status
- Direct registration bypasses queue but asset not active

**5. Graceful Degradation**
- Oracle failure: Trading continues, verification shows error
- AMM drain: Users can exit via FinalSale
- Admin disappears: All user operations continue

### Audit Recommendations

Before mainnet deployment:

1. **Formal Verification:** Verify oracle logic cannot be bypassed
2. **Economic Analysis:** Model AMM liquidity under stress
3. **Access Control Review:** Confirm onlyOwner modifiers on all admin functions
4. **Upgrade Path:** Plan for oracle migration if Chainlink feeds change
5. **Emergency Procedures:** Document admin response to oracle failures

---

## Deployment Information

**Sepolia Testnet:**
- OraclePriceFeed: `0x5104a0C15a463F6B4E576a7cdf73Dab357C9Edb7`
- ProofOfReserve: `0x03f970dce702C768a0663D0625890bAA173EaDd1`
- Owner: `0x400aCbC3D1Cc3F7BfA086CC3B0fAA916C3BD5194`

**Live Application:**
- https://asset-linked-c4ef2.web.app

---

**End of Architecture Documentation**
