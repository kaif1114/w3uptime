// apps/frontend/app/api/proposals/ReputationGuard.ts
import { prisma } from "db/client";
import { computeReputationScore } from "hub/src/services/reputation";

export const MIN_REP_FOR_PROPOSAL = 500;
export const MIN_REP_FOR_COMMENT = 100;
export const MIN_REP_FOR_VOTE = 50;

const WEI_PER_ETH = BigInt("1000000000000000000"); // 1 ETH in wei
function scoreFromMonitors(count: number): number {
  let score = 0;

  for (let i = 0; i < count; i++) {
    score += 20;
  }

  return score;
}

function scoreFromDepositsWei(totalWei: bigint): number {
  if (totalWei < WEI_PER_ETH / BigInt(10)) return 0;     // < 0.1 ETH
  if (totalWei < WEI_PER_ETH) return 1;                 // < 1 ETH
  if (totalWei < WEI_PER_ETH * BigInt(5)) return 2;     // < 5 ETH
  return 3;
}

function scoreFromAge(days: number): number {
  const fullDays = Math.floor(days);
  let score = 0;

  for (let i = 0; i < fullDays; i++) {
    score += 5; // +5 points for each day
  }

  return score;
}

export interface ReputationBreakdown {
  totalScore: number;
  validatorScore: number;
  customerScore: number;
  monitorScore: number;
  depositScore: number;
  ageScore: number;
}

async function computeReputation(userId: string): Promise<ReputationBreakdown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      goodTicks: true,
      badTicks: true,
      _count: { select: { monitors: true } },
    },
  });

  if (!user) {
    return {
      totalScore: 0,
      validatorScore: 0,
      customerScore: 0,
      monitorScore: 0,
      depositScore: 0,
      ageScore: 0,
    };
  }

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
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const ageScore = scoreFromAge(ageDays);

  const customerScore = monitorScore + depositScore + ageScore;
  const totalScore = validatorScore + customerScore;

  return {
    totalScore,
    validatorScore,
    customerScore,
    monitorScore,
    depositScore,
    ageScore,
  };
}

export async function getReputation(
  userId: string
): Promise<ReputationBreakdown> {
  return computeReputation(userId);
}

export async function requireReputation(
  userId: string,
  minScore: number
): Promise<{ ok: true } | { ok: false; score: number }> {
  const { totalScore } = await computeReputation(userId);

  if (totalScore < minScore) {
    return { ok: false, score: totalScore };
  }

  return { ok: true };
}
