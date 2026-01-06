# Architecture Overview (On-chain)

## Contracts and responsibilities
- **AssetRegistry**: source of truth for registered assets (token + metadataURI + owner + active).
- **AssetApprovalQueue**: admin-gated review before an asset can be registered.
- **AssetToken**: ERC20 representing fractionalized asset ownership; contains:
  - income distributor callback on transfer (`handleTokenTransfer`)
  - burn role (`burner`) for exit/redemption flows
- **IncomeDistributor**: ETH-only income distribution via per-share accounting and per-transfer correction.
- **PrimarySale**: sale listing per token; buyers pay ETH, receive tokens from seller via `transferFrom`.
- **AMMPool**: constant-product-like swap pool (ETH <-> token) + liquidity add/remove + pause.
- **FinalSale**: exit contract where users burn tokens and receive ETH payout at an owner-set price.

## Trust boundaries
- Owner-controlled contracts (admin powers): Registry/Queue, FinalSale, AMMPool pause.
- ETH custody:
  - IncomeDistributor holds distributed income until claimed.
  - FinalSale holds liquidity for redemptions.
  - AMMPool holds ETH reserves.

## Key flows
- Asset creation → submit to approval queue → admin approves → submitter registers in registry.
- Income:
  - Admin deposits ETH income to IncomeDistributor for a specific asset token.
  - Users claim income for that token.
- PrimarySale:
  - Seller lists amount + price + time range.
  - Buyer purchases tokens by paying ETH.
- AMM:
  - Liquidity providers seed token+ETH.
  - Traders swap ETH<->token.
- Exit:
  - Owner sets price + deposits liquidity.
  - Users redeem (burn tokens, receive ETH).
