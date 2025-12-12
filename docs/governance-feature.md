# On-Chain Governance Transparency Feature - Implementation Log

**Feature**: Blockchain-verified governance system for W3Uptime with direct on-chain voting
**Branch**: `incentives-Reputation`
**Start Date**: December 12, 2025
**Implementation Approach**: Sequential (Tasks 1-28 with checkpoints every 5 tasks)

---

## Phase 1: Foundation (Tasks 1-5)

### Task 1: Setup and Contract Pattern Review ✅

**Date Completed**: December 12, 2025
**Files Reviewed**: `E:\FYP\w3uptime\contracts\UserTransactions.sol`

**Purpose**: Understand existing smart contract patterns in the codebase before building W3Governance.sol

**Key Patterns Identified**:

1. **Solidity Version**: ^0.8.20
   - Modern Solidity with built-in overflow protection
   - Compatible with OpenZeppelin contracts

2. **OpenZeppelin Imports**:
   ```solidity
   import "@openzeppelin/contracts/access/Ownable.sol";
   import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
   import "@openzeppelin/contracts/security/Pausable.sol";
   import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
   import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
   ```

3. **Custom Errors (Gas Efficient)** (lines 51-59):
   - Replaced `require` statements with custom errors for gas savings
   - Examples: `InvalidAmount()`, `InsufficientContractBalance()`, `InvalidSignature()`
   - Pattern to follow in W3Governance.sol

4. **Comprehensive Event Emissions** (lines 19-48):
   - All state changes emit events with indexed parameters
   - Include timestamp in all events for transparency
   - Events provide complete audit trail
   - Pattern: `event Withdrawal(address indexed user, uint256 amount, uint256 nonce, uint256 timestamp)`

5. **Constructor Validation** (lines 61-73):
   - Validate all constructor parameters before assigning
   - Use custom errors for validation failures
   - Example: `if (_authorizedSigner == address(0)) revert InvalidAddress();`

6. **Security Modifiers**:
   - `nonReentrant` on functions transferring ETH (line 92)
   - `whenNotPaused` for emergency pause capability (line 92)
   - `onlyOwner` for administrative functions

7. **Signature Verification Pattern** (lines 102-106, 122-133):
   - Uses ECDSA.recover() to verify signatures
   - MessageHashUtils.toEthSignedMessageHash() for Ethereum prefix
   - Pattern:
     ```solidity
     bytes32 messageHash = getMessageHash(...);
     bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
     address recoveredSigner = ethSignedMessageHash.recover(signature);
     if (recoveredSigner != authorizedSigner) revert InvalidSignature();
     ```

8. **State Management**:
   - Clear separation between mutable state and view functions
   - Nonce tracking to prevent replay attacks (`mapping(uint256 => bool) public usedNonces`)

9. **Emergency Functions**:
   - Pause/unpause capability for emergency situations (lines 151-157)
   - Emergency withdraw function for contract owner (lines 159-165)

10. **View Functions**:
    - Public view functions for reading contract state (lines 167-172)
    - Helper functions for off-chain verification (lines 122-133)

**Patterns to Replicate in W3Governance.sol**:

✅ Use Solidity ^0.8.20
✅ Import OpenZeppelin: Ownable, ReentrancyGuard, Pausable
✅ Define custom errors for gas efficiency
✅ Emit comprehensive events with indexed parameters and timestamps
✅ Validate all inputs in constructor
✅ Use `nonReentrant` on `vote()` and `finalizeProposal()` functions
✅ Use `whenNotPaused` on voting functions
✅ Include pause/unpause capability for emergencies
✅ Provide view functions for reading proposal and vote data
✅ Use clear, descriptive variable and function names

**Differences for W3Governance.sol**:

- NO signature verification (direct on-chain voting only)
- NO ECDSA imports (users submit votes via transactions, not signatures)
- Voting logic instead of withdrawal logic
- Proposal storage instead of nonce tracking
- Vote counting and finalization logic

**Next Steps**:
- Use these patterns when implementing W3Governance.sol (Task 3)
- Focus on clean, auditable code with comprehensive events
- Prioritize security with ReentrancyGuard and input validation

---

### Task 2: Create Shared Governance Types ✅

**Date Completed**: December 12, 2025
**Files Created**:
- `E:\FYP\w3uptime\packages\common\governance-types.ts` (new file, 293 lines)
- `E:\FYP\w3uptime\packages\common\package.json` (updated exports)

**Purpose**: Define shared TypeScript types for on-chain governance system that can be used across frontend, backend, and contract integration code.

**Exports Created**:

1. **OnChainStatus Enum** (5 states):
   - `DRAFT` - Proposal in database only, not on blockchain
   - `PENDING_ONCHAIN` - Transaction submitted, awaiting confirmation
   - `ACTIVE` - Confirmed on-chain, accepting votes
   - `PASSED` - Finalized with 2/3+ majority
   - `FAILED` - Finalized without passing threshold or quorum

2. **VoteType Enum** (re-exported for convenience):
   - `UPVOTE` - Vote in favor
   - `DOWNVOTE` - Vote against
   - Note: Matches existing Prisma enum

3. **OnChainProposal Interface**:
   - Matches W3Governance.sol Proposal struct exactly
   - All numeric fields use `bigint` (matches Solidity uint256)
   - Fields: id, proposer, contentHash, createdAt, votingEndsAt, upvotes, downvotes, finalized, passed

4. **VoteCastEvent Interface**:
   - Data structure for VoteCast blockchain events
   - Fields: proposalId, voter, support, txHash, blockNumber, timestamp

5. **ProposalFinalizedEvent Interface**:
   - Data structure for ProposalFinalized blockchain events
   - Fields: proposalId, upvotes, downvotes, passed, txHash, blockNumber

**Helper Functions**:

- `voteTypeToSupport(voteType)` - Convert VoteType.UPVOTE/DOWNVOTE to boolean true/false
- `supportToVoteType(support)` - Convert boolean to VoteType enum
- `convertContractToProposal(contractData)` - Parse contract tuple response to typed interface
- `isOnChainStatus(status)` - Type guard for OnChainStatus enum
- `getTotalVotes(proposal)` - Calculate upvotes + downvotes
- `getPassPercentage(proposal)` - Calculate upvote percentage (0-100)
- `meetsPassThreshold(proposal)` - Check if proposal has 2/3+ majority
- `isVotingEnded(proposal)` - Check if current time >= votingEndsAt
- `getTimeRemaining(proposal)` - Seconds remaining until voting ends

**Key Decisions**:

✅ **NO EIP-712 types** - Confirming direct on-chain voting approach (no signatures)
✅ **Use bigint for timestamps/counts** - Matches Solidity uint256, prevents overflow issues
✅ **Comprehensive JSDoc comments** - All exports documented with examples
✅ **Utility functions included** - Common calculations pre-built for reuse
✅ **Type safety** - Proper TypeScript types with type guards

**Package Export**:
- Added `"./governance-types": "./governance-types.ts"` to `packages/common/package.json`
- Can now import via: `import { OnChainStatus, VoteType } from 'common/governance-types'`

**Testing**:
- TypeScript compilation verified (no errors)
- All types align with planned Prisma schema extensions
- Helper functions use safe bigint arithmetic

**Next Steps**:
- Use these types in W3Governance.sol development (Task 3)
- Import in Prisma schema for OnChainStatus enum (Task 6)
- Use in frontend hooks and components (Tasks 18-26)

---

### Task 3: Develop W3Governance Smart Contract ✅

**Date Completed**: December 12, 2025
**Files Created**:
- `E:\FYP\w3uptime\contracts\W3Governance.sol` (new file, 383 lines)

**Purpose**: Create Solidity smart contract for on-chain governance with direct voting mechanism where users pay gas to vote via MetaMask transactions.

**Contract Architecture**:

**1. State Variables**:
- `mapping(uint256 => Proposal) public proposals` - Stores all proposals by ID
- `mapping(uint256 => mapping(address => uint8)) public votes` - Tracks votes (0=not voted, 1=upvote, 2=downvote)
- `uint256 public proposalCount` - Counter for proposal IDs
- `MIN_VOTING_DURATION = 1 days` - Minimum allowed voting period
- `MAX_VOTING_DURATION = 30 days` - Maximum allowed voting period

**2. Proposal Struct**:
```solidity
struct Proposal {
    uint256 id;
    address proposer;
    bytes32 contentHash;      // keccak256 of title + description
    uint256 createdAt;
    uint256 votingEndsAt;
    uint256 upvotes;
    uint256 downvotes;
    bool finalized;
    bool passed;
}
```

**3. Core Functions**:

a. **createProposal(bytes32 contentHash, uint256 votingDuration)**:
   - Creates new proposal on-chain
   - Validates content hash and voting duration
   - Emits ProposalCreated event
   - Returns proposal ID
   - Protected with `whenNotPaused` modifier

b. **vote(uint256 proposalId, bool support)**:
   - Records vote directly on-chain (user pays gas)
   - Prevents double voting via mapping check
   - Updates upvote/downvote counters
   - Emits VoteCast event
   - Protected with `nonReentrant` and `whenNotPaused`

c. **finalizeProposal(uint256 proposalId)**:
   - Anyone can call after voting period ends
   - Calculates pass/fail (2/3 majority required)
   - Marks proposal as finalized
   - Emits ProposalFinalized event
   - Protected with `nonReentrant`

**4. View Functions**:
- `getProposal(uint256 proposalId)` - Returns full proposal details
- `getVote(uint256 proposalId, address voter)` - Checks if address voted and how
- `isVotingActive(uint256 proposalId)` - Returns voting status
- `getVoteCounts(uint256 proposalId)` - Returns upvotes, downvotes, total

**5. Events** (comprehensive for transparency):
```solidity
event ProposalCreated(uint256 indexed proposalId, address indexed proposer, bytes32 contentHash, uint256 votingEndsAt, uint256 timestamp);
event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 timestamp);
event ProposalFinalized(uint256 indexed proposalId, uint256 upvotes, uint256 downvotes, bool passed, uint256 timestamp);
```

**6. Custom Errors** (gas efficient):
- `InvalidProposalId()` - Proposal doesn't exist
- `VotingEnded()` - Voting period has closed
- `AlreadyVoted()` - User already voted on this proposal
- `ProposalNotFound()` - Proposal ID not found
- `VotingNotEnded()` - Trying to finalize before voting ends
- `AlreadyFinalized()` - Proposal already finalized
- `InvalidVotingDuration()` - Duration outside allowed range
- `EmptyContentHash()` - Content hash is zero

**7. Security Features**:
✅ ReentrancyGuard on vote() and finalizeProposal()
✅ Pausable for emergency situations
✅ Double vote prevention via mapping
✅ Input validation with custom errors
✅ onlyOwner for pause/unpause functions

**Key Implementation Details**:

- **Direct On-Chain Voting**: NO signature verification, users call vote() directly via MetaMask
- **Gas Payment**: Users pay their own gas fees for voting (platform doesn't pay)
- **Vote Counting**: Stored on-chain in Proposal struct (upvotes, downvotes counters)
- **Finalization Logic**: `upvotes * 3 >= totalVotes * 2` (integer math for 2/3 majority)
- **No Quorum Check in Contract**: Quorum will be checked off-chain before calling finalize
- **Vote Storage**: `mapping(uint256 => mapping(address => uint8))` - efficient storage (0/1/2)
- **Immutable Votes**: Once cast, votes cannot be changed (no vote change functionality)

**Differences from UserTransactions.sol**:
- ✅ NO ECDSA signature verification (direct transactions instead)
- ✅ NO MessageHashUtils imports (not needed for direct voting)
- ✅ Different state structure (proposals instead of withdrawals)
- ✅ Vote counting logic instead of nonce tracking
- ✅ Same security patterns (ReentrancyGuard, Pausable, custom errors)

**Testing Plan** (for Task 4 deployment):
1. Compile in Remix IDE with Solidity ^0.8.20
2. Deploy to Sepolia testnet
3. Create test proposal and verify ProposalCreated event
4. Vote from multiple addresses and verify VoteCast events
5. Test double vote prevention
6. Test voting after deadline (should revert)
7. Finalize proposal and verify result calculation
8. Test pause/unpause functionality

**Next Steps**:
- Deploy contract to Sepolia via Remix IDE (Task 4)
- Verify source code on Sepolia Etherscan
- Extract ABI for TypeScript integration (Task 5)

---

