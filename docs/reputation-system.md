# W3Uptime Reputation System Documentation

## Table of Contents
1. [Reputation System Overview](#reputation-system-overview)
2. [How Reputation is Earned](#how-reputation-is-earned)
3. [Reputation Requirements and Thresholds](#reputation-requirements-and-thresholds)
4. [Lazy Claiming Pattern Architecture](#lazy-claiming-pattern-architecture)
5. [Gas Efficiency Benefits](#gas-efficiency-benefits)
6. [User Guide: Claiming Reputation](#user-guide-claiming-reputation)
7. [API Reference](#api-reference)
8. [Technical Implementation Details](#technical-implementation-details)

---

## Reputation System Overview

W3Uptime implements a **dual-source reputation model** that tracks user contributions both as validators (performing monitoring work) and as customers (using monitoring services). The system uses a **lazy claiming pattern** where reputation is earned and tracked off-chain in the database, and users manually claim their reputation on-chain when needed for governance actions.

### Key Concepts

- **Off-Chain Tracking**: Reputation is calculated in real-time from database state (validations, monitors, deposits, account age)
- **Lazy Claiming**: Users must explicitly claim reputation via blockchain transaction to use it for governance
- **On-Chain Balance**: Claimed reputation is stored in the W3Governance smart contract
- **Gas Efficiency**: Users only pay gas once when claiming, rather than for every reputation-earning action

### Why Lazy Claiming?

The lazy claiming pattern provides significant cost savings:
- **Without lazy claiming**: Each validation would require a blockchain transaction (~$0.50-2 each)
- **With lazy claiming**: 1000 validations = 1 claim transaction when needed (~$2-5 total)
- **User control**: Claim only when reaching governance thresholds (200 points for proposals, 50 for voting)

---

## How Reputation is Earned

Reputation is earned through two primary activities: **validator work** and **customer engagement**.

### Validator Activity

**File**: `apps/hub/src/services/reputation.ts`

Validators earn reputation through:

#### 1. Signature Validations (Good Ticks)
- **Award**: +1 point per successful signature validation
- **Function**: `applyGoodTick(publicKey)` (lines 22-39)
- **Also updates**: Increments `totalReputation` field for claiming

#### 2. Uptime Checks
- **Award**: +1 point per successful uptime check (status = 'GOOD')
- **Penalty**: -1 point per failed uptime check (status = 'BAD')
- **Functions**: 
  - `applyUptimeCheckReward(publicKey)` 
  - `applyUptimeCheckPenalty(publicKey)`
- **Location**: `apps/hub/src/services/monitorDistribution.ts` (callback integration)

#### 3. Bad Ticks (Penalties)
- **Penalty**: -2 points per failed signature validation
- **Function**: `applyBadTick(publicKey)` (lines 41-57)
- **Constant**: `BAD_TICK_PENALTY = 2`

**Validator Score Formula**:
```typescript
validatorScore = goodTicks - (BAD_TICK_PENALTY * badTicks)
// Where BAD_TICK_PENALTY = 2
```

### Customer Activity

**File**: `apps/frontend/app/api/proposals/ReputationGuard.ts`

Customers earn reputation through:

#### 1. Monitor Ownership
- **Award**: +20 points per active monitor
- **Function**: `scoreFromMonitors(count)` (lines 10-18)
- **Calculation**: Each monitor contributes 20 points

#### 2. Deposit Amounts
- **Tiered Scoring**:
  - < 0.1 ETH: 0 points
  - 0.1 - 1 ETH: 1 point
  - 1 - 5 ETH: 2 points
  - ≥ 5 ETH: 3 points
- **Function**: `scoreFromDepositsWei(totalWei)` (lines 20-25)
- **Note**: Based on total confirmed deposits

#### 3. Account Age
- **Award**: +5 points per day since account creation
- **Function**: `scoreFromAge(days)` (lines 27-36)
- **Example**: 10-day-old account = 50 points

**Customer Score Formula**:
```typescript
customerScore = monitorScore + depositScore + ageScore
```

**Total Reputation Formula**:
```typescript
totalScore = validatorScore + customerScore
```

---

## Reputation Requirements and Thresholds

**File**: `apps/frontend/app/api/proposals/ReputationGuard.ts` (lines 5-7)

The platform enforces minimum reputation requirements for governance actions:

| Action | Minimum Reputation | Enforcement Location |
|--------|-------------------|---------------------|
| **Create Proposal** | 200 points | `MIN_REP_FOR_PROPOSAL` |
| **Comment on Proposal** | 100 points | `MIN_REP_FOR_COMMENT` |
| **Vote on Proposal** | 50 points | `MIN_REP_FOR_VOTE` |

### On-Chain Enforcement

For **on-chain governance** (proposals with `onChainStatus = "ACTIVE"`):
- Reputation requirements are enforced by checking the user's **on-chain balance** from the W3Governance contract
- Users must claim sufficient reputation before creating on-chain proposals or voting
- The smart contract deducts reputation when governance actions are performed:
  - Creating proposal: -500 reputation points (`PROPOSAL_REPUTATION_COST`)
  - Casting vote: -100 reputation points (`VOTE_REPUTATION_COST`)

**Contract Location**: `contracts/W3Governance.sol` (lines 81-84)

### Off-Chain Enforcement

For **off-chain governance** (proposals with `onChainStatus = "DRAFT"`):
- Reputation is checked from the database calculation
- No blockchain transaction required
- No gas costs

---

## Lazy Claiming Pattern Architecture

### Off-Chain Tracking

**Database Schema**: `packages/db/prisma/schema.prisma`

```prisma
model User {
  id                  String    @id @default(uuid())
  walletAddress       String    @unique
  publicKey           String    @unique
  
  // Reputation tracking fields
  goodTicks           Int       @default(0)    // Successful validations
  badTicks            Int       @default(0)    // Failed validations
  reputationScore     Int       @default(0)    // Computed score
  totalReputation     Int       @default(0)    // Total earned (claimable)
  claimedReputation   Int       @default(0)    // Already claimed on-chain
  lastClaimAt         DateTime?                // Last claim timestamp
  
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}
```

**Real-Time Updates**:
- Hub WebSocket server updates reputation instantly as validators perform work
- Formula computed in `apps/hub/src/services/reputation.ts`
- No blockchain transactions during earning phase

**API for Checking Balance**:
- **Endpoint**: `GET /api/reputation`
- **Returns**: Current earned, claimed, and available reputation
- **Location**: `apps/frontend/app/api/reputation/route.ts`

### On-Chain Claiming

**Contract Function**: `W3Governance.claimReputation()`
**Location**: `contracts/W3Governance.sol`

```solidity
function claimReputation(
    uint256 amount,
    uint256 nonce,
    uint256 expiry,
    bytes memory signature
) external nonReentrant whenNotPaused
```

**Claiming Flow**:
1. User requests claim signature from backend: `POST /api/reputation/claim`
2. Backend validates unclaimed reputation amount
3. Backend generates cryptographic signature using platform signer
4. User submits transaction to smart contract with signature
5. Contract verifies signature and credits reputation balance
6. Backend updates `claimedReputation` field after confirmation

**Gas Costs**:
- Estimated: 50,000-80,000 gas per claim
- Cost on Sepolia: ~0.001-0.002 ETH
- Cost on mainnet (estimated): ~$2-5 depending on gas prices

---

## Gas Efficiency Benefits

### Cost Comparison

**Scenario**: Validator performs 1000 monitoring validations

#### Real-Time On-Chain Updates (Hypothetical)
- Each validation triggers blockchain transaction
- Gas per transaction: ~50,000 gas
- Total gas: 50,000,000 gas
- Cost at 50 gwei: ~2.5 ETH (~$5,000-10,000)
- **Impractical for micro-rewards**

#### Lazy Claiming (Current Implementation)
- All 1000 validations tracked off-chain (free)
- User claims once when needed: ~80,000 gas
- Cost at 50 gwei: ~0.004 ETH (~$8-15)
- **99.84% cost reduction**

### Additional Benefits

1. **Batching**: Users can accumulate reputation and claim in batches
2. **Threshold Optimization**: Only claim when reaching governance participation thresholds
3. **No Wasted Gas**: Users who don't participate in governance never pay gas
4. **Scalability**: System can handle millions of reputation-earning actions without blockchain congestion

---

## User Guide: Claiming Reputation

### Prerequisites
- MetaMask or compatible Web3 wallet installed
- Wallet connected to Sepolia testnet (for testing) or Ethereum mainnet (production)
- Earned reputation available to claim (check via reputation dashboard)

### Step-by-Step Claiming Process

#### Step 1: View Reputation Dashboard
1. Navigate to the Community/Governance section
2. Click on your profile or reputation indicator
3. View the **Reputation Display** card showing:
   - **Earned**: Total reputation from all activities
   - **Available to claim**: Amount not yet claimed on-chain
   - **On-chain**: Current blockchain balance

**Component**: `apps/frontend/components/governance/ReputationDisplay.tsx`

#### Step 2: Initiate Claim
1. Click the **"Claim X Points"** button
2. The `ReputationClaimModal` opens showing:
   - Available reputation to claim
   - Estimated gas cost in SEP/ETH
3. Review the transaction details

**Component**: `apps/frontend/components/governance/ReputationClaimModal.tsx`

#### Step 3: Connect Wallet
- System automatically connects to MetaMask
- Verifies you're on the correct network (Sepolia/Mainnet)
- Confirms your wallet address matches your account

#### Step 4: Backend Signature Generation
The modal automatically:
1. Calls `POST /api/reputation/claim` endpoint
2. Backend validates you have unclaimed reputation
3. Backend generates cryptographic signature using platform signer
4. Signature includes: amount, nonce, expiry (15 minutes), your address

**Hook**: `apps/frontend/hooks/useClaimReputation.ts`

#### Step 5: Blockchain Transaction
1. MetaMask popup appears with transaction details
2. Review gas estimate and total cost
3. Click **"Confirm"** in MetaMask
4. Wait for transaction confirmation (15-30 seconds on Sepolia)

#### Step 6: Confirmation
- Success message appears with green checkmark
- **"View on Etherscan"** link to verify transaction
- Reputation dashboard automatically refreshes
- On-chain balance updated

### Progress Indicators

During the claim process, you'll see these status messages:
1. "Connecting to wallet..."
2. "Fetching claim signature..."
3. "Preparing claim transaction..."
4. "Claiming reputation..."
5. "Waiting for confirmation..."
6. "Transaction confirmed!"

### Common Issues

**"MetaMask is not installed"**
- Install MetaMask browser extension
- Refresh the page and try again

**"Insufficient ETH for gas fees"**
- Add Sepolia ETH to your wallet from a faucet
- For mainnet, purchase ETH

**"No unclaimed reputation available"**
- You've already claimed all earned reputation
- Earn more through validator activities or monitor ownership

**"Claim signature expired"**
- Signature is valid for 15 minutes
- Close modal and try again to get fresh signature

---

## API Reference

### GET /api/reputation

Returns comprehensive reputation data for the authenticated user.

**Authentication**: Required (session cookie)

**Response**:
```json
{
  "success": true,
  "data": {
    "earned": 450,
    "claimed": 200,
    "available": 250,
    "onChainBalance": 200,
    "breakdown": {
      "totalScore": 450,
      "validatorScore": 280,
      "customerScore": 170,
      "monitorScore": 100,
      "depositScore": 2,
      "ageScore": 68
    }
  }
}
```

**Fields**:
- `earned`: Total reputation earned from all activities
- `claimed`: Amount transferred to on-chain balance
- `available`: Earned - claimed (amount available to claim)
- `onChainBalance`: Current balance from W3Governance contract (cached 30s)
- `breakdown`: Detailed reputation sources

**Location**: `apps/frontend/app/api/reputation/route.ts`

---

### POST /api/reputation/claim

Generates a cryptographic signature for claiming reputation on-chain.

**Authentication**: Required (session cookie)

**Rate Limiting**: 3 attempts per hour per user

**Response**:
```json
{
  "success": true,
  "data": {
    "signature": "0x1234...",
    "nonce": "1702345678000",
    "expiry": "1702346278",
    "amount": 250,
    "userAddress": "0xabc...",
    "breakdown": {
      "totalScore": 450,
      "validatorScore": 280,
      "customerScore": 170,
      "monitorScore": 100,
      "depositScore": 2,
      "ageScore": 68
    }
  }
}
```

**Fields**:
- `signature`: Cryptographic signature from platform signer
- `nonce`: Unique identifier to prevent replay attacks
- `expiry`: Unix timestamp when signature expires (15 minutes)
- `amount`: Unclaimed reputation amount
- `userAddress`: User's wallet address
- `breakdown`: Reputation breakdown for transparency

**Usage**:
The frontend uses this signature to call `W3Governance.claimReputation()` smart contract function via MetaMask.

**Location**: `apps/frontend/app/api/reputation/claim/route.ts`

---

### POST /api/reputation/claim-success

Records successful claim in database after on-chain transaction confirmation.

**Authentication**: Required (session cookie)

**Request Body**:
```json
{
  "transactionHash": "0x5678...",
  "amount": 250
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Reputation claim recorded successfully",
    "transactionHash": "0x5678..."
  }
}
```

**Location**: `apps/frontend/app/api/reputation/claim-success/route.ts`

---

## Technical Implementation Details

### Database Fields

**User Model** (`packages/db/prisma/schema.prisma`):

| Field | Type | Purpose | Default |
|-------|------|---------|---------|
| `goodTicks` | Int | Successful validations counter | 0 |
| `badTicks` | Int | Failed validations counter | 0 |
| `reputationScore` | Int | Computed reputation score | 0 |
| `totalReputation` | Int | Total earned (available to claim) | 0 |
| `claimedReputation` | Int | Amount claimed on-chain | 0 |
| `lastClaimAt` | DateTime? | Last claim timestamp | null |

### Reputation Calculation Algorithm

**Location**: `apps/frontend/app/api/proposals/ReputationGuard.ts` (lines 47-106)

```typescript
function computeReputation(userId: string): ReputationBreakdown {
  // 1. Fetch user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      goodTicks: true,
      badTicks: true,
      _count: { select: { monitors: true } }
    }
  });
  
  // 2. Calculate validator score
  const validatorScore = goodTicks - (BAD_TICK_PENALTY * badTicks);
  
  // 3. Calculate customer scores
  const monitorScore = monitorCount * 20;
  
  const totalDepositsWei = sumOfConfirmedDeposits();
  const depositScore = scoreFromDepositsWei(totalDepositsWei);
  // 0 points: < 0.1 ETH
  // 1 point:  0.1-1 ETH
  // 2 points: 1-5 ETH
  // 3 points: ≥ 5 ETH
  
  const ageDays = (now - user.createdAt) / (1000 * 60 * 60 * 24);
  const ageScore = Math.floor(ageDays) * 5;
  
  // 4. Sum all components
  const customerScore = monitorScore + depositScore + ageScore;
  const totalScore = validatorScore + customerScore;
  
  return { totalScore, validatorScore, customerScore, ... };
}
```

### Smart Contract Integration

**Contract Address**: Deployed on Sepolia at `0xe74cedb2ec8ca7607f95297e938078e4ebae304f`

**Key Functions**:

```solidity
// Claim reputation with backend signature
function claimReputation(
    uint256 amount,
    uint256 nonce,
    uint256 expiry,
    bytes memory signature
) external nonReentrant whenNotPaused

// View on-chain reputation balance
function reputationPoints(address user) external view returns (uint256)

// Deduct reputation when creating proposal
function createProposal(bytes32 contentHash, uint256 votingDuration) 
    external whenNotPaused
// Deducts PROPOSAL_REPUTATION_COST (500 points)

// Deduct reputation when voting
function vote(uint256 proposalId, bool support) 
    external nonReentrant whenNotPaused  
// Deducts VOTE_REPUTATION_COST (100 points)
```

### Frontend Hooks

**useOnChainReputation** (`apps/frontend/hooks/useOnChainReputation.ts`):
- Fetches current on-chain balance and available to claim
- Checks if user meets thresholds for governance actions
- Returns `canCreateProposal` and `canVote` boolean flags
- Caches for 30 seconds (aligned with backend cache)

**useClaimReputation** (`apps/frontend/hooks/useClaimReputation.ts`):
- TanStack Query mutation for claiming reputation
- Handles full flow: signature fetch → MetaMask transaction → database update
- Provides progress callbacks for UI updates
- Automatically invalidates reputation queries on success

### Components

**ReputationDisplay** (`apps/frontend/components/governance/ReputationDisplay.tsx`):
- Displays earned, available, and on-chain reputation
- Shows breakdown by source (validator, customer, monitors, deposits, age)
- Claim button triggers modal

**ReputationClaimModal** (`apps/frontend/components/governance/ReputationClaimModal.tsx`):
- Modal dialog for claiming reputation
- Shows gas estimate before transaction
- Real-time progress updates
- Success state with Etherscan link

### Governance UI Integration

**CreateProposalForm** (`apps/frontend/app/(user)/community/create/CreateProposalForm.tsx`):
- Checks on-chain reputation when `createOnChain` is enabled
- Displays warning if user has < 200 REP
- Shows available claimable reputation with link to claim
- Disables submit button when insufficient reputation

**ProposalDetailClient** (`apps/frontend/app/(user)/community/[id]/ProposalDetailClient.tsx`):
- Checks on-chain reputation for voting on active proposals
- Displays warning if user has < 50 REP
- Shows available claimable reputation with link to claim
- Disables vote buttons when insufficient reputation

---

## Security Considerations

### Signature Verification

**Backend Signer**:
- Platform maintains an authorized signer private key
- Stored in environment variable: `AUTHORIZED_SIGNER_PRIVATE_KEY`
- Same pattern as `UserTransactions.sol` contract

**Message Hash Format**:
```typescript
messageHash = keccak256(abi.encodePacked(
    userAddress,
    amount,
    nonce,
    expiry
));
```

**Verification**:
- Smart contract recovers signer from signature
- Compares with stored `platformSigner` address
- Rejects if mismatch

### Replay Attack Prevention

1. **Nonces**: Each claim uses unique nonce
2. **Expiry**: Signatures valid for 15 minutes only
3. **Used Nonce Tracking**: Contract maintains `usedReputationNonces` mapping
4. **Database Updates**: `claimedReputation` incremented after successful claim

### Rate Limiting

- Maximum 3 claim attempts per hour per user
- Prevents abuse and excessive API calls
- Implemented in `POST /api/reputation/claim` endpoint

---

## Maintenance and Monitoring

### Database Maintenance

**Checking Consistency**:
```sql
-- Verify totalReputation >= claimedReputation for all users
SELECT id, totalReputation, claimedReputation 
FROM "User" 
WHERE totalReputation < claimedReputation;
-- Should return 0 rows

-- Find users with high unclaimed reputation
SELECT id, walletAddress, (totalReputation - claimedReputation) AS unclaimed
FROM "User"
WHERE (totalReputation - claimedReputation) > 1000
ORDER BY unclaimed DESC
LIMIT 10;
```

### On-Chain Monitoring

**Verify Contract State**:
```typescript
import { getOnChainReputationBalance } from '@/lib/contracts/reputation-contract';

// Check user's on-chain balance
const balance = await getOnChainReputationBalance(userWalletAddress);
console.log(`On-chain balance: ${balance.toString()} points`);
```

**Event Monitoring**:
Listen for `ReputationClaimed` events to track claiming activity:
```typescript
contract.on("ReputationClaimed", (user, amount, event) => {
  console.log(`User ${user} claimed ${amount} reputation`);
  console.log(`Transaction: ${event.transactionHash}`);
});
```

### Alerts and Logging

**Backend Logs** (`apps/hub/src/services/reputation.ts`):
- Every reputation award logged with user ID and amount
- Example: `"Reputation awarded: User abc123 earned 1 points for uptime check (new total: 450)"`

**Frontend Errors**:
- Failed claim attempts logged to console
- User-friendly error messages displayed in UI
- Sentry/error tracking integration recommended

---

## Future Enhancements

### Potential Improvements

1. **Reputation Decay**: Implement time-based reputation decay to incentivize ongoing participation
2. **Reputation Staking**: Allow users to stake reputation for enhanced governance weight
3. **Delegation**: Enable users to delegate their reputation voting power to trusted validators
4. **Reputation Leaderboard**: Public leaderboard showing top reputation holders
5. **Achievement Badges**: NFT badges for reaching reputation milestones
6. **Cross-Chain Reputation**: Bridge reputation to other networks (Polygon, Arbitrum)

### Scaling Considerations

For production deployment:
- Implement Redis caching for reputation calculations (currently computed on-demand)
- Add indexing on `totalReputation` and `claimedReputation` fields
- Consider snapshot-based reputation calculation for large user bases
- Implement batch claiming for users with very high unclaimed amounts

---

## Related Documentation

- **Governance Feature**: `docs/governance-feature.md`
- **Governance Transparency**: `docs/governance-transparency.md`
- **Smart Contract**: `contracts/W3Governance.sol`
- **PRD**: `docs/prd.txt`

---

## Quick Reference

### Constants

```typescript
// Reputation Earning
BAD_TICK_PENALTY = 2                  // Penalty multiplier for bad ticks
POINTS_PER_REP = 100                  // Conversion factor (unused currently)
UPTIME_CHECK_REWARD = 1               // Points per successful uptime check
FAILED_UPTIME_CHECK_PENALTY = 1       // Penalty for failed uptime check

// Customer Activity
MONITOR_POINTS = 20                   // Points per active monitor
AGE_POINTS_PER_DAY = 5               // Points per day of account age

// Governance Thresholds (Off-Chain)
MIN_REP_FOR_PROPOSAL = 200           // Minimum to create proposal
MIN_REP_FOR_COMMENT = 100            // Minimum to comment
MIN_REP_FOR_VOTE = 50                // Minimum to vote

// Governance Costs (On-Chain)
PROPOSAL_REPUTATION_COST = 500       // Deducted when creating on-chain proposal
VOTE_REPUTATION_COST = 100           // Deducted when voting on-chain
```

### Key File Locations

```
Core Logic:
├── apps/hub/src/services/reputation.ts          # Reputation earning logic
├── apps/frontend/app/api/proposals/ReputationGuard.ts  # Reputation calculation
└── contracts/W3Governance.sol                    # Smart contract

Frontend Components:
├── apps/frontend/components/governance/ReputationDisplay.tsx       # Dashboard card
├── apps/frontend/components/governance/ReputationClaimModal.tsx    # Claim modal
├── apps/frontend/hooks/useClaimReputation.ts                       # Claim logic
└── apps/frontend/hooks/useOnChainReputation.ts                     # Balance check

API Endpoints:
├── apps/frontend/app/api/reputation/route.ts                # GET reputation data
├── apps/frontend/app/api/reputation/claim/route.ts          # POST get signature
└── apps/frontend/app/api/reputation/claim-success/route.ts  # POST record claim

Integration:
├── apps/hub/src/services/monitorDistribution.ts  # Uptime check rewards
└── apps/frontend/lib/contracts/claim-reputation-contract.ts  # Contract helpers
```

---

## Support

For questions or issues:
- Review error messages in browser console (F12)
- Check Sepolia Etherscan for transaction details
- Verify wallet connected to correct network
- Ensure sufficient ETH for gas fees
- Contact platform administrators for signature generation issues

---

**Last Updated**: December 2025  
**Version**: 1.0  
**Network**: Sepolia Testnet (for testing)

