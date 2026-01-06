# Invariants & Properties

This is the *spec* for automated and manual review.

## IncomeDistributor
- Claimable + claimed for an account should not exceed its pro-rata share of all deposits (modulo rounding).
- Transfers must not let an account claim income for periods it didn’t hold tokens.
- Total claimed across all users should not exceed total deposited (per token).

## PrimarySale
- Payment required must scale correctly with token decimals (assumes 18 decimals).
- Buyer cannot receive more tokens than listed.
- Seller withdraw cannot exceed total raised.

## AMMPool
- When paused, swap/add/remove must revert.
- `reserveToken` should track actual token balance *under intended usage* (note: direct transfers can break this).
- Reserves cannot go negative; swaps must enforce minimum outputs.

## FinalSale
- Redeem must burn tokens and pay correct ETH amount.
- Redeem must revert if insufficient liquidity.
- No reentrancy-based double payout.

## Registry/Approval
- Asset registration requires approved submission when approval queue is set.
- Submitter mismatch must revert.
