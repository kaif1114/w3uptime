import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import {
  getReputation,
  MIN_REP_FOR_COMMENT,
  MIN_REP_FOR_PROPOSAL,
  MIN_REP_FOR_VOTE,
} from "../../proposals/ReputationGuard";

export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    const reputation = await getReputation(user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...reputation,
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


