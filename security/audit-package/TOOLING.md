# Tooling (Recommended)

## Foundry
- Run tests:
  - `cd contracts`
  - `forge test -vv`

## Slither (static analysis)
- Install (Python):
  - `pip install slither-analyzer`
- Requires solc. Foundry typically manages solc versions.
- Recommended run (from `contracts`):
  - `slither . --config-file ../security/audit-package/slither.config.json`

## Mythril / Echidna (optional)
- Use if your auditor requests; Foundry invariant tests are usually sufficient for first pass.

## Notes
- Treat static analysis results as triage inputs; confirm with manual review and tests.
