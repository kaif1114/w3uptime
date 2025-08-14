 "use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Monitor, 
  CreateMonitorData, 
  UpdateMonitorData,
  MonitorApiResponse,
  CreateMonitorResponse,
  UpdateMonitorResponse,
  DeleteMonitorResponse,
  MonitorDetailsResponse
} from "@/types/monitor";

const API_BASE = "/api/monitors";

// Fetch all monitors
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

// Fetch single monitor
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

// Fetch monitor details with stats and metrics
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
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

// Create monitor
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

// Update monitor
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

// Delete monitor
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    },
  });
}

// Pause/Unpause monitor  
export function usePauseMonitor() {
  const queryClient = useQueryClient();

  return useMutation<UpdateMonitorResponse, Error, { id: string; status: "ACTIVE" | "PAUSED" }>({
    mutationFn: async ({ id, status }) => {
      // Get current monitor data first
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

      // Update with new status
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