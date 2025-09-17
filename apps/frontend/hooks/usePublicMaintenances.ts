import { useQuery } from "@tanstack/react-query";

export interface PublicMaintenanceData {
  id: string;
  title: string;
  description: string;
  from: string; // ISO string
  to: string; // ISO string
  status: "scheduled" | "in_progress" | "completed";
}

export interface PublicMaintenancesResponse {
  maintenances: PublicMaintenanceData[];
}

// Hook for fetching public maintenances (no auth required)
export function usePublicMaintenances(statusPageId: string) {
  return useQuery<PublicMaintenancesResponse>({
    queryKey: ["public-maintenances", statusPageId],
    queryFn: async () => {
      const res = await fetch(`/api/public/status-pages/${statusPageId}/maintenances`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch public maintenances");
      }
      return res.json();
    },
    enabled: !!statusPageId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

// Hook that works for both authenticated and public access
export function useMaintenanceData(statusPageId: string, isPublic: boolean = false) {
  return useQuery<PublicMaintenancesResponse>({
    queryKey: isPublic ? ["public-maintenances", statusPageId] : ["auth-maintenances", statusPageId],
    queryFn: async () => {
      const endpoint = isPublic 
        ? `/api/public/status-pages/${statusPageId}/maintenances`
        : `/api/custompage/${statusPageId}/maintenance`;
      
      const res = await fetch(endpoint, {
        credentials: isPublic ? "omit" : "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch maintenances");
      }
      
      return res.json();
    },
    enabled: !!statusPageId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}