# Security Audit Package (Internal Prep)

This folder is an **audit handoff package** intended to accelerate a **real external security audit**.

Important:
- I cannot act as an independent third-party audit firm, and cannot issue a real external attestation.
- This package is designed so an external auditor can quickly understand the system, reproduce tests, and focus on the highest-risk areas.
- 🚨 **DO NOT DEPLOY TO MAINNET** until critical blockers are resolved and an external audit is complete.

## Contents
- `SCOPE.md` — suggested external audit scope + deliverables
- `ARCHITECTURE.md` — contract-level architecture + trust boundaries
- `ROLES_AND_TRUST.md` — owner/admin powers, key risks, and required operational controls
- `THREAT_MODEL.md` — assets, adversaries, attack surfaces, mitigations
- `INVARIANTS.md` — invariants and properties the protocol should satisfy
- `TEST_PLAN.md` — what to test (unit, fuzz, invariant, integration)
- `TOOLING.md` — recommended tools + how to run them (Foundry, Slither, etc.)
- `FINDINGS_LOG.md` — running internal findings list (severity, status)

## Quick Start (Local)
From repo root:

1) Run Foundry tests
- `cd contracts`
- `& "$HOME\\.foundry\\bin\\forge.exe" test -vv`

2) Run the indexer once (local Anvil)
- `cd ..`
- `$env:INDEXER_ONCE='1'; node apps/frontend/scripts/indexer.mjs`

## External Audit Engagement (Suggested)
- Timeline: 2–4 weeks depending on scope.
- Ask for: manual review + automated tools + PoC exploits for any critical issue.
- Require: re-test after fixes and a final signed report.
