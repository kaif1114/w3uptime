// apps/frontend/app/api/proposals/reputationGuard.ts (new helper file)
import { prisma } from "db/client";
import { computeReputationScore } from "hub/src/services/reputation";

export const MIN_REP_FOR_PROPOSAL = 10;
export const MIN_REP_FOR_COMMENT = 5;
export const MIN_REP_FOR_VOTE = 3;

export async function requireReputation(
  userId: string,
  minScore: number
): Promise<{ ok: true } | { ok: false; score: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { goodTicks: true, badTicks: true },
  });
  if (!user) return { ok: false, score: 0 };

  const score = computeReputationScore({
    goodTicks: user.goodTicks,
    badTicks: user.badTicks,
  });

  if (score < minScore) return { ok: false, score };
  return { ok: true };
}