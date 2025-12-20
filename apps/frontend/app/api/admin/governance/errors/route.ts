import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/admin/governance/errors
 * Fetch recent finalization errors for admin monitoring
 * Requires admin role
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    // TODO: Add admin role check
    // if (user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    // Find proposals that should have been finalized but have issues
    const now = new Date();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Proposals with voting ended but not finalized (potential issues)
    const overdueProposals = await prisma.proposal.findMany({
      where: {
        onChainStatus: 'ACTIVE',
        votingEndsAt: {
          lt: oneDayAgo, // More than 1 day overdue
        },
      },
      select: {
        id: true,
        title: true,
        onChainId: true,
        votingEndsAt: true,
        updatedAt: true,
      },
      orderBy: {
        votingEndsAt: 'asc',
      },
      take: 20,
    });

    // Calculate how overdue each proposal is
    const errors = overdueProposals.map((proposal) => {
      const hoursOverdue = proposal.votingEndsAt
        ? Math.floor(
            (now.getTime() - proposal.votingEndsAt.getTime()) / (1000 * 60 * 60)
          )
        : 0;

      return {
        proposalId: proposal.id,
        onChainId: proposal.onChainId,
        title: proposal.title,
        votingEndsAt: proposal.votingEndsAt,
        hoursOverdue,
        severity: hoursOverdue > 48 ? 'high' : hoursOverdue > 24 ? 'medium' : 'low',
        message: `Proposal has been pending finalization for ${hoursOverdue} hours`,
        category: 'overdue_finalization',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        errors,
        totalErrors: errors.length,
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch governance errors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch errors' },
      { status: 500 }
    );
  }
});
