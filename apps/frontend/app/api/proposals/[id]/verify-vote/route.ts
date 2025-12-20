import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { createGovernanceContract } from 'common/governance-contract';
import { withAuth } from '@/lib/auth';

/**
 * Vote Verification API Endpoint
 * 
 * Allows users to verify their vote was included on-chain by:
 * 1. Checking the W3Governance contract state via getVote(proposalId, voter)
 * 2. Finding the VoteCast event transaction
 * 3. Returning Etherscan link and block timestamp
 * 
 * REQUIRES: W3Governance contract must have:
 * - function vote(uint256 proposalId, bool support) external
 * - function getVote(uint256 proposalId, address voter) external view returns (bool hasVoted, bool support)
 * - event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 timestamp)
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const proposalId = req.nextUrl.pathname.split('/')[3];

    if (!proposalId) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    // Get proposal to get onChainId
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { onChainId: true },
    });

    if (!proposal?.onChainId) {
      return NextResponse.json(
        { error: 'Proposal not found or not on-chain' },
        { status: 404 }
      );
    }

    // Connect to Sepolia network
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    if (!rpcUrl) {
      return NextResponse.json({ error: 'ETHEREUM_RPC_URL not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = createGovernanceContract(provider);

    // Get the getVote function
    const getVoteFn = contract.getFunction("getVote");
    
    // Call getVote(proposalId, voterAddress) to check on-chain vote status
    const [hasVoted, support] = await getVoteFn(
      proposal.onChainId,
      user.walletAddress
    );

    if (!hasVoted) {
      return NextResponse.json({
        voted: false,
        message: 'No on-chain vote found for this proposal',
      });
    }

    // Find the VoteCast event transaction for this voter
    const filter = contract.filters.VoteCast(BigInt(proposal.onChainId), user.walletAddress);
    const events = await contract.queryFilter(filter);

    if (events.length === 0) {
      return NextResponse.json({
        voted: true,
        voteType: support ? 'UPVOTE' : 'DOWNVOTE',
        transactionHash: null,
        message: 'Vote found on-chain but event not found (this should not happen)',
      });
    }

    // Get the most recent VoteCast event for this voter
    const latestEvent = events[events.length - 1];
    const txHash = latestEvent.transactionHash;
    const blockNumber = latestEvent.blockNumber;

    // Get block timestamp
    const block = await provider.getBlock(blockNumber);
    if (!block) {
      return NextResponse.json(
        { error: 'Failed to fetch block data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      voted: true,
      voteType: support ? 'UPVOTE' : 'DOWNVOTE',
      onChain: true,
      transactionHash: txHash,
      transactionUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
      blockNumber,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[Vote Verification] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify vote on-chain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
