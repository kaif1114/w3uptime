import { useQuery } from "@tanstack/react-query";

export interface PublicIncidentData {
  id: string;
  title: string;
  cause: string;
  status: "ONGOING" | "ACKNOWLEDGED" | "RESOLVED";
  monitorId: string;
  createdAt: string; 
  updatedAt: string | null; 
  resolvedAt: string | null; 
  downtime: number | null; 
}

export interface PublicIncidentsResponse {
  incidents: PublicIncidentData[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublicIncidentFilters {
  page?: number;
  pageSize?: number;
  status?: "ONGOING" | "ACKNOWLEDGED" | "RESOLVED";
  monitorId?: string;
  startDate?: string; 
  endDate?: string; 
  sortBy?: "createdAt" | "resolvedAt" | "downtime";
  sortOrder?: "asc" | "desc";
}


export function usePublicIncidents(statusPageId: string, filters: PublicIncidentFilters = {}) {
  const queryParams = new URLSearchParams();
  
  
  if (filters.page) queryParams.set('page', filters.page.toString());
  if (filters.pageSize) queryParams.set('pageSize', filters.pageSize.toString());
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.monitorId) queryParams.set('monitorId', filters.monitorId);
  if (filters.startDate) queryParams.set('startDate', filters.startDate);
  if (filters.endDate) queryParams.set('endDate', filters.endDate);
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);

  return useQuery<PublicIncidentsResponse>({
    queryKey: ["public-incidents", statusPageId, filters],
    queryFn: async () => {
      const url = `/api/public/status-pages/${statusPageId}/incidents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch public incidents");
      }
      return res.json();
    },
    enabled: !!statusPageId,
    staleTime: 1000 * 60 * 2, 
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}


export function usePublicIncidentsByMonth(statusPageId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
  
  return usePublicIncidents(statusPageId, {
    startDate,
    endDate,
    sortBy: "createdAt",
    sortOrder: "desc",
    pageSize: 100, 
  });
}


export function usePublicPreviousIncidents(statusPageId: string, filters: PublicIncidentFilters = {}) {
  return usePublicIncidents(statusPageId, {
    ...filters,
    status: "RESOLVED",
    sortBy: "resolvedAt",
    sortOrder: "desc",
  });
}


export function useIncidentData(statusPageId: string, isPublic: boolean = false, filters: PublicIncidentFilters = {}) {
  const queryParams = new URLSearchParams();
  
  
  if (filters.page) queryParams.set('page', filters.page.toString());
  if (filters.pageSize) queryParams.set('pageSize', filters.pageSize.toString());
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.monitorId) queryParams.set('monitorId', filters.monitorId);
  if (filters.startDate) queryParams.set('startDate', filters.startDate);
  if (filters.endDate) queryParams.set('endDate', filters.endDate);
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);

  return useQuery<PublicIncidentsResponse>({
    queryKey: isPublic ? ["public-incidents", statusPageId, filters] : ["auth-incidents", statusPageId, filters],
    queryFn: async () => {
      const baseUrl = isPublic 
        ? `/api/public/status-pages/${statusPageId}/incidents`
        : `/api/incidents`; 
        
      const url = `${baseUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const res = await fetch(url, {
        credentials: isPublic ? "omit" : "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch incidents");
      }
      
      return res.json();
    },
    enabled: !!statusPageId,
    staleTime: 1000 * 60 * 2, 
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}