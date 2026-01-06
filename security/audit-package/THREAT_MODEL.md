# Threat Model

## Assets to protect
- User funds (ETH in swaps/sales/redeems)
- Distributed income (ETH in IncomeDistributor)
- Token balances and integrity of accounting

## Adversaries
- External attacker with no privileges
- Malicious asset issuer
- Malicious liquidity provider / trader
- Compromised admin/owner key

## Attack surfaces
- Reentrancy on ETH transfers (FinalSale redeem, PrimarySale refunds/withdraws, AMM swaps)
- Price/decimal scaling mistakes (PrimarySale, FinalSale)
- Accounting drift (IncomeDistributor per-transfer corrections)
- Denial of service (pause misuse, large log ranges, gas griefing)
- Direct token transfers to AMM pool (reserve mismatch)

## Mitigations present
- FinalSale uses ReentrancyGuard.
- AMMPool has explicit pause and checks.
- Registry has approval gate enforcement.

## Mitigations to consider
- Explicit handling for tokens sent directly to AMM pool (either disallow, or sync reserves).
- Additional invariant tests on accounting.
- Owner controls protected by multisig/timelock.
