import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { withAuth } from '@/lib/auth';
import { getReputation } from '../../proposals/ReputationGuard';

/**
 * POST /api/reputation/claim-success
 * Called after successful on-chain reputation claim transaction
 * Updates user's claimedReputation to prevent double-claiming
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { transactionHash, amount } = body;

    // Validate required fields
    if (!transactionHash || typeof amount !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: transactionHash and amount'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid amount'
      }, { status: 400 });
    }

    // Check for duplicate transaction hash
    const existingTx = await prisma.transaction.findUnique({
      where: { transactionHash }
    });

    if (existingTx) {
      console.warn('Duplicate transaction hash detected:', {
        userId: user.id,
        transactionHash,
        existingTxId: existingTx.id,
        existingTxCreatedAt: existingTx.createdAt
      });
      return NextResponse.json({
        success: false,
        error: 'This transaction has already been processed'
      }, { status: 400 });
    }

    // Validate claimed amount doesn't exceed earned reputation
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { claimedReputation: true, walletAddress: true }
    });

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const currentClaimed = existingUser.claimedReputation || 0;
    const newClaimedTotal = currentClaimed + amount;
    const earnedReputation = await getReputation(user.id);

    if (newClaimedTotal > earnedReputation.totalScore) {
      console.error('Claim validation failed:', {
        userId: user.id,
        walletAddress: existingUser.walletAddress,
        newClaimedTotal,
        earned: earnedReputation.totalScore,
        attemptingToClaim: amount,
        currentClaimed,
        breakdown: earnedReputation
      });
      return NextResponse.json({
        success: false,
        error: 'Cannot claim more than earned reputation'
      }, { status: 400 });
    }

    // Create Transaction record and update User in atomic transaction
    await prisma.$transaction(async (tx) => {
      // Create transaction record for audit trail
      await tx.transaction.create({
        data: {
          type: 'REPUTATION_CLAIM',
          amount: amount.toString(),
          transactionHash,
          blockNumber: 0, // Reputation claims don't need specific block number
          status: 'CONFIRMED',
          userId: user.id,
          createdAt: new Date(),
          processedAt: new Date()
        }
      });

      // Update user's claimed reputation
      await tx.user.update({
        where: { id: user.id },
        data: {
          claimedReputation: {
            increment: amount
          },
          lastClaimAt: new Date()
        }
      });
    });

    // Log successful claim recording
    console.log('Reputation claim recorded:', {
      userId: user.id,
      walletAddress: existingUser.walletAddress,
      transactionHash,
      amount,
      previousClaimed: currentClaimed,
      newClaimed: newClaimedTotal,
      earnedTotal: earnedReputation.totalScore,
      remaining: earnedReputation.totalScore - newClaimedTotal
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Reputation claim recorded successfully',
        transactionHash,
        amountClaimed: amount
      }
    });

  } catch (error) {
    console.error('Error recording reputation claim:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record claim'
    }, { status: 500 });
  }
});
