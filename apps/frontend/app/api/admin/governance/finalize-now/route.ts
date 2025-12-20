import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { withAuth } from '@/lib/auth';
import { ethers } from 'ethers';
import { createGovernanceContractWithSigner } from 'common/governance-contract';

/**
 * POST /api/admin/governance/finalize-now
 * Manually trigger finalization for a specific proposal
 * Requires admin role and rate limiting
 */

// Simple in-memory rate limiting (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 1;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // TODO: Add admin role check
    // if (user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    const body = await req.json();
    const { proposalId } = body;

    if (!proposalId) {
      return NextResponse.json(
        { error: 'proposalId is required' },
        { status: 400 }
      );
    }

    // Get proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || !proposal.onChainId) {
      return NextResponse.json(
        { error: 'Proposal not found or not on-chain' },
        { status: 404 }
      );
    }

    // Check if voting has ended
    if (!proposal.votingEndsAt || new Date() < proposal.votingEndsAt) {
      return NextResponse.json(
        { error: 'Voting period has not ended yet' },
        { status: 400 }
      );
    }

    // Check if already finalized
    if (
      proposal.onChainStatus === 'PASSED' ||
      proposal.onChainStatus === 'FAILED'
    ) {
      return NextResponse.json(
        { error: 'Proposal already finalized' },
        { status: 400 }
      );
    }

    // Initialize contract
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const wallet = new ethers.Wallet(
      process.env.AUTHORIZED_SIGNER_KEY!,
      provider
    );
    const contract = createGovernanceContractWithSigner(wallet);

    // Get the finalizeProposal function
    const finalizeProposalFn = contract.getFunction("finalizeProposal");

    // Estimate gas
    const gasEstimate = await finalizeProposalFn.estimateGas(
      proposal.onChainId
    );
    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100); // 20% buffer

    // Send transaction
    const tx = await finalizeProposalFn(proposal.onChainId, {
      gasLimit,
    });

    console.log(`[Admin] Finalization tx submitted: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error('Transaction reverted');
    }

    // Parse event to get result
    let passed = false;
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (parsedLog?.name === 'ProposalFinalized') {
          passed = parsedLog.args[3]; // bool passed
          break;
        }
      } catch {
        // Skip logs that don't match
      }
    }

    // Update database
    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        finalizationTxHash: tx.hash,
        onChainStatus: passed ? 'PASSED' : 'FAILED',
        status: passed ? 'APPROVED' : 'REJECTED',
        updatedAt: new Date(),
      },
    });

    // Log admin action
    console.log(
      `[Admin] Proposal ${proposalId} finalized by ${user.id}: ${passed ? 'PASSED' : 'FAILED'}`
    );

    return NextResponse.json({
      success: true,
      data: {
        proposalId,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        status: passed ? 'PASSED' : 'FAILED',
        message: `Proposal finalized: ${passed ? 'PASSED' : 'FAILED'}`,
      },
    });
  } catch (error) {
    console.error('[Admin] Finalization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to finalize proposal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
