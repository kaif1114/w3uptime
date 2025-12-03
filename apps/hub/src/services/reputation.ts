const { prisma } = require("db/client");

export interface ReputationCounters {
    goodTicks: number;
    badTicks: number;
  }
  
  const BAD_TICK_PENALTY = 2;       // α = 2
  const POINTS_PER_REP = 100;       // 100 raw points = 1 rep score
  
  export function computeReputationScore(counters: ReputationCounters): number {
    const { goodTicks, badTicks } = counters;
    return goodTicks - BAD_TICK_PENALTY * badTicks;
  }
  
 
  // this should decrease the reputation score if the signature isnt matched we will minus the reputation score by 1 point
  export function decreaseReputationScore(counters: ReputationCounters): number {
    return computeReputationScore(counters) - 1;
  }

export async function applyGoodTick(publicKey: string) {
  const user = await prisma.user.findUnique({
    where: { publicKey },
    select: { id: true, goodTicks: true, badTicks: true },
  });
  if (!user) return;

  const goodTicks = user.goodTicks + 1;
  const badTicks = user.badTicks;

  const reputationScore = computeReputationScore({ goodTicks, badTicks });

  await prisma.user.update({
    where: { id: user.id },
    data: { goodTicks, reputationScore },
  });
}

export async function applyBadTick(publicKey: string) {
  const user = await prisma.user.findUnique({
    where: { publicKey },
    select: { id: true, goodTicks: true, badTicks: true },
  });
  if (!user) return;

  const goodTicks = user.goodTicks;
  const badTicks = user.badTicks + 1;

  const reputationScore = computeReputationScore({ goodTicks, badTicks });

  await prisma.user.update({
    where: { id: user.id },
    data: { badTicks, reputationScore },
  });
}