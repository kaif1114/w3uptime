import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { createGovernanceContract } from 'common/governance-contract';

/**
 * Transparency Dashboard API Endpoint
 * 
 * Public endpoint that provides comprehensive governance data with on-chain verification links.
 * No authentication required - designed for maximum transparency.
 * 
 * Query Parameters:
 * - includeOffChain: Include draft/off-chain proposals (default: false)
 * 
 * Response includes:
 * - All proposals with on-chain verification data
 * - Platform statistics
 * - Etherscan transaction links
 * - Real-time vote counts from blockchain
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeOffChain = searchParams.get('includeOffChain') === 'true';

    // Query proposals with on-chain data
    const where = includeOffChain ? {} : { onChainStatus: { not: 'DRAFT' as const } };

    const proposals = await prisma.proposal.findMany({
      where,
      include: {
        user: { 
          select: { walletAddress: true } 
        },
        votes: {
          select: {
            vote: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to dashboard format
    const dashboardData = await Promise.all(
      proposals.map(async (p) => {
        // For on-chain proposals, fetch vote counts from contract
        let onChainVotes = { upvotes: 0, downvotes: 0, total: 0 };
        if (p.onChainId) {
          try {
            const rpcUrl = process.env.ETHEREUM_RPC_URL;
            if (!rpcUrl) {
              throw new Error('ETHEREUM_RPC_URL not configured');
            }

            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const contract = createGovernanceContract(provider);
            
            // Get the getProposal function
            const getProposalFn = contract.getFunction("getProposal");
            const onChainProposal = await getProposalFn(p.onChainId);
            
            onChainVotes = {
              upvotes: Number(onChainProposal.upvotes),
              downvotes: Number(onChainProposal.downvotes),
              total: Number(onChainProposal.upvotes) + Number(onChainProposal.downvotes),
            };
          } catch (error) {
            console.error(`Failed to fetch on-chain votes for proposal ${p.onChainId}:`, error);
          }
        }

        return {
          id: p.id,
          title: p.title,
          type: p.type,
          status: p.status,
          onChainStatus: p.onChainStatus,
          proposer: p.user.walletAddress,
          createdAt: p.createdAt,

          // On-chain verification
          onChainId: p.onChainId,
          contentHash: p.contentHash,
          creationTxHash: p.creationTxHash,
          creationTxUrl: p.creationTxHash
            ? `https://sepolia.etherscan.io/tx/${p.creationTxHash}`
            : null,
          finalizationTxHash: p.finalizationTxHash,
          finalizationTxUrl: p.finalizationTxHash
            ? `https://sepolia.etherscan.io/tx/${p.finalizationTxHash}`
            : null,

          // Voting data
          votingEndsAt: p.votingEndsAt,
          onChainVotes,
          legacyVotes: {
            upvotes: p.votes.filter((v: { vote: string }) => v.vote === 'UPVOTE').length,
            downvotes: p.votes.filter((v: { vote: string }) => v.vote === 'DOWNVOTE').length,
          },
        };
      })
    );

    // Calculate platform statistics
    const stats = {
      totalProposals: proposals.length,
      onChainProposals: proposals.filter((p) => p.onChainId !== null).length,
      finalizedProposals: proposals.filter(
        (p) => p.onChainStatus === 'PASSED' || p.onChainStatus === 'FAILED'
      ).length,
      activeVoting: proposals.filter(
        (p) => p.onChainStatus === 'ACTIVE' && p.votingEndsAt && new Date() < p.votingEndsAt
      ).length,
    };

    return NextResponse.json(
      { proposals: dashboardData, stats },
      {
        status: 200,
        headers: {
          // Cache for 60 seconds for performance
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
