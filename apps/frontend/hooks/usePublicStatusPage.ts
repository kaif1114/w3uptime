import { useQuery } from "@tanstack/react-query";

// Public API Types
export interface PublicStatusPageSection {
  id: string;
  name: string;
  description: string | null;
  order: number;
  type: string;
  monitor: {
    id: string;
    name: string;
    url: string;
    status: string;
  };
}

export interface PublicMaintenance {
  id: string;
  title: string;
  description: string;
  from: string; // ISO string
  to: string; // ISO string
  status: "scheduled" | "in_progress" | "completed";
}

export interface PublicUpdate {
  id: string;
  title: string;
  description: string;
  publishedAt: string; // ISO string
  affectedSections: {
    id: string;
    status: string;
    section: {
      id: string;
      name: string;
    };
  }[];
}

export interface PublicStatusPageResponse {
  id: string;
  name: string;
  logoUrl: string | null;
  logoLinkUrl: string | null;
  supportUrl: string | null;
  announcement: string | null;
  sections: PublicStatusPageSection[];
  maintenances: PublicMaintenance[];
  updates: PublicUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicMaintenancesResponse {
  maintenances: PublicMaintenance[];
}

export interface PublicUpdatesResponse {
  updates: PublicUpdate[];
}

// Individual hooks for each data type
export function usePublicStatusPage(id: string) {
  return useQuery<PublicStatusPageResponse>({
    queryKey: ["public-status-page", id],
    queryFn: async () => {
      const res = await fetch(`/api/public/status-pages/${id}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch public status page");
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false; // Don't retry for not found
      return failureCount < 2;
    },
  });
}

export function usePublicMaintenances(id: string) {
  return useQuery<PublicMaintenancesResponse>({
    queryKey: ["public-maintenances", id],
    queryFn: async () => {
      const res = await fetch(`/api/public/status-pages/${id}/maintenances`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch public maintenances");
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function usePublicUpdates(id: string) {
  return useQuery<PublicUpdatesResponse>({
    queryKey: ["public-updates", id],
    queryFn: async () => {
      const res = await fetch(`/api/public/status-pages/${id}/updates`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch public updates");
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

// Combined hook for parallel fetching
export function usePublicStatusPageData(id: string) {
  const statusPageQuery = usePublicStatusPage(id);
  const maintenancesQuery = usePublicMaintenances(id);
  const updatesQuery = usePublicUpdates(id);

  return {
    // Individual query results
    statusPage: statusPageQuery,
    maintenances: maintenancesQuery,
    updates: updatesQuery,
    
    // Combined data
    data: statusPageQuery.data ? {
      ...statusPageQuery.data,
      // Override with separate API data if available, fallback to embedded data
      maintenances: maintenancesQuery.data?.maintenances || statusPageQuery.data.maintenances,
      updates: updatesQuery.data?.updates || statusPageQuery.data.updates,
    } : null,
    
    // Combined loading state
    isLoading: statusPageQuery.isLoading || maintenancesQuery.isLoading || updatesQuery.isLoading,
    
    // Combined error state
    error: statusPageQuery.error || maintenancesQuery.error || updatesQuery.error,
    
    // Individual loading states for granular control
    isStatusPageLoading: statusPageQuery.isLoading,
    isMaintenancesLoading: maintenancesQuery.isLoading,
    isUpdatesLoading: updatesQuery.isLoading,
    
    // Refetch all
    refetch: () => {
      statusPageQuery.refetch();
      maintenancesQuery.refetch();
      updatesQuery.refetch();
    },
  };
}