import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EscalationPolicy,
  CreateEscalationPolicyRequest,
  CreateEscalationPolicyResponse,
} from "@/types/escalation-policy";

// Fetch all escalation policies
async function fetchEscalationPolicies(): Promise<EscalationPolicy[]> {
  const res = await fetch("/api/escalation-policies", {
    credentials: "include",
  });

  if (!res.ok) {
    const error: any = new Error("Failed to fetch escalation policies");
    error.status = res.status;
    throw error;
  }

  return res.json();
}

// Create new escalation policy
async function createEscalationPolicy(
  data: CreateEscalationPolicyRequest
): Promise<CreateEscalationPolicyResponse> {
  const res = await fetch("/api/escalation-policies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error: any = new Error("Failed to create escalation policy");
    error.status = res.status;
    throw error;
  }

  return res.json();
}

// Hook to fetch all escalation policies
export function useEscalationPolicies() {
  return useQuery({
    queryKey: ["escalation-policies"],
    queryFn: fetchEscalationPolicies,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

// Hook to create escalation policy
export function useCreateEscalationPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEscalationPolicy,
    onSuccess: () => {
      // Invalidate and refetch escalation policies list
      queryClient.invalidateQueries({ queryKey: ["escalation-policies"] });
    },
    onError: (error: any) => {
      console.error("Error creating escalation policy:", error);
    },
  });
}

// Hook to fetch single escalation policy
export function useEscalationPolicy(id: string) {
  return useQuery({
    queryKey: ["escalation-policy", id],
    queryFn: async (): Promise<EscalationPolicy> => {
      const res = await fetch(`/api/escalation-policies/${id}`, {
        credentials: "include",
        headers: { "cache-control": "no-store" },
      });

      if (!res.ok) {
        const error: any = new Error("Failed to fetch escalation policy");
        error.status = res.status;
        throw error;
      }

      return res.json();
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}
