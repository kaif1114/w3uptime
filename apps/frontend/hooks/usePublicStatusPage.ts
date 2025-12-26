import { useQuery } from "@tanstack/react-query";
import { MonitorTimeSeriesResponse } from "@/types/monitor";


export interface PublicStatusPageSection {
  id: string;
  name: string;
  description: string | null;
  order: number;
  type: "STATUS" | "HISTORY" | "BOTH";
  monitor: {
    id: string;
    name: string;
    url: string;
    status: string;
    lastCheckedAt: string | null;
  };
}

export interface PublicMaintenance {
  id: string;
  title: string;
  description: string;
  from: string; 
  to: string; 
  status: "scheduled" | "in_progress" | "completed";
}

export interface PublicUpdate {
  id: string;
  title: string;
  description: string;
  publishedAt: string; 
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
    staleTime: 1000 * 60 * 2, 
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false; 
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
    staleTime: 1000 * 60 * 5, 
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
    staleTime: 1000 * 60 * 5, 
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}


export function usePublicStatusPageData(id: string) {
  const statusPageQuery = usePublicStatusPage(id);
  const maintenancesQuery = usePublicMaintenances(id);
  const updatesQuery = usePublicUpdates(id);

  return {
    
    statusPage: statusPageQuery,
    maintenances: maintenancesQuery,
    updates: updatesQuery,
    
    
    data: statusPageQuery.data ? {
      ...statusPageQuery.data,
      
      maintenances: maintenancesQuery.data?.maintenances || statusPageQuery.data.maintenances,
      updates: updatesQuery.data?.updates || statusPageQuery.data.updates,
    } : null,
    
    
    isLoading: statusPageQuery.isLoading || maintenancesQuery.isLoading || updatesQuery.isLoading,
    
    
    error: statusPageQuery.error || maintenancesQuery.error || updatesQuery.error,
    
    
    isStatusPageLoading: statusPageQuery.isLoading,
    isMaintenancesLoading: maintenancesQuery.isLoading,
    isUpdatesLoading: updatesQuery.isLoading,
    
    
    refetch: () => {
      statusPageQuery.refetch();
      maintenancesQuery.refetch();
      updatesQuery.refetch();
    },
  };
}


export function usePublicMonitorTimeSeries(monitorId: string, period: string = 'day') {
  return useQuery<MonitorTimeSeriesResponse>({
    queryKey: ["public-monitor-timeseries", monitorId, period],
    queryFn: async () => {
      const response = await fetch(`/api/public/monitors/${monitorId}/timeseries?period=${period}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch public monitor timeseries");
      }
      return response.json();
    },
    enabled: !!monitorId,
    refetchInterval: 60000, 
    staleTime: 30000, 
  });
}