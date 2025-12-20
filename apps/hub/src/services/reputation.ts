const { prisma } = require("db/client");

export interface ReputationCounters {
    goodTicks: number;
    badTicks: number;
  }
  
  const BAD_TICK_PENALTY = 2;              // α = 2
  // const POINTS_PER_REP = 100;              // 100 raw points = 1 rep score
  const UPTIME_CHECK_REWARD = 1;           // Points per successful uptime check
  const FAILED_UPTIME_CHECK_PENALTY = 1;   // Penalty for failed uptime checks
  
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
    select: { id: true, walletAddress: true, goodTicks: true, badTicks: true },
  });
  
  if (!user) {
    return;
  }

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
    select: { id: true, walletAddress: true, goodTicks: true, badTicks: true },
  });
  
  if (!user) {
    return;
  }

  const goodTicks = user.goodTicks;
  const badTicks = user.badTicks + 1;
  const reputationScore = computeReputationScore({ goodTicks, badTicks });

  await prisma.user.update({
    where: { id: user.id },
    data: { badTicks, reputationScore },
  });
}

export async function applyUptimeCheckReward(publicKey: string) {
  const user = await prisma.user.findUnique({
    where: { publicKey },
    select: { id: true, goodTicks: true, badTicks: true, reputationScore: true },
  });
  if (!user) {
    console.warn(`User not found for publicKey: ${publicKey}`);
    return;
  }

  const newReputationScore = user.reputationScore + UPTIME_CHECK_REWARD;

  await prisma.user.update({
    where: { id: user.id },
    data: { 
      reputationScore: newReputationScore
    },
  });

  console.log(`Reputation awarded: User ${user.id} earned ${UPTIME_CHECK_REWARD} points for uptime check (new total: ${newReputationScore})`);
}

export async function applyUptimeCheckPenalty(publicKey: string) {
  const user = await prisma.user.findUnique({
    where: { publicKey },
    select: { id: true, goodTicks: true, badTicks: true, reputationScore: true },
  });
  if (!user) {
    console.warn(`User not found for publicKey: ${publicKey}`);
    return;
  }

  const newReputationScore = Math.max(0, user.reputationScore - FAILED_UPTIME_CHECK_PENALTY);

  await prisma.user.update({
    where: { id: user.id },
    data: { reputationScore: newReputationScore },
  });

  console.log(`Reputation penalty: User ${user.id} lost ${FAILED_UPTIME_CHECK_PENALTY} points for failed uptime check (new total: ${newReputationScore})`);
}