import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { createGovernanceContract } from 'common/governance-contract';
import { Prisma } from '@prisma/client';

/**
 * Governance Data Export API Endpoint
 * 
 * Public endpoint for exporting complete governance data as JSON for independent verification.
 * Provides comprehensive blockchain-verifiable data including transaction hashes and voter lists.
 * 
 * Query Parameters:
 * - proposalId: Filter by specific proposal ID
 * - from: Filter proposals created after this date (ISO 8601)
 * - to: Filter proposals created before this date (ISO 8601)
 * 
 * Response:
 * - JSON file download with complete governance data
 * - All on-chain proposals with verification info
 * - Individual voter data with transaction hashes
 * - Platform statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const proposalId = searchParams.get('proposalId');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Build query filters
    const where: Prisma.ProposalWhereInput = { onChainStatus: { not: 'DRAFT' } };
    if (proposalId) {
      where.id = proposalId;
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const proposals = await prisma.proposal.findMany({
      where,
      include: {
        user: { select: { walletAddress: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get RPC URL
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    if (!rpcUrl) {
      return NextResponse.json({ error: 'ETHEREUM_RPC_URL not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = createGovernanceContract(provider);

    // Format export data with verification info
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '2.0',
      votingModel: 'direct-onchain',
      network: 'sepolia',
      contractAddress: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS,
      totalProposals: proposals.length,
      proposals: await Promise.all(
        proposals.map(async (p) => {
          // Fetch on-chain vote data if available
          let onChainVoteData = null;
          if (p.onChainId) {
            try {
              // Get the getProposal function
              const getProposalFn = contract.getFunction("getProposal");
              const onChainProposal = await getProposalFn(p.onChainId);

              // Query VoteCast events to get individual voters
              const filter = contract.filters.VoteCast(BigInt(p.onChainId));
              const voteEvents = await contract.queryFilter(filter);

              onChainVoteData = {
                upvotes: Number(onChainProposal.upvotes),
                downvotes: Number(onChainProposal.downvotes),
                voters: await Promise.all(
                  voteEvents.map(async (event) => {
                    const parsed = contract.interface.parseLog({
                      topics: event.topics as string[],
                      data: event.data,
                    });
                    const block = await provider.getBlock(event.blockNumber);

                    if (!parsed || !block) {
                      return null;
                    }

                    return {
                      address: parsed.args.voter,
                      support: parsed.args.support,
                      voteType: parsed.args.support ? 'UPVOTE' : 'DOWNVOTE',
                      transactionHash: event.transactionHash,
                      blockNumber: event.blockNumber,
                      timestamp: new Date(block.timestamp * 1000).toISOString(),
                    };
                  })
                ).then((voters) => voters.filter((v) => v !== null)),
              };
            } catch (error) {
              console.error(`Failed to fetch on-chain data for proposal ${p.onChainId}:`, error);
            }
          }

          return {
            id: p.id,
            onChainId: p.onChainId,
            title: p.title,
            description: p.description,
            contentHash: p.contentHash,
            type: p.type,
            status: p.status,
            onChainStatus: p.onChainStatus,
            proposer: p.user.walletAddress,
            createdAt: p.createdAt,
            votingEndsAt: p.votingEndsAt,

            // On-chain verification
            creationTransaction: {
              hash: p.creationTxHash,
              etherscanUrl: p.creationTxHash
                ? `https://sepolia.etherscan.io/tx/${p.creationTxHash}`
                : null,
            },
            finalizationTransaction: p.finalizationTxHash
              ? {
                  hash: p.finalizationTxHash,
                  etherscanUrl: `https://sepolia.etherscan.io/tx/${p.finalizationTxHash}`,
                }
              : null,

            // Direct on-chain vote data
            onChainVotes: onChainVoteData,
          };
        })
      ),
    };

    // Set headers for file download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="w3uptime-governance-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[Export API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export governance data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
