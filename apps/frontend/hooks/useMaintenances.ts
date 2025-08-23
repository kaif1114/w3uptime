import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Maintenance {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO string
  end: string; // ISO string
  status: "scheduled" | "in_progress" | "completed";
}

export interface CreateMaintenanceData {
  title: string;
  description: string;
  from: string; // ISO string
  to: string; // ISO string
}

export interface UpdateMaintenanceData {
  title?: string;
  description?: string;
  from?: string; // ISO string
  to?: string; // ISO string
}

export interface MaintenancesResponse {
  maintenances: Maintenance[];
}

export interface CreateMaintenanceResponse {
  message: string;
  maintenance: Maintenance;
}

export interface UpdateMaintenanceResponse {
  message: string;
  maintenance: Maintenance;
}

export interface DeleteMaintenanceResponse {
  message: string;
}

// Fetch all maintenances for a status page
export function useMaintenances(statusPageId: string) {
  return useQuery<MaintenancesResponse>({
    queryKey: ["maintenances", statusPageId],
    queryFn: async () => {
      const response = await fetch(`/api/custompage/${statusPageId}/maintenance`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch maintenances");
      }
      
      return response.json();
    },
    enabled: !!statusPageId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

// Fetch a specific maintenance
export function useMaintenance(customid: string, maintenanceid: string) {
  return useQuery<Maintenance>({
    queryKey: ["maintenance", customid, maintenanceid],
    queryFn: async () => {
      const response = await fetch(`/api/custompage/${customid}/maintenance/${maintenanceid}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch maintenance");
      }
      
      return response.json();
    },
    enabled: !!(customid && maintenanceid),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

// Create a new maintenance
export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation<CreateMaintenanceResponse, Error, { statusPageId: string; data: CreateMaintenanceData }>({
    mutationFn: async ({ statusPageId, data }) => {
      const response = await fetch(`/api/custompage/${statusPageId}/maintenance`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create maintenance");
      }

      return response.json();
    },
    onSuccess: (response, variables) => {
      console.log("Maintenance created successfully:", response.maintenance);
      // Invalidate maintenances list for this status page
      queryClient.invalidateQueries({ queryKey: ["maintenances", variables.statusPageId] });
      // Set the new maintenance in cache
      queryClient.setQueryData(
        ["maintenance", variables.statusPageId, response.maintenance.id],
        response.maintenance
      );
    },
    onError: (error: any) => {
      console.error("Error creating maintenance:", error);
    },
  });
}

// Update a maintenance
export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateMaintenanceResponse,
    Error,
    { statusPageId: string; maintenanceId: string; data: UpdateMaintenanceData }
  >({
    mutationFn: async ({ statusPageId, maintenanceId, data }) => {
      const response = await fetch(`/api/custompage/${statusPageId}/maintenance/${maintenanceId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update maintenance");
      }

      return response.json();
    },
    onSuccess: (response, variables) => {
      console.log("Maintenance updated successfully:", response.maintenance);
      // Invalidate and update caches
      queryClient.invalidateQueries({ queryKey: ["maintenances", variables.statusPageId] });
      queryClient.setQueryData(
        ["maintenance", variables.statusPageId, variables.maintenanceId],
        response.maintenance
      );
    },
    onError: (error: any) => {
      console.error("Error updating maintenance:", error);
    },
  });
}

// Delete a maintenance
export function useDeleteMaintenance() {
  const queryClient = useQueryClient();

  return useMutation<DeleteMaintenanceResponse, Error, { statusPageId: string; maintenanceId: string }>({
    mutationFn: async ({ statusPageId, maintenanceId }) => {
      const response = await fetch(`/api/custompage/${statusPageId}/maintenance/${maintenanceId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete maintenance");
      }

      return response.json();
    },
    onSuccess: (response, variables) => {
      console.log("Maintenance deleted successfully:", response.message);
      // Invalidate maintenances list and remove from cache
      queryClient.invalidateQueries({ queryKey: ["maintenances", variables.statusPageId] });
      queryClient.removeQueries({ 
        queryKey: ["maintenance", variables.statusPageId, variables.maintenanceId] 
      });
    },
    onError: (error: any) => {
      console.error("Error deleting maintenance:", error);
    },
  });
}

