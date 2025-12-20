/**
 * Proposal Finalization API Endpoint
 *
 * POST /api/proposals/[id]/finalize
 *
 * Triggers on-chain finalization of a governance proposal.
 * Validates voting period has ended, checks quorum, calls smart contract,
 * and updates database with finalization results.
 *
 * Restricted to platform admin or automated service.
 *
 * Flow:
 * 1. Validate proposal exists and has onChainId
 * 2. Check voting period ended
 * 3. Verify not already finalized
 * 4. Check quorum from on-chain data (optional - can be enforced in contract)
 * 5. Call contract.finalizeProposal(onChainId)
 * 6. Wait for transaction confirmation
 * 7. Update database with results
 *
 * NO voter arrays, vote arrays, or signature arrays needed.
 * Smart contract internally tallies its own stored votes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { z } from 'zod';
import { createGovernanceContractWithSigner } from 'common/governance-contract';
import { checkFinalizationEligibility } from '@/lib/governance/finalization';

/**
 * Request body schema
 */
const finalizeRequestSchema = z.object({
  // Optional: admin auth token or signature
  authToken: z.string().optional(),
});

/**
 * POST /api/proposals/[id]/finalize
 *
 * Finalize a proposal on-chain
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Parse proposal ID
    const { id: proposalId } = await params;

    // Validate request body
    const body = await request.json();
    const validatedData = finalizeRequestSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validatedData.error.issues },
        { status: 400 }
      );
    }

    // TODO: Add authentication check
    // For now, this endpoint should be called by an authorized service
    // In production, verify authToken or check if requester is platform admin

    // 1. Fetch proposal from database
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        user: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // 2. Validate proposal has onChainId
    if (!proposal.onChainId) {
      return NextResponse.json(
        { error: 'Proposal is not on-chain (onChainId missing)' },
        { status: 400 }
      );
    }

    // 3. Check if already finalized
    if (
      proposal.onChainStatus === 'PASSED' ||
      proposal.onChainStatus === 'FAILED' ||
      proposal.finalizationTxHash
    ) {
      return NextResponse.json(
        {
          error: 'Proposal already finalized',
          status: proposal.onChainStatus,
          txHash: proposal.finalizationTxHash,
        },
        { status: 400 }
      );
    }

    // 4. Check finalization eligibility using on-chain data
    const eligibility = await checkFinalizationEligibility(proposal.onChainId);

    if (!eligibility.canFinalize) {
      return NextResponse.json(
        {
          error: 'Proposal cannot be finalized',
          reason: eligibility.reason,
          details: {
            votingEnded: eligibility.votingEnded,
            alreadyFinalized: eligibility.alreadyFinalized,
            totalVotes: eligibility.totalVotes.toString(),
            votingEndsAt: eligibility.votingEndsAt.toString(),
            currentTime: eligibility.currentTime.toString(),
          },
        },
        { status: 400 }
      );
    }

    // 5. Optional: Check quorum (60% participation)
    // This is optional - can be enforced in the smart contract instead
    // For now, we'll allow finalization regardless of participation
    // If quorum is required:
    // const totalUsers = await prisma.user.count();
    // const participationRate = Number(eligibility.totalVotes) / totalUsers;
    // if (participationRate < 0.6) {
    //   return NextResponse.json(
    //     {
    //       error: 'Quorum not met',
    //       participationRate: (participationRate * 100).toFixed(2) + '%',
    //       required: '60%',
    //     },
    //     { status: 400 }
    //   );
    // }

    // 6. Initialize provider and signer
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    const signerPrivateKey = process.env.AUTHORIZED_SIGNER_KEY;

    if (!rpcUrl) {
      console.error('ETHEREUM_RPC_URL not configured');
      return NextResponse.json(
        { error: 'Server configuration error: RPC URL not set' },
        { status: 500 }
      );
    }

    if (!signerPrivateKey) {
      console.error('AUTHORIZED_SIGNER_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Signer key not set' },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(signerPrivateKey, provider);
    const contract = createGovernanceContractWithSigner(wallet);

    console.log(`[Finalize] Calling finalizeProposal(${proposal.onChainId}) on-chain`);

    // 7. Call smart contract finalizeProposal()
    let tx: ethers.ContractTransactionResponse;

    try {
      // Get the finalizeProposal function
      const finalizeProposalFn = contract.getFunction("finalizeProposal");
      
      // Estimate gas first
      const gasEstimate = await finalizeProposalFn.estimateGas(proposal.onChainId);
      console.log(`[Finalize] Estimated gas: ${gasEstimate.toString()}`);

      // Call with 20% gas buffer
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

      tx = await finalizeProposalFn(proposal.onChainId, {
        gasLimit,
      });

      console.log(`[Finalize] Transaction sent: ${tx.hash}`);
    } catch (error) {
      console.error('[Finalize] Transaction failed:', error);

      let errorMessage = 'Failed to send finalization transaction';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return NextResponse.json(
        {
          error: 'Finalization transaction failed',
          details: errorMessage,
        },
        { status: 500 }
      );
    }

    // 8. Wait for transaction confirmation
    let receipt: ethers.ContractTransactionReceipt | null;
    try {
      receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      if (receipt.status !== 1) {
        throw new Error('Transaction reverted');
      }

      console.log(`[Finalize] Transaction confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
      console.error('[Finalize] Transaction confirmation failed:', error);

      return NextResponse.json(
        {
          error: 'Finalization transaction reverted',
          txHash: tx.hash,
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // 9. Parse ProposalFinalized event from receipt
    let passed = false;
    let upvotes = BigInt(0);
    let downvotes = BigInt(0);

    try {
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });

          if (parsedLog?.name === 'ProposalFinalized') {
            // ProposalFinalized(uint256 indexed proposalId, uint256 upvotes, uint256 downvotes, bool passed)
            passed = parsedLog.args[3] as boolean;
            upvotes = parsedLog.args[1] as bigint;
            downvotes = parsedLog.args[2] as bigint;
            console.log(
              `[Finalize] Event parsed: passed=${passed}, upvotes=${upvotes}, downvotes=${downvotes}`
            );
            break;
          }
        } catch (parseError) {
          // Not a relevant event, continue
          continue;
        }
      }
    } catch (error) {
      console.error('[Finalize] Failed to parse event:', error);
      // Continue - we'll use eligibility data as fallback
    }

    // 10. Update database with finalization results
    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        finalizationTxHash: tx.hash,
        onChainStatus: passed ? 'PASSED' : 'FAILED',
        // Update legacy status field for backward compatibility
        status: passed ? 'APPROVED' : 'REJECTED',
        updatedAt: new Date(),
      },
    });

    console.log(
      `[Finalize] Database updated: proposal ${proposalId} -> ${updatedProposal.onChainStatus}`
    );

    // 11. Return success response
    return NextResponse.json(
      {
        success: true,
        message: `Proposal finalized: ${passed ? 'PASSED' : 'FAILED'}`,
        data: {
          proposalId: updatedProposal.id,
          onChainId: updatedProposal.onChainId,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          status: updatedProposal.onChainStatus,
          passed,
          upvotes: upvotes.toString(),
          downvotes: downvotes.toString(),
          totalVotes: (upvotes + downvotes).toString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Finalize] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/proposals/[id]/finalize
 *
 * Check if a proposal can be finalized (eligibility check)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proposalId } = await params;

    // Fetch proposal from database
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        onChainId: true,
        onChainStatus: true,
        finalizationTxHash: true,
        votingEndsAt: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (!proposal.onChainId) {
      return NextResponse.json(
        {
          canFinalize: false,
          reason: 'Proposal is not on-chain',
        },
        { status: 200 }
      );
    }

    // Check eligibility
    const eligibility = await checkFinalizationEligibility(proposal.onChainId);

    return NextResponse.json(
      {
        proposalId: proposal.id,
        onChainId: proposal.onChainId,
        canFinalize: eligibility.canFinalize,
        reason: eligibility.reason,
        details: {
          votingEnded: eligibility.votingEnded,
          alreadyFinalized: eligibility.alreadyFinalized,
          upvoteCount: eligibility.upvoteCount.toString(),
          downvoteCount: eligibility.downvoteCount.toString(),
          totalVotes: eligibility.totalVotes.toString(),
          passThresholdMet: eligibility.passThresholdMet,
          votingEndsAt: eligibility.votingEndsAt.toString(),
          currentTime: eligibility.currentTime.toString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Finalize Check] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to check finalization eligibility',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
