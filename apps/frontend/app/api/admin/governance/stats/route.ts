import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/admin/governance/stats
 * Returns finalization statistics for admin dashboard
 * Requires admin role
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    // Check if user is admin (you'll need to implement role checking)
    // For now, we'll allow all authenticated users
    // TODO: Add admin role check
    // if (user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    // Get pending finalizations count
    const pendingCount = await prisma.proposal.count({
      where: {
        onChainStatus: 'ACTIVE',
        votingEndsAt: {
          lte: new Date(),
        },
      },
    });

    // Get finalized proposals in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentFinalizations = await prisma.proposal.findMany({
      where: {
        onChainStatus: {
          in: ['PASSED', 'FAILED'],
        },
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        onChainStatus: true,
        finalizationTxHash: true,
        updatedAt: true,
      },
    });

    const successfulFinalizations = recentFinalizations.filter(
      (p) => p.onChainStatus === 'PASSED'
    ).length;

    const failedFinalizations = recentFinalizations.filter(
      (p) => p.onChainStatus === 'FAILED'
    ).length;

    const successRate =
      recentFinalizations.length > 0
        ? (successfulFinalizations / recentFinalizations.length) * 100
        : 0;

    // Calculate average gas cost (mock data for now)
    // TODO: Store actual gas costs from finalization transactions
    const avgGasCost = 0.0015; // ETH

    return NextResponse.json({
      success: true,
      data: {
        pendingCount,
        recentFinalizations: recentFinalizations.length,
        successfulFinalizations,
        failedFinalizations,
        successRate: successRate.toFixed(2),
        avgGasCost,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch governance stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
});
