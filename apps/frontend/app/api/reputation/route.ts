import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getReputation } from '../proposals/ReputationGuard';
import { getCachedOnChainBalance } from '@/lib/cache/reputation-cache';
import { prisma } from 'db/client';

/**
 * GET /api/reputation
 * Returns comprehensive reputation data for authenticated user:
 * - earned: Total reputation from database (goodTicks, proposals, etc.)
 * - claimed: Amount transferred to on-chain balance
 * - available: earned - claimed (amount available to claim)
 * - onChainBalance: Current on-chain balance from W3Governance contract (with 30s cache)
 * - breakdown: Detailed reputation sources
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    // Get earned reputation from database
    const reputation = await getReputation(user.id);
    const earned = reputation.totalScore;

    // Get claimed amount from transactions
    const claimedTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'REPUTATION_CLAIM',
        status: 'CONFIRMED'
      },
      select: { amount: true }
    });

    const claimed = claimedTransactions.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0
    );

    const available = Math.max(0, earned - claimed); // Ensure non-negative

    // Fetch on-chain balance with caching and error handling
    let onChainBalance: number | null = null;
    try {
      const balance = await getCachedOnChainBalance(user.walletAddress);
      console.log("balance:", balance);
      onChainBalance = balance !== null ? Number(balance) : null;
    } catch (error) {
      console.warn('On-chain balance fetch failed, continuing without it:', error);
    }
    return NextResponse.json({
      success: true,
      data: {
        earned,
        claimed,
        available,
        onChainBalance,
        breakdown: reputation
      }
    });
  } catch (error) {
    console.error('Failed to fetch reputation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reputation data'
      },
      { status: 500 }
    );
  }
});
