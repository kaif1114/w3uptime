import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import {
  getReputation,
  MIN_REP_FOR_COMMENT,
  MIN_REP_FOR_PROPOSAL,
  MIN_REP_FOR_VOTE,
} from "../../proposals/ReputationGuard";
import { getCachedOnChainBalance } from "@/lib/cache/ReputationCache";
import { prisma } from "db/client";

export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    const reputation = await getReputation(user.id);
    const earned = reputation.totalScore;

    // Get claimed amount from User field
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { claimedReputation: true }
    });

    const claimed = userRecord?.claimedReputation || 0;
    const available = Math.max(0, earned - claimed);

    // Fetch on-chain balance with caching and error handling
    let onChainBalance: number | null = null;
    try {
      const balance = await getCachedOnChainBalance(user.walletAddress);
      onChainBalance = balance !== null ? Number(balance) : null;
    } catch (error) {
      console.warn('On-chain balance fetch failed, continuing without it:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...reputation,
        earned,
        claimed,
        available,
        onChainBalance,
        thresholds: {
          createProposal: MIN_REP_FOR_PROPOSAL,
          comment: MIN_REP_FOR_COMMENT,
          vote: MIN_REP_FOR_VOTE,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch community reputation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reputation",
      },
      { status: 500 }
    );
  }
});


