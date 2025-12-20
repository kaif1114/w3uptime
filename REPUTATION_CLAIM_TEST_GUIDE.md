# Reputation Claiming System - Test Guide

## What Was Fixed

We fixed the reputation claiming calculation bug where:
- Initial state showed incorrect available points
- After claiming, the math didn't add up correctly
- Second claim attempts failed with "insufficient points" error

### Root Causes Fixed:
1. **Dual tracking system** - GET endpoint read from Transaction table while claim-success wrote to User.claimedReputation
2. **Stale cache** - 30-second cache showed outdated on-chain balances
3. **Missing invalidation** - Cache wasn't refreshed after successful claims

## Test Scenarios

### Scenario 1: Fresh Claim (First Time User)
**Purpose**: Verify new users can claim reputation correctly

**Steps**:
1. Navigate to `/community/reputation`
2. Check displayed values:
   - `Earned` = Total reputation from validation + monitors + deposits + age
   - `Available to claim` = Earned - 0 (should equal Earned)
   - `On-chain` = 0
3. Click "Claim X Points" button
4. Confirm MetaMask transaction
5. Wait for transaction confirmation

**Expected Result**:
- ✅ Available decreases by claimed amount
- ✅ On-chain increases by claimed amount
- ✅ Math: `Earned = Available + On-chain`
- ✅ UI refreshes immediately (no stale data)

### Scenario 2: Sequential Claims
**Purpose**: Test multiple claims in succession

**Steps**:
1. Perform first claim (use Scenario 1)
2. Earn more reputation by:
   - Performing validator work (monitoring tasks)
   - Creating new monitors
   - Or wait a day for age-based points
3. Navigate back to `/community/reputation`
4. Verify `Available to claim` shows new unclaimed points
5. Claim again
6. Verify math still adds up

**Expected Result**:
- ✅ Second claim works correctly
- ✅ No "insufficient points" error
- ✅ User.claimedReputation increments properly
- ✅ On-chain balance shows cumulative total

### Scenario 3: Partial Claim
**Purpose**: Verify calculation when user has both claimed and unclaimed

**Steps**:
1. Start with available = 500 points
2. Claim 200 points (leave 300 unclaimed)
3. Check reputation display:
   - Earned should stay the same
   - Available should be 300
   - On-chain should be 200

**Expected Result**:
- ✅ Math: 500 = 300 (available) + 200 (on-chain)
- ✅ Can claim the remaining 300 points later

### Scenario 4: Cache Refresh
**Purpose**: Verify cache updates correctly

**Steps**:
1. Before claiming, note the on-chain balance
2. Claim reputation
3. Immediately refresh the page (F5)
4. Check on-chain balance

**Expected Result**:
- ✅ On-chain balance shows updated value (not cached old value)
- ✅ Cache TTL is now 10s (faster than old 30s)
- ✅ Query invalidation forces immediate refresh

### Scenario 5: Validation Error Case
**Purpose**: Verify over-claiming prevention

**Steps**:
1. This scenario requires developer console access
2. Try to claim more than available (requires API manipulation)
3. Backend should return 400 error: "Cannot claim more than earned reputation"

**Expected Result**:
- ✅ Validation prevents over-claiming
- ✅ Detailed error logged to console
- ✅ Database remains consistent

### Scenario 6: On-Chain Governance Actions
**Purpose**: Verify claimed reputation is usable for governance

**Steps**:
1. Claim sufficient reputation (>200 points)
2. Navigate to `/community/create`
3. Try to create an on-chain proposal
4. Submit and vote on the proposal

**Expected Result**:
- ✅ Can create proposal if on-chain balance >= 200
- ✅ Can vote if on-chain balance >= 50
- ✅ Reputation is deducted after governance actions

## Verification Checklist

After running all scenarios, verify:

- [ ] `GET /api/reputation` returns consistent data
- [ ] `User.claimedReputation` matches sum of Transaction records
- [ ] On-chain balance from contract matches database
- [ ] Math always adds up: `earned = available + claimed`
- [ ] No stale cache issues (10s TTL working)
- [ ] Query invalidation triggers immediate UI refresh
- [ ] Validation prevents over-claiming
- [ ] Multiple sequential claims work correctly

## How to Check Database Values

Connect to your database and run:

```sql
-- Check user reputation data
SELECT
  "walletAddress",
  "claimedReputation",
  "totalReputation",
  "goodTicks",
  "badTicks",
  "reputationScore"
FROM "User"
WHERE "walletAddress" = 'YOUR_WALLET_ADDRESS';

-- Check transaction history
SELECT
  "type",
  "amount",
  "status",
  "transactionHash",
  "createdAt"
FROM "Transaction"
WHERE "userId" = 'YOUR_USER_ID'
  AND "type" = 'REPUTATION_CLAIM'
ORDER BY "createdAt" DESC;
```

Expected: `claimedReputation` should equal sum of CONFIRMED REPUTATION_CLAIM transactions.

## Debugging Tips

If issues occur:

1. **Check browser console** for errors
2. **Check network tab** to see API responses
3. **Verify MetaMask** is connected to correct network
4. **Check backend logs** for validation errors
5. **Run migration again** if data seems inconsistent:
   ```bash
   npx tsx packages/db/scripts/sync-claimed-reputation.ts
   ```

## Success Criteria

✅ All 6 test scenarios pass
✅ No console errors
✅ Math is always correct: `earned = available + claimed`
✅ UI updates immediately after claims
✅ Second/third claims work without issues
✅ Validation prevents invalid claims

## Changes Summary

**Files Modified**:
1. `packages/db/scripts/sync-claimed-reputation.ts` - Migration script (NEW)
2. `apps/frontend/app/api/reputation/route.ts` - Use User.claimedReputation
3. `apps/frontend/lib/cache/reputation-cache.ts` - Reduced TTL to 10s
4. `apps/frontend/hooks/useClaimReputation.ts` - Added cache invalidation
5. `apps/frontend/app/api/reputation/claim-success/route.ts` - Added validation

**Commits**:
- `17a40c2` - Add data migration script
- `fc348c9` - Fix migration script import path
- `6dcaa41` - Fix GET endpoint to use User.claimedReputation
- `3a74e29` - Reduce cache TTL from 30s to 10s
- `8ea8f4b` - Add cache invalidation after claim
- `4e31334` - Add validation to prevent over-claiming
