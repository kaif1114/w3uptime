"use client";

import { useQuery } from "@tanstack/react-query";

export interface ReputationData {
  totalScore: number;
  validatorScore: number;
  customerScore: number;
  monitorScore: number;
  depositScore: number;
  ageScore: number;
  earned: number;
  claimed: number;
  available: number;
  onChainBalance: number | null;
  thresholds: {
    createProposal: number;
    comment: number;
    vote: number;
  };
}

async function fetchReputation(): Promise<ReputationData> {
  const response = await fetch("/api/community/reputation", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch reputation");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch reputation");
  }

  return result.data as ReputationData;
}

export function useReputation() {
  return useQuery({
    queryKey: ["reputation"],
    queryFn: fetchReputation,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}


