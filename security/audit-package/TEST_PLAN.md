# Test Plan

## Unit tests
- All existing Foundry unit tests must pass.

## Fuzz / property tests (recommended additions)
- IncomeDistributor: random sequences of transfer + deposit + claim; ensure no over-claim.
- AMMPool: random add/remove/swap; ensure pause blocks state changes.
- FinalSale: random redeem amounts with price set; ensure payouts bounded.

## Invariant tests (Foundry StdInvariant)
- AMMPool paused behavior invariant.
- PrimarySale cannot over-withdraw.

## Integration checks
- DeployLocal:
  - Demo token registered
  - PrimarySale created
  - AMM pool seeded
  - FinalSale price set + liquidity seeded
- Frontend:
  - Asset detail: PrimarySale buy, AMM buy/sell, Exit redeem.
  - Income: deposit (admin) → claim (user) → indexer shows history.
