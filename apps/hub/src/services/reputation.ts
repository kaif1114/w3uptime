// packages/db/src/reputation.ts
export interface ReputationCounters {
    goodTicks: number;
    badTicks: number;
  }
  
  const BAD_TICK_PENALTY = 2;       // α = 2
  const POINTS_PER_REP = 100;       // 100 raw points = 1 rep score
  
  export function computeRawReputation(counters: ReputationCounters): number {
    const { goodTicks, badTicks } = counters;
    return goodTicks - BAD_TICK_PENALTY * badTicks;
  }
  
  export function computeReputationScore(counters: ReputationCounters): number {
    const raw = computeRawReputation(counters);
    return Math.max(0, Math.floor(raw / POINTS_PER_REP));
  }