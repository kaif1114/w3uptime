/**
 * Shared TypeScript types for on-chain governance system
 *
 * This module provides type definitions for the W3Uptime on-chain governance
 * feature where users vote directly on the blockchain via MetaMask transactions.
 *
 * Key principles:
 * - NO EIP-712 signature types (direct on-chain voting only)
 * - Types match Solidity contract structs for consistency
 * - Helper functions for type conversions between TS and Solidity
 */

/**
 * On-chain proposal status lifecycle
 *
 * Flow: DRAFT → PENDING_ONCHAIN → ACTIVE → (PASSED | FAILED)
 */
export enum OnChainStatus {
  /** Proposal created in database but not yet submitted to blockchain */
  DRAFT = 'DRAFT',

  /** Transaction submitted to blockchain, awaiting confirmation */
  PENDING_ONCHAIN = 'PENDING_ONCHAIN',

  /** Proposal confirmed on-chain and accepting votes */
  ACTIVE = 'ACTIVE',

  /** Voting ended, proposal passed (2/3+ majority) */
  PASSED = 'PASSED',

  /** Voting ended, proposal failed (<2/3 majority or no quorum) */
  FAILED = 'FAILED',
}

/**
 * Vote type enum (matches Prisma VoteType)
 * Re-exported for convenience in governance code
 */
export enum VoteType {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE',
}

/**
 * On-chain proposal data structure
 * Matches the Proposal struct in W3Governance.sol smart contract
 */
export interface OnChainProposal {
  /** Unique proposal ID on blockchain (incrementing counter) */
  id: bigint;

  /** Ethereum address of proposal creator */
  proposer: string;

  /** keccak256 hash of proposal title + description for verification */
  contentHash: string;

  /** Unix timestamp when proposal was created on-chain */
  createdAt: bigint;

  /** Unix timestamp when voting period ends */
  votingEndsAt: bigint;

  /** Total number of upvotes received */
  upvotes: bigint;

  /** Total number of downvotes received */
  downvotes: bigint;

  /** Whether proposal has been finalized */
  finalized: boolean;

  /** Whether proposal passed (only valid if finalized=true) */
  passed: boolean;
}

/**
 * Vote cast event data
 * Emitted by W3Governance contract when a vote is recorded
 */
export interface VoteCastEvent {
  /** Proposal ID that was voted on */
  proposalId: number;

  /** Ethereum address of the voter */
  voter: string;

  /** Vote direction (true = upvote, false = downvote) */
  support: boolean;

  /** Transaction hash where vote was recorded */
  txHash: string;

  /** Block number where transaction was included */
  blockNumber: number;

  /** Optional: Block timestamp (can be fetched from block) */
  timestamp?: bigint;
}

/**
 * Proposal finalized event data
 * Emitted when voting ends and final results are tallied
 */
export interface ProposalFinalizedEvent {
  /** Proposal ID that was finalized */
  proposalId: number;

  /** Final upvote count */
  upvotes: bigint;

  /** Final downvote count */
  downvotes: bigint;

  /** Whether proposal passed */
  passed: boolean;

  /** Transaction hash of finalization */
  txHash: string;

  /** Block number of finalization */
  blockNumber: number;
}

/**
 * Convert VoteType enum to boolean for smart contract calls
 *
 * @param voteType - UPVOTE or DOWNVOTE enum value
 * @returns true for UPVOTE, false for DOWNVOTE
 *
 * @example
 * voteTypeToSupport(VoteType.UPVOTE)  // returns true
 * voteTypeToSupport(VoteType.DOWNVOTE) // returns false
 */
export function voteTypeToSupport(voteType: VoteType): boolean {
  return voteType === VoteType.UPVOTE;
}

/**
 * Convert boolean support value from contract to VoteType enum
 *
 * @param support - Boolean from contract (true = upvote, false = downvote)
 * @returns VoteType enum value
 *
 * @example
 * supportToVoteType(true)  // returns VoteType.UPVOTE
 * supportToVoteType(false) // returns VoteType.DOWNVOTE
 */
export function supportToVoteType(support: boolean): VoteType {
  return support ? VoteType.UPVOTE : VoteType.DOWNVOTE;
}

/**
 * Convert contract proposal tuple to typed OnChainProposal interface
 *
 * Smart contracts return data as arrays/tuples. This function converts
 * the raw contract response to a properly typed TypeScript interface.
 *
 * @param contractData - Raw data from contract.getProposal() call
 * @returns Typed OnChainProposal object
 *
 * @example
 * const rawData = await contract.getProposal(1);
 * const proposal = convertContractToProposal(rawData);
 * console.log(proposal.upvotes); // typed as bigint
 */
export function convertContractToProposal(contractData: unknown): OnChainProposal {
  // Contract returns tuple: [id, proposer, contentHash, createdAt, votingEndsAt, upvotes, downvotes, finalized, passed]
  if (!Array.isArray(contractData) || contractData.length < 9) {
    throw new Error('Invalid contract data: expected array with 9 elements');
  }

  return {
    id: BigInt(contractData[0]),
    proposer: String(contractData[1]),
    contentHash: String(contractData[2]),
    createdAt: BigInt(contractData[3]),
    votingEndsAt: BigInt(contractData[4]),
    upvotes: BigInt(contractData[5]),
    downvotes: BigInt(contractData[6]),
    finalized: Boolean(contractData[7]),
    passed: Boolean(contractData[8]),
  };
}

/**
 * Type guard to check if a status is an on-chain status
 *
 * @param status - Status string to check
 * @returns true if status is a valid OnChainStatus enum value
 */
export function isOnChainStatus(status: string): status is OnChainStatus {
  return Object.values(OnChainStatus).includes(status as OnChainStatus);
}

/**
 * Calculate total votes for a proposal
 *
 * @param proposal - OnChainProposal object
 * @returns Total vote count (upvotes + downvotes)
 */
export function getTotalVotes(proposal: OnChainProposal): bigint {
  return proposal.upvotes + proposal.downvotes;
}

/**
 * Calculate pass percentage for a proposal
 *
 * @param proposal - OnChainProposal object
 * @returns Percentage of upvotes (0-100), or 0 if no votes
 *
 * @example
 * getPassPercentage({ upvotes: 70n, downvotes: 30n, ... }) // returns 70
 */
export function getPassPercentage(proposal: OnChainProposal): number {
  const total = getTotalVotes(proposal);
  if (total === BigInt(0)) return 0;

  return Number((proposal.upvotes * BigInt(100)) / total);
}

/**
 * Check if proposal meets 2/3 majority requirement
 *
 * @param proposal - OnChainProposal object
 * @returns true if upvotes >= 66.67% of total votes
 */
export function meetsPassThreshold(proposal: OnChainProposal): boolean {
  const total = getTotalVotes(proposal);
  if (total === BigInt(0)) return false;

  // 2/3 majority: upvotes >= total * 2/3
  return proposal.upvotes * BigInt(3) >= total * BigInt(2);
}

/**
 * Check if voting period has ended
 *
 * @param proposal - OnChainProposal object
 * @returns true if current time >= votingEndsAt
 */
export function isVotingEnded(proposal: OnChainProposal): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000)); // Current Unix timestamp
  return now >= proposal.votingEndsAt;
}

/**
 * Get time remaining until voting ends
 *
 * @param proposal - OnChainProposal object
 * @returns Seconds remaining, or 0 if voting has ended
 */
export function getTimeRemaining(proposal: OnChainProposal): bigint {
  if (isVotingEnded(proposal)) return BigInt(0);

  const now = BigInt(Math.floor(Date.now() / 1000));
  return proposal.votingEndsAt - now;
}
