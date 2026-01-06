# Suggested External Audit Scope

## Goal
Assess security and financial correctness of the on-chain protocol and the user flows that move or account for ETH value.

## In scope (recommended)
**Contracts**
- `AssetToken` (transfer hooks, income distributor callback, burn role)
- `IncomeDistributor` (deposit, per-share accounting, claim correctness, transfer correctness)
- `AssetApprovalQueue` (admin gating)
- `AssetRegistry` (registration gate correctness)
- `PrimarySale` (token purchase/payment correctness)
- `AMMPool` (swap math, liquidity accounting, pause controls)
- `FinalSale` (redeem, burn, payout correctness, reentrancy)

**Key properties to verify**
- No loss-of-funds via reentrancy, rounding, accounting drift, or unauthorized access.
- Correct income distribution under transfers (including edge cases: mint/burn/transfer).
- PrimarySale pricing uses correct token-decimal scaling.
- AMM math is consistent and reserves cannot be desynced in harmful ways.
- Exit (FinalSale) payout cannot exceed available liquidity; burn happens correctly.

## Out of scope (typical)
- Frontend UI bugs (unless they lead to signing malicious txs)
- Firebase/Auth logic (unless auditors are willing to include it)

## Deliverables
- Severity-rated findings (Critical/High/Medium/Low/Info)
- Proof-of-concept exploit descriptions for any Critical/High
- Fix verification pass (re-audit) for all addressed issues
- Final signed report

## Assumptions to confirm
- Whether tokens are always 18 decimals (current design assumes 18 in places)
- Whether direct token transfers to AMM pool are considered acceptable
- Operational model for owner keys (multisig? timelock?)
