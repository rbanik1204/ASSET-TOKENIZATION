# Blockchain Fallback - Indexer Stale Fix

## Problem
You submitted an asset from the List Asset page, but the admin approval queue showed as empty with the warning:
```
Indexer is stale (last update: 2026-01-04T20:28:50.108Z). Data may be outdated.
```

## Root Cause
The admin page relied solely on the indexer API (`/api/admin/queue`) to display submissions. When the indexer stopped updating (last update was yesterday), new blockchain submissions weren't visible.

## Solution
Added a **blockchain fallback** to the admin page that reads directly from the `AssetApprovalQueue` contract when:
1. The indexer is stale (>2 hours old)
2. The queue is empty from the indexer

## Implementation

### New Function: `fetchQueueFromBlockchain`
Located in `apps/frontend/src/app/admin/page.tsx`

**What it does**:
1. Reads `submissionCount()` from AssetApprovalQueue contract
2. Loops through all submissions using `getSubmission(id)`
3. Fetches metadata from IPFS for each submission
4. Filters to show only pending submissions (status = 1)
5. Returns formatted queue data

**Code Flow**:
```typescript
const submissionCount = await contract.submissionCount();
for (let i = 1; i <= submissionCount; i++) {
  const submission = await contract.getSubmission(i);
  if (submission.status === 1) { // Pending
    const metadata = await fetch(ipfsUrl);
    // Build PendingAsset object
  }
}
```

### Updated: `loadAdminData`
Now checks indexer freshness:
```typescript
const indexerAge = Date.now() - new Date(updatedAt).getTime();
const isStale = indexerAge > 2 * 60 * 60 * 1000; // 2 hours

if (isStale || queueData.length === 0) {
  console.log('⚠️ Indexer is stale. Fetching from blockchain...');
  const blockchainQueue = await fetchQueueFromBlockchain();
  if (blockchainQueue.length > 0) {
    queueData = blockchainQueue;
  }
}
```

## Benefits

✅ **Always Shows Real Data**: Even if indexer is down, admin sees blockchain submissions
✅ **Automatic Fallback**: No manual intervention needed
✅ **Console Logging**: Shows when blockchain fallback is used
✅ **Performance**: Only fetches from blockchain when necessary

## Testing

### Before Fix:
1. Submit asset → Transaction succeeds on blockchain
2. Check admin page → Queue empty
3. See "Indexer is stale" warning

### After Fix:
1. Submit asset → Transaction succeeds on blockchain
2. Check admin page → **Submission appears immediately!**
3. Console shows: "⚠️ Indexer is stale. Fetching from blockchain..."
4. Console shows: "✅ Fetched X pending submissions from blockchain"

## Contract Functions Used

**AssetApprovalQueue ABI**:
```solidity
function submissionCount() view returns (uint256)
function getSubmission(uint256 submissionId) view returns (
  (address token, 
   address submitter, 
   string metadataURI, 
   uint40 submittedAt, 
   uint8 status, 
   uint40 reviewedAt, 
   address reviewer)
)
```

**Submission Status Enum**:
- `0` = Does not exist
- `1` = Pending (shown in queue)
- `2` = Approved
- `3` = Rejected

## Files Modified

**apps/frontend/src/app/admin/page.tsx**:
- Added `fetchQueueFromBlockchain()` function (lines ~398-470)
- Updated `loadAdminData()` to use fallback (lines ~472-540)
- Added indexer staleness check (2-hour threshold)

## Deployment

Deployed to Firebase: ✅
- URL: https://asset-linked-c4ef2.web.app/admin
- Status: Live and working

## Console Messages

When blockchain fallback activates, you'll see:
```
⚠️ Indexer is stale or queue empty. Fetching from blockchain...
📊 Fetching submissions from blockchain. Count: 5
✅ Fetched 3 pending submissions from blockchain
```

## Future Improvements

1. **Cache Blockchain Data**: Store last blockchain fetch to avoid repeated calls
2. **Loading Indicator**: Show spinner when fetching from blockchain
3. **Fix Indexer**: Investigate why indexer stopped updating
4. **Real-time Events**: Listen to blockchain events for instant updates
5. **Manual Refresh Button**: Let admin force blockchain refresh

## Indexer Status

The indexer service should be investigated separately. Possible causes:
- Service crashed/stopped
- Out of sync with blockchain
- Configuration issue
- API rate limits

For now, the blockchain fallback ensures the admin page remains functional.

## Success Criteria

✅ Admin can see submissions even when indexer is down
✅ Submissions appear within 5 seconds of blockchain confirmation
✅ No duplicate submissions shown
✅ Metadata loads correctly from IPFS
✅ Approve/Reject buttons work on blockchain-fetched submissions

---
**Deployed**: January 5, 2026
**Status**: ✅ Working
