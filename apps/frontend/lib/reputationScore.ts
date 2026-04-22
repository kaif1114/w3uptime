export interface ReputationCounters {
  goodTicks: number;
  badTicks: number;
}

const BAD_TICK_PENALTY = 2;

export function computeReputationScore(counters: ReputationCounters): number {
  return counters.goodTicks - BAD_TICK_PENALTY * counters.badTicks;
}
