# Roles, Privileges, and Operational Controls

## Owners / Admins
- **AssetRegistry owner** can set approval queue.
- **AssetApprovalQueue owner** can approve/reject submissions.
- **FinalSale owner** can set redemption price and deposit liquidity.
- **AMMPool owner** can pause/unpause.

## Key risks
- Owner key compromise can:
  - Approve malicious assets
  - Set abusive FinalSale prices
  - Pause AMM unexpectedly

## Recommended operational controls
- Use multisig for owner roles (2/3 or 3/5).
- Consider timelocks for sensitive changes (prices, pausing, governance updates).
- Maintain incident response playbook (pause AMM, halt sales, communicate).
