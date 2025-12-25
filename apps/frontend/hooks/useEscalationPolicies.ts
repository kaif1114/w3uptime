import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EscalationPolicy,
  CreateEscalationPolicyRequest,
  CreateEscalationPolicyResponse,
} from "@/types/EscalationPolicy";


export interface FetchEscalationPoliciesParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedEscalationPoliciesResponse {
  escalationPolicies: EscalationPolicy[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  search: string;
  sortBy: string;
  sortOrder: string;
}


async function fetchEscalationPolicies(
  params: FetchEscalationPoliciesParams = {}
): Promise<PaginatedEscalationPoliciesResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const res = await fetch(
    `/api/escalation-policies?${searchParams.toString()}`,
    {
      credentials: "include",
    }
  );

  if (!res.ok) {
    const error: any = new Error("Failed to fetch escalation policies");
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return data;
}


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
    const errorData = await res.json().catch(() => ({}));
    const error: any = new Error(
      errorData.error || "Failed to create escalation policy"
    );
    error.status = res.status;
    error.details = errorData.details;
    throw error;
  }

  return res.json();
}


async function bulkDeleteEscalationPolicies(ids: string[]): Promise<any> {
  const res = await fetch("/api/escalation-policies", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error: any = new Error(
      errorData.error || "Failed to delete escalation policies"
    );
    error.status = res.status;
    error.details = errorData.details;
    error.policiesInUse = errorData.policiesInUse;
    throw error;
  }

  return res.json();
}


async function updateEscalationPolicy(
  id: string,
  data: {
    name: string;
    levels: {
      id?: string;
      method: "EMAIL" | "SLACK" | "WEBHOOK";
      target: string;
      slackChannels?: any[];
      waitTimeMinutes: number;
    }[];
  }
): Promise<{ message: string; escalationPolicy: EscalationPolicy }> {
  const res = await fetch(`/api/escalation-policies/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error: any = new Error(
      errorData.error || "Failed to update escalation policy"
    );
    error.status = res.status;
    error.details = errorData.details;
    throw error;
  }

  return res.json();
}


export function useEscalationPolicies(
  params: FetchEscalationPoliciesParams = {}
) {
  return useQuery({
    queryKey: ["escalation-policies", params],
    queryFn: () => fetchEscalationPolicies(params),
    staleTime: 1000 * 60 * 5, 
    gcTime: 1000 * 60 * 30, 
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}


export function useCreateEscalationPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEscalationPolicy,
    onSuccess: (response) => {
      console.log(
        "Escalation policy created successfully:",
        response.escalationPolicy
      );
      
      queryClient.invalidateQueries({ queryKey: ["escalation-policies"] });
    },
    onError: (error: any) => {
      console.error("Error creating escalation policy:", error);
      console.error("Error details:", error.details);
    },
  });
}


export function useBulkDeleteEscalationPolicies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkDeleteEscalationPolicies,
    onSuccess: (response) => {
      console.log("Escalation policies deleted successfully:", response);
      
      queryClient.invalidateQueries({ queryKey: ["escalation-policies"] });
    },
    onError: (error: any) => {
      console.error("Error deleting escalation policies:", error);
      console.error("Error details:", error.details);
      if (error.policiesInUse) {
        console.error("Policies in use:", error.policiesInUse);
      }
    },
  });
}


export function useUpdateEscalationPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateEscalationPolicy(id, data),
    onSuccess: (response, variables) => {
      console.log(
        "Escalation policy updated successfully:",
        response.escalationPolicy
      );
      
      queryClient.invalidateQueries({ queryKey: ["escalation-policies"] });
      queryClient.invalidateQueries({
        queryKey: ["escalation-policy", variables.id],
      });
    },
    onError: (error: any) => {
      console.error("Error updating escalation policy:", error);
      console.error("Error details:", error.details);
    },
  });
}


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
    staleTime: 1000 * 60 * 5, 
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}
