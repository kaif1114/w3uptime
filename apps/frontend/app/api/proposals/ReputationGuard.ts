// apps/frontend/app/api/proposals/ReputationGuard.ts
import { prisma } from "db/client";
import { computeReputationScore } from "hub/src/services/reputation";

export const MIN_REP_FOR_PROPOSAL = 10;
export const MIN_REP_FOR_COMMENT = 5;
export const MIN_REP_FOR_VOTE = 3;

const WEI_PER_ETH = BigInt("1000000000000000000"); // 1 ETH in wei
function scoreFromMonitors(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
}

function scoreFromDepositsWei(totalWei: bigint): number {
  if (totalWei < WEI_PER_ETH / BigInt(10)) return 0;     // < 0.1 ETH
  if (totalWei < WEI_PER_ETH) return 1;                 // < 1 ETH
  if (totalWei < WEI_PER_ETH * BigInt(5)) return 2;     // < 5 ETH
  return 3;
}

function scoreFromAge(days: number): number {
  if (days < 7) return 0;
  if (days < 30) return 1;
  if (days < 180) return 2;
  return 3;
}
export async function requireReputation(
  userId: string,
  minScore: number
): Promise<{ ok: true } | { ok: false; score: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      goodTicks: true,
      badTicks: true,
      _count: { select: { monitors: true } },
    },
  });

  if (!user) return { ok: false, score: 0 };

  const confirmedDeposits = await prisma.transaction.findMany({
    where: {
      userId,
      type: "DEPOSIT",
      status: "CONFIRMED",
    },
    select: { amount: true }, // amount stored in WEI
  });

  const validatorScore = computeReputationScore({
    goodTicks: user.goodTicks,
    badTicks: user.badTicks,
  });
  const monitorScore = scoreFromMonitors(user._count.monitors);

  const totalDepositsWei = confirmedDeposits.reduce(
    (sum, tx) => sum + BigInt(tx.amount),
    BigInt(0)
  );
  const depositScore = scoreFromDepositsWei(totalDepositsWei);

  // Account age
  const ageDays =
    (Date.now() - user.createdAt.getTime()) /
    (1000 * 60 * 60 * 24);
  const ageScore = scoreFromAge(ageDays);

  const customerScore = monitorScore + depositScore + ageScore;

  const totalScore = validatorScore + customerScore;

  if (totalScore < minScore) {
    return { ok: false, score: totalScore };
  }

  return { ok: true };
}
