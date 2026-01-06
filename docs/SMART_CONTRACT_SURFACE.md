# Smart Contract Surface
## Asset Tokenization Platform - Contract Reference & Security Model

**Last Updated:** January 4, 2026  
**Solidity Version:** 0.8.20  
**Network:** Ethereum Sepolia Testnet

---

## Table of Contents

1. [Contract Overview](#contract-overview)
2. [What Contracts Do](#what-contracts-do)
3. [What Contracts CANNOT Do](#what-contracts-cannot-do)
4. [Emergency Controls](#emergency-controls)
5. [Security Model](#security-model)
6. [Function Reference](#function-reference)
7. [Event Reference](#event-reference)

---

## Contract Overview

### Core Contracts

| Contract | Address (Sepolia) | Purpose | Owner |
|----------|-------------------|---------|-------|
| AssetRegistry | [Deploy Required] | Asset metadata registry | Admin |
| AssetApprovalQueue | [Deploy Required] | Submission & review workflow | Admin |
| OraclePriceFeed | 0x5104a0C15a463F6B4E576a7cdf73Dab357C9Edb7 | Price oracle registry | Admin |
| ProofOfReserve | 0x03f970dce702C768a0663D0625890bAA173EaDd1 | Reserve verification | Admin |
| PrimarySale | [Deploy Required] | Initial token sales | Admin |
| AMMPool | [Deploy Per Asset] | Constant product AMM | None (automated) |
| FinalSale | [Deploy Required] | Exit redemptions | Admin |
| IncomeDistributor | [Deploy Required] | Yield distribution | Admin |

### Dependencies

- **OpenZeppelin Contracts:** `Ownable.sol` for access control
- **Chainlink Oracles:** `AggregatorV3Interface` for price/reserve feeds
- **ERC-20 Standard:** `IERC20` for token interactions

---

## What Contracts Do

### AssetRegistry

**Purpose:** Central registry of tokenized assets

**Capabilities:**
- ✅ Register new asset token addresses
- ✅ Store metadata URIs (IPFS links to legal docs)
- ✅ Track asset active status (approved/rejected)
- ✅ Return asset details (token, owner, metadata, active flag)
- ✅ Update metadata URIs

**Access Control:**
- Anyone can call `registerAsset()` (but asset starts inactive)
- Only owner can call `updateMetadata()`

**State Storage:**
```solidity
struct Asset {
    address token;      // ERC-20 token address
    address owner;      // Asset submitter
    string metadataURI; // IPFS link to legal docs
    bool active;        // Approved by admin
}

mapping(uint256 => Asset) private assets;    // assetId → Asset
mapping(address => uint256) public assetIds; // token → assetId
uint256 public assetCount;
```

---

### AssetApprovalQueue

**Purpose:** Admin review workflow for asset submissions

**Capabilities:**
- ✅ Submit assets for approval
- ✅ Approve assets (sets active = true in registry)
- ✅ Reject assets (with reason)
- ✅ Track submission history

**Access Control:**
- Anyone can call `submitForApproval()`
- Only owner can call `approveAsset()` or `rejectAsset()`

**Workflow:**
```
1. User calls submitForApproval(token)
2. Admin reviews submission
3. Admin calls approveAsset(token) OR rejectAsset(token, reason)
4. If approved: registry.setActive(token, true)
```

---

### OraclePriceFeed

**Purpose:** Registry of Chainlink price feeds for assets

**Capabilities:**
- ✅ Map token addresses to Chainlink price feed addresses
- ✅ Return latest price from Chainlink feed
- ✅ Enforce staleness check (MAX_ORACLE_AGE = 1 hour)

**Access Control:**
- Only owner can call `setPriceFeed()`
- Anyone can call `getPrice()` (view function)

**Verification Logic:**
```solidity
function getPrice(address token) external view returns (
    int256 price,
    uint8 decimals
) {
    AggregatorV3Interface feed = priceFeeds[token];
    if (address(feed) == address(0)) revert PriceFeedNotFound();
    
    (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
    
    // Staleness check
    if (block.timestamp - updatedAt > MAX_ORACLE_AGE) {
        revert StalePrice();
    }
    
    return (answer, feed.decimals());
}
```

---

### ProofOfReserve

**Purpose:** Verify asset reserves match token supply

**Capabilities:**
- ✅ Map token addresses to Chainlink reserve feeds
- ✅ Store expected total supplies
- ✅ Check if reserves match supply within 5% deviation
- ✅ Enforce staleness check (MAX_ORACLE_AGE = 1 hour)
- ✅ Emit verification events

**Access Control:**
- Only owner can call `setReserveFeed()`, `setTotalSupply()`
- Anyone can call `checkReserve()`, `getReserve()` (view functions)

**Verification Logic:**
```solidity
function checkReserve(address token) public view returns (
    uint256 reserveAmount,
    uint256 totalSupply,
    bool isValid
) {
    // 1. Fetch reserve from Chainlink
    AggregatorV3Interface feed = reserveFeeds[token];
    if (address(feed) == address(0)) revert ReserveFeedNotFound();
    
    (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
    
    // 2. Staleness check
    if (block.timestamp - updatedAt > MAX_ORACLE_AGE) {
        revert StalePrice();
    }
    
    reserveAmount = uint256(answer);
    totalSupply = expectedTotalSupply[token];
    
    // 3. Deviation check (5% tolerance)
    uint256 diff = reserveAmount > totalSupply 
        ? reserveAmount - totalSupply 
        : totalSupply - reserveAmount;
    
    uint256 deviationBPS = (diff * 10000) / totalSupply;
    isValid = deviationBPS <= 500; // 5% = 500 basis points
}
```

**Events:**
```solidity
event ReserveFeedSet(address indexed token, address feed);
event TotalSupplySet(address indexed token, uint256 amount);
event ReserveVerified(address indexed token, uint256 reserve, uint256 supply, bool isValid);
```

---

### PrimarySale

**Purpose:** Initial token offering (ICO-like functionality)

**Capabilities:**
- ✅ Create token sales with price, supply, start/end times
- ✅ Allow users to purchase tokens with ETH
- ✅ Track sales, sold amounts, withdrawn funds
- ✅ Seller can withdraw sale proceeds
- ✅ Seller can finalize sale

**Access Control:**
- Anyone can call `createSale()` (must approve tokens first)
- Anyone can call `purchaseTokens()` (during sale period)
- Only seller can call `withdrawFunds()`, `finalizeSale()`

**Sale Lifecycle:**
```
1. Seller calls createSale(token, price, amount, start, end)
2. Users call purchaseTokens(token, amount) {value: cost}
3. Seller calls withdrawFunds(token) to collect ETH
4. Seller calls finalizeSale(token) to end sale
```

**Critical Checks:**
- Sale must be active (start < now < end)
- Sufficient tokens available (tokensForSale - tokensSold >= amount)
- Correct ETH payment (amount * pricePerToken)

---

### AMMPool

**Purpose:** Constant product automated market maker (x * y = k)

**Capabilities:**
- ✅ Add liquidity (receive LP tokens)
- ✅ Remove liquidity (burn LP tokens)
- ✅ Swap ETH for tokens
- ✅ Swap tokens for ETH
- ✅ 1% swap fee

**Access Control:**
- No owner (fully decentralized)
- Anyone can provide liquidity
- Anyone can trade

**Formula:**
```solidity
// Constant product formula
invariant = reserveToken * reserveETH  // Must remain constant (minus fees)

// Swap ETH for tokens
tokensOut = (amountIn * 99 * reserveToken) / ((reserveETH * 100) + (amountIn * 99))

// Swap tokens for ETH
ethOut = (amountIn * 99 * reserveETH) / ((reserveToken * 100) + (amountIn * 99))
```

**Liquidity Provision:**
```solidity
// First liquidity provider sets initial price
if (totalSupply == 0) {
    liquidity = sqrt(tokenAmount * ethAmount);
} else {
    liquidity = min(
        (tokenAmount * totalSupply) / reserveToken,
        (ethAmount * totalSupply) / reserveETH
    );
}
```

---

### FinalSale

**Purpose:** Exit mechanism for token holders

**Capabilities:**
- ✅ Admin sets exit price per token
- ✅ Users redeem tokens for ETH at fixed price
- ✅ Track redemptions
- ✅ Admin funds contract with ETH for redemptions

**Access Control:**
- Only owner can call `setExitPrice()`
- Anyone can call `redeem()` (if price set and contract funded)

**Redemption Logic:**
```solidity
function redeem(address token, uint256 amount) external {
    uint256 pricePerToken = pricePerTokenWei[token];
    require(pricePerToken > 0, "Exit price not set");
    
    // Calculate payout
    uint256 payout = (amount * pricePerToken) / 1e18;
    require(address(this).balance >= payout, "Insufficient funds");
    
    // Burn tokens and send ETH
    IERC20(token).transferFrom(msg.sender, address(this), amount);
    payable(msg.sender).transfer(payout);
}
```

---

### IncomeDistributor

**Purpose:** Distribute yield to token holders

**Capabilities:**
- ✅ Admin deposits income (USDC or other tokens)
- ✅ Users claim proportional share based on token ownership
- ✅ Track claimed amounts per user
- ✅ Support multiple income tokens (USDC, USDT, etc.)

**Access Control:**
- Only owner can call `depositIncome()`
- Anyone can call `claimIncome()` (must hold tokens)

**Distribution Logic:**
```solidity
// Pro-rata distribution based on token ownership
userShare = (userBalance * totalDeposit) / tokenTotalSupply
claimable = userShare - alreadyClaimed
```

---

## What Contracts CANNOT Do

### Critical Limitations

**1. Cannot Override Oracle Verification**
- ❌ No function exists to mark asset as "verified" without oracle
- ❌ Admin cannot bypass `ProofOfReserve.checkReserve()` logic
- ❌ Verification result is entirely determined by Chainlink feed data

**2. Cannot Steal User Funds**
- ❌ Admin cannot transfer user token balances
- ❌ Admin cannot withdraw user-provided liquidity
- ❌ Admin cannot claim user income distributions

**3. Cannot Block User Exits**
- ❌ No function to freeze token transfers (unless token contract has pause)
- ❌ Cannot prevent AMM swaps
- ❌ Cannot block FinalSale redemptions (if price set and funded)

**4. Cannot Modify Token Supplies**
- ❌ Only token contract can mint/burn tokens
- ❌ ProofOfReserve does NOT control token supply
- ❌ Admin can only SET expected supply (for verification), not enforce it

**5. Cannot Upgrade Contracts**
- ❌ Contracts are NOT upgradeable proxies
- ❌ Logic is immutable once deployed
- ❌ Bug fixes require new contract deployment + migration

**6. Cannot Bypass Staleness Checks**
- ❌ MAX_ORACLE_AGE is hardcoded constant (1 hour)
- ❌ Admin cannot disable staleness enforcement
- ❌ No backdoor to accept stale oracle data

**7. Cannot Force Liquidity**
- ❌ No mechanism to require minimum liquidity
- ❌ Cannot prevent liquidity withdrawals
- ❌ Cannot guarantee AMM trading availability

**8. Cannot Guarantee FinalSale Funding**
- ❌ Admin sets exit price but contract checks balance
- ❌ If contract underfunded, redemptions fail (first-come-first-served)
- ❌ No forced funding mechanism

---

## Emergency Controls

### Admin Emergency Powers

**1. Disable Oracle Feed**
```solidity
// Admin can remove oracle feed
oraclePriceFeed.setPriceFeed(token, address(0));
proofOfReserve.setReserveFeed(token, address(0));

// Effect: Verification shows "missing-feed" error
// Does NOT fake verification as passing
```

**2. Reject Asset**
```solidity
// Admin can deactivate asset
approvalQueue.rejectAsset(token, "Reason");

// Effect: active = false in registry
// Marketplace removes asset from listings
// Users can still trade existing tokens
```

**3. Update Oracle Feed**
```solidity
// Admin can switch to alternative Chainlink feed
oraclePriceFeed.setPriceFeed(token, newFeedAddress);
proofOfReserve.setReserveFeed(token, newFeedAddress);

// Effect: Verification uses new feed
// Must be done carefully (wrong feed = wrong verification)
```

**4. Update Expected Supply**
```solidity
// Admin can adjust expected supply
proofOfReserve.setTotalSupply(token, newSupply);

// Effect: Verification checks reserves against new supply
// Used when token supply changes (new minting, burns)
```

**5. Pause Income Deposits (if implemented)**
```solidity
// If pause mechanism exists:
incomeDistributor.pause();

// Effect: No new deposits accepted
// Existing claims still accessible
```

### What Admin CANNOT Do in Emergency

❌ **Cannot force-pass verification** (no override function)  
❌ **Cannot confiscate user tokens** (no transfer control)  
❌ **Cannot prevent withdrawals** (if funds available)  
❌ **Cannot modify contract logic** (not upgradeable)  
❌ **Cannot bypass staleness checks** (hardcoded constant)  

---

## Security Model

### Access Control Matrix

| Function | Admin | User | Anyone | Oracle |
|----------|-------|------|--------|--------|
| Register Asset | ✓ | ✓ | ✓ | ✗ |
| Approve Asset | ✓ | ✗ | ✗ | ✗ |
| Set Oracle Feed | ✓ | ✗ | ✗ | ✗ |
| Check Verification | ✓ | ✓ | ✓ | ✗ |
| Purchase Tokens | ✓ | ✓ | ✓ | ✗ |
| Trade on AMM | ✓ | ✓ | ✓ | ✗ |
| Redeem Tokens | ✓ | ✓ | ✓ | ✗ |
| Claim Income | ✓ | ✓ | ✓ | ✗ |
| Deposit Income | ✓ | ✗ | ✗ | ✗ |

### Trust Assumptions

**Must Trust:**
1. Admin to configure correct oracle feeds
2. Chainlink network to provide accurate data
3. Asset owner to maintain physical reserves
4. Legal system to enforce token ownership rights

**Do NOT Need to Trust:**
1. Admin to manually verify reserves (oracle does this)
2. Admin to allow user exits (always possible)
3. Frontend to remain online (direct contract calls work)
4. Admin to remain active (user operations continue)

### Attack Vectors

**1. Oracle Manipulation**
- **Attack:** Admin sets malicious oracle address
- **Mitigation:** On-chain audit trail, community monitoring
- **Impact:** High (false verification)

**2. Admin Key Compromise**
- **Attack:** Attacker steals admin private key
- **Mitigation:** Multi-sig recommended, monitor admin transactions
- **Impact:** High (can misconfigure oracles, reject assets)

**3. AMM Sandwich Attack**
- **Attack:** Front-run user swap with large trade
- **Mitigation:** Slippage protection, private mempool
- **Impact:** Medium (user gets unfavorable price)

**4. Reentrancy**
- **Attack:** Malicious contract calls back during execution
- **Mitigation:** Checks-effects-interactions pattern, reentrancy guards
- **Impact:** High (could drain funds)

**5. Integer Overflow/Underflow**
- **Attack:** Arithmetic operations exceed uint256 limits
- **Mitigation:** Solidity 0.8+ has built-in overflow protection
- **Impact:** Low (language-level protection)

**6. Frontrun Approval**
- **Attack:** Attacker monitors admin approval transactions
- **Mitigation:** Transparent queue (frontrunning expected)
- **Impact:** Low (no financial advantage to frontrunner)

---

## Function Reference

### AssetRegistry

```solidity
function registerAsset(address token, string memory metadataURI) external
function updateMetadata(uint256 assetId, string memory newURI) external onlyOwner
function getAsset(uint256 assetId) external view returns (Asset memory)
function getAssetByToken(address token) external view returns (Asset memory)
```

### AssetApprovalQueue

```solidity
function submitForApproval(address token) external
function approveAsset(address token) external onlyOwner
function rejectAsset(address token, string memory reason) external onlyOwner
```

### OraclePriceFeed

```solidity
function setPriceFeed(address token, address priceFeed) external onlyOwner
function getPrice(address token) external view returns (int256 price, uint8 decimals)
```

### ProofOfReserve

```solidity
function setReserveFeed(address token, address reserveFeed) external onlyOwner
function setTotalSupply(address token, uint256 totalSupply) external onlyOwner
function checkReserve(address token) public view returns (uint256 reserve, uint256 supply, bool isValid)
function getReserve(address token) external view returns (int256 reserve, uint256 updatedAt)
```

### PrimarySale

```solidity
function createSale(address token, uint256 pricePerToken, uint256 tokensForSale, uint256 startTime, uint256 endTime) external
function purchaseTokens(address token, uint256 amount) external payable
function withdrawFunds(address token) external
function finalizeSale(address token) external
function getSale(address token) external view returns (Sale memory)
```

### AMMPool

```solidity
function addLiquidity(uint256 tokenAmount) external payable returns (uint256 liquidity)
function removeLiquidity(uint256 liquidity) external returns (uint256 tokenAmount, uint256 ethAmount)
function swapETHForTokens(uint256 minTokensOut) external payable returns (uint256 tokensOut)
function swapTokensForETH(uint256 tokenAmount, uint256 minETHOut) external returns (uint256 ethOut)
function getReserves() external view returns (uint256 reserveToken, uint256 reserveETH)
```

### FinalSale

```solidity
function setExitPrice(address token, uint256 pricePerToken) external onlyOwner
function redeem(address token, uint256 amount) external
function pricePerTokenWei(address token) external view returns (uint256)
```

### IncomeDistributor

```solidity
function depositIncome(address assetToken, address incomeToken, uint256 amount) external payable onlyOwner
function claimIncome(address assetToken, address incomeToken) external
function getClaimableIncome(address assetToken, address user, address incomeToken) external view returns (uint256)
function getTotalClaimed(address assetToken, address user) external view returns (uint256)
```

---

## Event Reference

### ProofOfReserve Events

```solidity
event ReserveFeedSet(address indexed token, address feed);
event TotalSupplySet(address indexed token, uint256 amount);
event ReserveVerified(address indexed token, uint256 reserve, uint256 supply, bool isValid);
```

### PrimarySale Events

```solidity
event SaleCreated(address indexed token, uint256 pricePerToken, uint256 tokensForSale, uint256 startTime, uint256 endTime);
event TokensPurchased(address indexed buyer, address indexed token, uint256 amount, uint256 cost);
event FundsWithdrawn(address indexed seller, address indexed token, uint256 amount);
event SaleFinalized(address indexed token);
```

### AMMPool Events

```solidity
event LiquidityAdded(address indexed provider, uint256 tokenAmount, uint256 ethAmount, uint256 liquidity);
event LiquidityRemoved(address indexed provider, uint256 liquidity, uint256 tokenAmount, uint256 ethAmount);
event Swap(address indexed trader, bool ethToToken, uint256 amountIn, uint256 amountOut);
```

### IncomeDistributor Events

```solidity
event IncomeDeposited(address indexed assetToken, address indexed incomeToken, uint256 amount, uint256 timestamp);
event IncomeClaimed(address indexed user, address indexed assetToken, address indexed incomeToken, uint256 amount);
```

---

## Audit Checklist

Before mainnet deployment, verify:

- [ ] No function allows admin to override oracle verification
- [ ] No function allows admin to transfer user tokens
- [ ] Staleness check cannot be bypassed
- [ ] Deviation threshold cannot be manipulated
- [ ] Reentrancy guards on all state-changing functions
- [ ] Access control (onlyOwner) on all admin functions
- [ ] Integer overflow protection (Solidity 0.8+)
- [ ] No unchecked external calls
- [ ] Event emission for all state changes
- [ ] No centralization risks (multi-sig recommended)

---

## Contact & Code Review

**Smart Contract Source:**
- Repository: [GitHub Link]
- Deployment Scripts: `/contracts/deploy/`
- Test Suite: `/contracts/test/`

**Audit Requests:**
- Submit issues: [GitHub Issues]
- Security disclosure: [Security Policy]

---

**Last Updated:** January 4, 2026  
**Version:** 1.0  
**Status:** Testnet - Not Audited

---

**END OF SMART CONTRACT SURFACE DOCUMENTATION**
