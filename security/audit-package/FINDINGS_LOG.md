# Internal Findings Log (Pre-Audit)

> This is not an external audit report. It is a living internal log to track known issues and questions for the external auditor.

## Open / Needs Review
- **AMMPool reserve mismatch via direct token transfers**: anyone can transfer tokens directly to the pool and desync `reserveToken` vs actual balance; decide whether acceptable or needs mitigation.
- **Indexer reorg handling**: current approach is “basic” (block-hash check on last processed block). Auditor should confirm adequacy and recommend improvements if needed.
- **Owner key risk**: confirm multisig/timelock requirements.

## Closed
- PrimarySale decimal-scaling bug fixed.
- AssetToken invalid owner revert now matches custom error expectations.
- AMMPool pause mechanism implemented.
