/**
 * Vote Helper Utilities
 *
 * Centralized logic for handling votes from two sources:
 * 1. ProposalVote table - Database votes for DRAFT proposals
 * 2. VoteCache table - On-chain votes for ACTIVE/PASSED/FAILED proposals
 *
 * This ensures vote counts are displayed from the correct source based on onChainStatus.
 */

import { Proposal, VoteType, OnChainStatus } from "@/types/proposal";

/**
 * Determine if proposal uses on-chain voting based on status
 *
 * @param onChainStatus - The current on-chain status of the proposal
 * @returns true if votes should come from VoteCache, false if from ProposalVote
 */
export function isOnChainVoting(onChainStatus: OnChainStatus): boolean {
  return (
    onChainStatus === OnChainStatus.ACTIVE ||
    onChainStatus === OnChainStatus.PASSED ||
    onChainStatus === OnChainStatus.FAILED
  );
}

/**
 * Get upvote count from appropriate source based on onChainStatus
 *
 * - ACTIVE/PASSED/FAILED: Counts from VoteCache table
 * - DRAFT/PENDING_ONCHAIN: Counts from ProposalVote table
 *
 * @param proposal - The proposal to count upvotes for
 * @returns Number of upvotes
 */
export function getUpvoteCount(proposal: Proposal): number {
  if (isOnChainVoting(proposal.onChainStatus)) {
    // On-chain voting: count from VoteCache
    return proposal.voteCaches?.filter(v => v.voteType === VoteType.UPVOTE).length || 0;
  }
  // Database voting: count from ProposalVote
  return proposal.votes?.filter(v => v.vote === VoteType.UPVOTE).length || 0;
}

/**
 * Get downvote count from appropriate source based on onChainStatus
 *
 * - ACTIVE/PASSED/FAILED: Counts from VoteCache table
 * - DRAFT/PENDING_ONCHAIN: Counts from ProposalVote table
 *
 * @param proposal - The proposal to count downvotes for
 * @returns Number of downvotes
 */
export function getDownvoteCount(proposal: Proposal): number {
  if (isOnChainVoting(proposal.onChainStatus)) {
    // On-chain voting: count from VoteCache
    return proposal.voteCaches?.filter(v => v.voteType === VoteType.DOWNVOTE).length || 0;
  }
  // Database voting: count from ProposalVote
  return proposal.votes?.filter(v => v.vote === VoteType.DOWNVOTE).length || 0;
}

/**
 * Get total vote count from appropriate source
 *
 * @param proposal - The proposal to count total votes for
 * @returns Total number of votes (upvotes + downvotes)
 */
export function getTotalVoteCount(proposal: Proposal): number {
  if (isOnChainVoting(proposal.onChainStatus)) {
    // On-chain voting: count from VoteCache
    return proposal.voteCaches?.length || 0;
  }
  // Database voting: count from ProposalVote
  return proposal.votes?.length || 0;
}

/**
 * Get user's current vote from appropriate source
 *
 * - ACTIVE/PASSED/FAILED: Checks VoteCache by walletAddress (case-insensitive)
 * - DRAFT/PENDING_ONCHAIN: Checks ProposalVote by userId
 *
 * @param proposal - The proposal to check
 * @param userId - User's database ID (for DRAFT proposals)
 * @param walletAddress - User's wallet address (for ACTIVE proposals)
 * @returns The user's vote (UPVOTE/DOWNVOTE) or null if they haven't voted
 */
export function getUserVote(
  proposal: Proposal,
  userId: string | undefined,
  walletAddress: string | undefined
): VoteType | null {
  if (isOnChainVoting(proposal.onChainStatus)) {
    // On-chain voting: check VoteCache by wallet address (case-insensitive)
    if (!walletAddress || !proposal.voteCaches) return null;

    const vote = proposal.voteCaches.find(
      v => v.voterAddress.toLowerCase() === walletAddress.toLowerCase()
    );
    return vote ? vote.voteType : null;
  } else {
    // Database voting: check ProposalVote by userId
    if (!userId || !proposal.votes) return null;

    const vote = proposal.votes.find(v => v.userId === userId);
    return vote ? vote.vote : null;
  }
}
