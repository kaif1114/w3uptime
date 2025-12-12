/**
 * Proposal Finalization Eligibility Checker
 *
 * Utilities for checking if a proposal can be finalized on-chain
 * based on voting period status, vote counts, and finalization state.
 *
 * All vote data is read directly from the W3Governance smart contract
 * on Sepolia testnet. The checker ensures:
 * - Voting period has ended
 * - Proposal is not already finalized
 * - Vote counts are retrieved from blockchain
 *
 * No signature aggregation or database queries for votes.
 * The smart contract itself maintains the authoritative vote state.
 */

import { ethers } from 'ethers';
import { createGovernanceContract, getProposalFromChain } from 'common/governance-contract';
import type { OnChainProposal } from 'common/governance-types';

/**
 * Result of finalization eligibility check
 */
export interface FinalizationEligibility {
  /** On-chain proposal ID */
  proposalId: number;
  /** Whether the proposal can be finalized right now */
  canFinalize: boolean;
  /** Whether voting period has ended */
  votingEnded: boolean;
  /** Whether proposal is already finalized */
  alreadyFinalized: boolean;
  /** Number of upvotes from smart contract */
  upvoteCount: bigint;
  /** Number of downvotes from smart contract */
  downvoteCount: bigint;
  /** Total votes cast */
  totalVotes: bigint;
  /** Whether 2/3 majority threshold is met (upvotes >= totalVotes * 2/3) */
  passThresholdMet: boolean;
  /** Unix timestamp when voting ends (from contract) */
  votingEndsAt: bigint;
  /** Current Unix timestamp */
  currentTime: bigint;
  /** If canFinalize is false, explains why */
  reason?: string;
  /** On-chain proposal data */
  proposal?: OnChainProposal;
}

/**
 * Check if a proposal can be finalized
 *
 * Reads proposal state directly from the W3Governance smart contract
 * and determines finalization eligibility based on:
 * 1. Voting period has ended (currentTime >= votingEndsAt)
 * 2. Not already finalized
 * 3. Has at least one vote
 *
 * @param proposalId - On-chain proposal ID
 * @param provider - Ethers.js Provider (optional, creates new if not provided)
 * @returns FinalizationEligibility object with detailed status
 *
 * @throws Error if proposal doesn't exist or RPC connection fails
 *
 * @example
 * ```typescript
 * const eligibility = await checkFinalizationEligibility(1);
 *
 * if (eligibility.canFinalize) {
 *   console.log('Proposal can be finalized!');
 *   console.log(`Pass threshold met: ${eligibility.passThresholdMet}`);
 * } else {
 *   console.log(`Cannot finalize: ${eligibility.reason}`);
 * }
 * ```
 */
export async function checkFinalizationEligibility(
  proposalId: number,
  provider?: ethers.Provider
): Promise<FinalizationEligibility> {
  // Validate input
  if (proposalId < 1) {
    throw new Error('Invalid proposal ID: must be >= 1');
  }

  // Create provider if not provided
  let providerToUse = provider;
  if (!providerToUse) {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    if (!rpcUrl) {
      throw new Error('ETHEREUM_RPC_URL environment variable is required');
    }
    providerToUse = new ethers.JsonRpcProvider(rpcUrl);
  }

  try {
    // Fetch proposal from blockchain with retry logic
    let proposal: OnChainProposal;
    let retryCount = 0;
    const maxRetries = 3;

    while (true) {
      try {
        proposal = await getProposalFromChain(proposalId, providerToUse);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(
            `Failed to fetch proposal ${proposalId} after ${maxRetries} attempts: ${error}`
          );
        }
        // Exponential backoff: 500ms, 1s, 2s
        const delay = Math.pow(2, retryCount - 1) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Check if proposal exists (id should match)
    if (proposal.id !== BigInt(proposalId)) {
      throw new Error('Proposal not found');
    }

    // Get current block timestamp
    const block = await providerToUse.getBlock('latest');
    if (!block) {
      throw new Error('Failed to fetch latest block');
    }
    const currentTime = BigInt(block.timestamp);

    // Calculate eligibility conditions
    const votingEnded = currentTime >= proposal.votingEndsAt;
    const alreadyFinalized = proposal.finalized;
    const totalVotes = proposal.upvotes + proposal.downvotes;
    const passThresholdMet = calculatePassThreshold(proposal.upvotes, totalVotes);

    // Determine if can finalize and reason if not
    let canFinalize = false;
    let reason: string | undefined;

    if (alreadyFinalized) {
      reason = 'Proposal already finalized';
    } else if (!votingEnded) {
      const timeRemaining = proposal.votingEndsAt - currentTime;
      reason = `Voting period ends in ${formatTimeRemaining(timeRemaining)}`;
    } else if (totalVotes === BigInt(0)) {
      reason = 'No votes cast';
    } else {
      // All conditions met - can finalize
      canFinalize = true;
    }

    return {
      proposalId,
      canFinalize,
      votingEnded,
      alreadyFinalized,
      upvoteCount: proposal.upvotes,
      downvoteCount: proposal.downvotes,
      totalVotes,
      passThresholdMet,
      votingEndsAt: proposal.votingEndsAt,
      currentTime,
      reason,
      proposal,
    };
  } catch (error) {
    // Enhance error message
    if (error instanceof Error) {
      throw new Error(`Failed to check finalization eligibility: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Calculate if 2/3 majority threshold is met
 *
 * @param upvotes - Number of upvotes
 * @param totalVotes - Total number of votes
 * @returns true if upvotes >= (totalVotes * 2 / 3)
 */
function calculatePassThreshold(upvotes: bigint, totalVotes: bigint): boolean {
  if (totalVotes === BigInt(0)) {
    return false;
  }
  // upvotes >= (totalVotes * 2 / 3)
  // Multiply first to avoid precision loss
  return upvotes * BigInt(3) >= totalVotes * BigInt(2);
}

/**
 * Format seconds remaining into human-readable string
 *
 * @param seconds - Number of seconds
 * @returns Formatted string like "2 hours 30 minutes" or "5 minutes"
 *
 * @example
 * ```typescript
 * formatTimeRemaining(BigInt(7200)); // "2 hours"
 * formatTimeRemaining(BigInt(300));  // "5 minutes"
 * formatTimeRemaining(BigInt(45));   // "45 seconds"
 * ```
 */
export function formatTimeRemaining(seconds: bigint): string {
  const totalSeconds = Number(seconds);

  if (totalSeconds < 0) {
    return 'expired';
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (secs > 0 && parts.length === 0) {
    // Only show seconds if it's less than a minute
    parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);
  }

  return parts.length > 0 ? parts.join(' ') : '0 seconds';
}

/**
 * Calculate pass percentage
 *
 * @param upvotes - Number of upvotes
 * @param totalVotes - Total number of votes
 * @returns Percentage (0-100) of upvotes
 *
 * @example
 * ```typescript
 * calculatePassPercentage(BigInt(67), BigInt(100)); // 67
 * calculatePassPercentage(BigInt(2), BigInt(3));    // 66.67
 * ```
 */
export function calculatePassPercentage(upvotes: bigint, totalVotes: bigint): number {
  if (totalVotes === BigInt(0)) {
    return 0;
  }

  // Convert to number for percentage calculation
  const upvotesNum = Number(upvotes);
  const totalVotesNum = Number(totalVotes);

  return (upvotesNum / totalVotesNum) * 100;
}

/**
 * Get human-readable finalization status message
 *
 * @param eligibility - FinalizationEligibility object
 * @returns Formatted status message
 *
 * @example
 * ```typescript
 * const eligibility = await checkFinalizationEligibility(1);
 * const message = getFinalizationStatusMessage(eligibility);
 * console.log(message);
 * // "Proposal can be finalized (67% upvotes, threshold met)"
 * // or "Cannot finalize: Voting period ends in 2 hours"
 * ```
 */
export function getFinalizationStatusMessage(eligibility: FinalizationEligibility): string {
  if (eligibility.canFinalize) {
    const percentage = calculatePassPercentage(eligibility.upvoteCount, eligibility.totalVotes);
    const thresholdStatus = eligibility.passThresholdMet ? 'threshold met' : 'threshold not met';
    return `Proposal can be finalized (${percentage.toFixed(1)}% upvotes, ${thresholdStatus})`;
  } else {
    return `Cannot finalize: ${eligibility.reason}`;
  }
}

/**
 * Batch check multiple proposals for finalization eligibility
 *
 * @param proposalIds - Array of on-chain proposal IDs
 * @param provider - Ethers.js Provider (optional)
 * @returns Array of FinalizationEligibility objects
 *
 * @example
 * ```typescript
 * const eligibilities = await batchCheckFinalizationEligibility([1, 2, 3]);
 * const canFinalizeCount = eligibilities.filter(e => e.canFinalize).length;
 * console.log(`${canFinalizeCount} proposals ready to finalize`);
 * ```
 */
export async function batchCheckFinalizationEligibility(
  proposalIds: number[],
  provider?: ethers.Provider
): Promise<FinalizationEligibility[]> {
  // Create provider once if not provided
  let providerToUse = provider;
  if (!providerToUse) {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    if (!rpcUrl) {
      throw new Error('ETHEREUM_RPC_URL environment variable is required');
    }
    providerToUse = new ethers.JsonRpcProvider(rpcUrl);
  }

  // Check all proposals in parallel
  const checks = proposalIds.map((id) =>
    checkFinalizationEligibility(id, providerToUse).catch((error) => {
      console.error(`Failed to check proposal ${id}:`, error);
      return null;
    })
  );

  const results = await Promise.all(checks);

  // Filter out failed checks
  return results.filter((r): r is FinalizationEligibility => r !== null);
}
