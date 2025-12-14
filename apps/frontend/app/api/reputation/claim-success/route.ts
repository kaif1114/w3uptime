import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { withAuth } from '@/lib/auth';

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

    // TODO: Optional - Verify transaction on-chain
    // This would require checking Etherscan API or calling contract.getReputationBalance()
    // to ensure the transaction actually succeeded

    // Update claimedReputation and lastClaimAt to prevent double-claiming
    await prisma.user.update({
      where: { id: user.id },
      data: {
        claimedReputation: {
          increment: amount
        },
        lastClaimAt: new Date()
      }
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
