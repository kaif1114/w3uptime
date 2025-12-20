'use client';

import { useQuery } from '@tanstack/react-query';

export interface OnChainReputationData {
  onChainBalance: number | null; // Current on-chain balance
  availableToClaimPoints: number; // Unclaimed reputation from backend
  canCreateProposal: boolean; // onChainBalance >= MIN_REP_FOR_PROPOSAL
  canVote: boolean; // onChainBalance >= MIN_REP_FOR_VOTE
}

interface ReputationApiResponse {
  success: boolean;
  data: {
    earned: number;
    claimed: number;
    available: number;
    onChainBalance: number | null;
    breakdown: {
      totalScore: number;
      validatorScore: number;
      customerScore: number;
      monitorScore: number;
      depositScore: number;
      ageScore: number;
    };
  };
  error?: string;
}

async function fetchOnChainReputation(): Promise<OnChainReputationData> {
  const response = await fetch('/api/reputation', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch reputation');
  }

  const result: ReputationApiResponse = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch reputation');
  }

  const onChainBalance = result.data.onChainBalance ?? 0;
  const availableToClaimPoints = result.data.available;

  // Check thresholds (match ReputationGuard constants)
  const MIN_REP_FOR_PROPOSAL = 500;
  const MIN_REP_FOR_VOTE = 50;

  return {
    onChainBalance,
    availableToClaimPoints,
    canCreateProposal: onChainBalance >= MIN_REP_FOR_PROPOSAL,
    canVote: onChainBalance >= MIN_REP_FOR_VOTE,
  };
}

/**
 * Hook to fetch on-chain reputation balance and check governance permissions
 * 
 * Uses the /api/reputation endpoint which returns:
 * - onChainBalance: Current balance from W3Governance contract (cached 30s)
 * - available: Unclaimed reputation points that can be claimed
 * 
 * Returns permission flags for creating proposals and voting based on thresholds:
 * - MIN_REP_FOR_PROPOSAL = 500
 * - MIN_REP_FOR_VOTE = 50
 */
export function useOnChainReputation() {
  return useQuery({
    queryKey: ['onChainReputation'],
    queryFn: fetchOnChainReputation,
    staleTime: 1000 * 30, // 30 seconds (aligned with backend cache)
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

