
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Monitor, 
  CreateMonitorData, 
  UpdateMonitorData,
  MonitorApiResponse,
  CreateMonitorResponse,
  UpdateMonitorResponse,
  DeleteMonitorResponse,
  MonitorAnalyticsResponse,
  MonitorTimeSeriesResponse,
} from "@/types/monitor";

const API_BASE = "/api/monitors";


export function useMonitors() {
  return useQuery<MonitorApiResponse>({
    queryKey: ["monitors"],
    queryFn: async () => {
      const response = await fetch(API_BASE, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch monitors");
      }
      return response.json();
    },
  });
}


export function useMonitor(id: string) {
  return useQuery<Monitor>({
    queryKey: ["monitor", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch monitor");
      }
      return response.json();
    },
    enabled: !!id,
  });
}


export function useMonitorDetails(id: string) {
  return useQuery<Monitor>({
    queryKey: ["monitor-details", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch monitor details");
      }
      return response.json();
    },
    enabled: !!id,
    refetchInterval: 30000, 
  });
}


export function useCreateMonitor() {
  const queryClient = useQueryClient();

  return useMutation<CreateMonitorResponse, Error, CreateMonitorData>({
    mutationFn: async (data) => {
      const response = await fetch(API_BASE, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create monitor");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    },
  });
}


export function useUpdateMonitor() {
  const queryClient = useQueryClient();

  return useMutation<UpdateMonitorResponse, Error, { id: string; data: UpdateMonitorData }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update monitor");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["monitor", variables.id] });
    },
  });
}


export function useDeleteMonitor() {
  const queryClient = useQueryClient();

  return useMutation<DeleteMonitorResponse, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete monitor");
      }

      return response.json();
    },
    onSuccess: (data, deletedMonitorId) => {
      
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      
      
      queryClient.removeQueries({ queryKey: ["monitor", deletedMonitorId] });
      queryClient.removeQueries({ queryKey: ["monitor-analytics", deletedMonitorId] });
      queryClient.removeQueries({ queryKey: ["monitor-timeseries", deletedMonitorId] });
      queryClient.removeQueries({ queryKey: ["monitor-stats", deletedMonitorId] });
      queryClient.removeQueries({ queryKey: ["monitor-incidents", deletedMonitorId] });
    },
    onError: (error) => {
      console.error("Error deleting monitor:", error);
    },
  });
}


export function usePauseMonitor() {
  const queryClient = useQueryClient();

  return useMutation<UpdateMonitorResponse, Error, { id: string; status: "ACTIVE" | "PAUSED" }>({
    mutationFn: async ({ id, status }) => {
      
      const currentResponse = await fetch(`${API_BASE}/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!currentResponse.ok) {
        throw new Error("Failed to fetch current monitor data");
      }
      const currentMonitor = await currentResponse.json();

      
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...currentMonitor,
          status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update monitor status");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["monitor", variables.id] });
    },
  });
}


export function useMonitorAnalytics(id: string, period: string = 'day') {
  return useQuery<MonitorAnalyticsResponse>({
    queryKey: ["monitor-analytics", id, period],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${id}/analytics?period=${period}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch monitor analytics");
      }
      return response.json();
    },
    enabled: !!id,
    refetchInterval: 60000, 
    staleTime: 30000, 
  });
}


export function useMonitorTimeSeries(id: string, period: string = 'day') {
  return useQuery<MonitorTimeSeriesResponse>({
    queryKey: ["monitor-timeseries", id, period],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${id}/timeseries?period=${period}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch monitor timeseries");
      }
      return response.json();
    },
    enabled: !!id,
    refetchInterval: 60000, 
    staleTime: 30000, 
  });
}


export function useMonitorStats(id: string, period: string = 'day') {
  return useQuery({
    queryKey: ["monitor-stats", id, period],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${id}/stats?period=${period}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch monitor stats");
      }
      return response.json();
    },
    enabled: !!id,
    refetchInterval: 60000, 
    staleTime: 30000, 
  });
}


export function useMonitorIncidents(id: string) {
  return useQuery<{ monitorId: string; incidentCount: number }>({
    queryKey: ["monitor-incidents", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${id}/incidents`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch monitor incidents");
      }
      return response.json();
    },
    enabled: !!id,
    refetchInterval: 60000, 
    staleTime: 30000, 
  });
}

