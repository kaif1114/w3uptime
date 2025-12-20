import { withAuth } from "@/lib/auth";
import { prisma } from "db/client";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/[id]/vote-info
 * 
 * Returns voting information needed for direct on-chain voting via MetaMask.
 * This endpoint provides:
 * - Contract address and chain ID for transaction preparation
 * - On-chain proposal ID
 * - Voting status (active/ended)
 * - Current vote counts (from database cache)
 * - User's existing vote if any
 * - Gas estimation for vote transaction
 * 
 * Used by frontend to:
 * 1. Verify voting is active before showing vote UI
 * 2. Show current vote distribution
 * 3. Display user's existing vote
 * 4. Prepare contract.vote(proposalId, support) transaction
 */
export const GET = withAuth(
  async (req: NextRequest, user, _session, { params }: RouteParams): Promise<NextResponse> => {
    try {
      const { id: proposalId } = await params;

      // Fetch proposal with both vote types
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          votes: true,        // Database votes (DRAFT proposals)
          voteCaches: true,   // On-chain votes (ACTIVE proposals)
        },
      });

      if (!proposal) {
        return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
      }

      // Determine which vote source to use based on onChainStatus
      const isOnChain =
        proposal.onChainStatus === "ACTIVE" ||
        proposal.onChainStatus === "PASSED" ||
        proposal.onChainStatus === "FAILED";

      // Calculate vote counts from appropriate source
      let upvoteCount: number;
      let downvoteCount: number;
      let totalVotes: number;
      let userVote: string | null = null;

      if (isOnChain) {
        // Count from VoteCache (on-chain votes)
        upvoteCount = proposal.voteCaches.filter(v => v.voteType === "UPVOTE").length;
        downvoteCount = proposal.voteCaches.filter(v => v.voteType === "DOWNVOTE").length;
        totalVotes = proposal.voteCaches.length;

        // Check user's vote by wallet address (case-insensitive)
        if (user.walletAddress) {
          const userVoteRecord = proposal.voteCaches.find(
            v => v.voterAddress.toLowerCase() === user.walletAddress.toLowerCase()
          );
          userVote = userVoteRecord ? userVoteRecord.voteType : null;
        }
      } else {
        // Count from ProposalVote (database votes for DRAFT/PENDING_ONCHAIN)
        upvoteCount = proposal.votes.filter(v => v.vote === "UPVOTE").length;
        downvoteCount = proposal.votes.filter(v => v.vote === "DOWNVOTE").length;
        totalVotes = proposal.votes.length;

        // Check user's vote by userId
        const userVoteRecord = proposal.votes.find(v => v.userId === user.id);
        userVote = userVoteRecord ? userVoteRecord.vote : null;
      }

      // Check if voting is currently active
      const votingActive =
        proposal.onChainId !== null &&
        proposal.onChainStatus === "ACTIVE" &&
        proposal.votingEndsAt !== null &&
        new Date() < proposal.votingEndsAt;

      // Calculate time remaining
      let timeRemaining: number | null = null;
      if (proposal.votingEndsAt) {
        timeRemaining = Math.max(
          0,
          Math.floor((proposal.votingEndsAt.getTime() - Date.now()) / 1000)
        );
      }

      // Return voting information
      return NextResponse.json({
        // Contract information
        contractAddress: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS,
        chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111), // Default to Sepolia
        
        // Proposal on-chain data
        onChainId: proposal.onChainId,
        contentHash: proposal.contentHash,
        
        // Voting status
        votingActive,
        votingEndsAt: proposal.votingEndsAt?.toISOString() || null,
        timeRemaining, // Seconds remaining
        onChainStatus: proposal.onChainStatus,
        
        // User's vote (from correct source based on onChainStatus)
        userVote,
        userHasVoted: !!userVote,
        
        // Vote counts (from correct source based on onChainStatus)
        voteCounts: {
          upvotes: upvoteCount,
          downvotes: downvoteCount,
          total: totalVotes,
          upvotePercentage: totalVotes > 0 ? Math.round((upvoteCount / totalVotes) * 100) : 0,
        },
        
        // Gas estimation for frontend
        estimatedGas: {
          vote: "100000", // Estimated gas for contract.vote() call
          gasPrice: null, // Frontend will fetch current gas price from provider
        },
        
        // Additional metadata
        proposalTitle: proposal.title,
        proposalType: proposal.type,
        createdAt: proposal.createdAt.toISOString(),
      });
    } catch (error) {
      console.error("[Vote Info API] Failed to fetch vote info:", error);
      return NextResponse.json(
        { error: "Failed to fetch vote info" },
        { status: 500 }
      );
    }
  }
);
