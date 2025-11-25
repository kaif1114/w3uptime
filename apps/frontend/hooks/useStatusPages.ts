import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateStatusPageData,
  CreateStatusPageResponse,
  DeleteStatusPageResponse,
  GetStatusPageResponse,
  StatusPage,
  StatusPagesListResponse,
  UpdateStatusPageData,
  UpdateStatusPageResponse,
} from "@/types/status-page";

const API_BASE = "/api/status-pages";

// Fetch all status pages
export function useStatusPages() {
  return useQuery<StatusPagesListResponse>({
    queryKey: ["status-pages"],
    queryFn: async () => {
      const res = await fetch(API_BASE, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch status pages");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

// Fetch single status page
export function useStatusPage(id: string) {
  return useQuery<GetStatusPageResponse>({
    queryKey: ["status-page", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/${id}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch status page");
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes for individual pages
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

// Create status page
export function useCreateStatusPage() {
  const queryClient = useQueryClient();

  return useMutation<CreateStatusPageResponse, Error, CreateStatusPageData>({
    mutationFn: async (data) => {
      const res = await fetch(API_BASE, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create status page");
      }

      return res.json();
    },
    onSuccess: (response) => {
      console.log("Status page created successfully:", response.statusPage);
      // Invalidate and refetch status pages list
      queryClient.invalidateQueries({ queryKey: ["status-pages"] });
      // Set the new status page in cache
      queryClient.setQueryData(
        ["status-page", response.statusPage.id],
        response.statusPage
      );
    },
    onError: (error: any) => {
      console.error("Error creating status page:", error);
    },
  });
}

// Update status page
export function useUpdateStatusPage() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateStatusPageResponse,
    Error,
    { id: string; data: UpdateStatusPageData }
  >({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update status page");
      }

      return res.json();
    },
    onSuccess: (response, variables) => {
      console.log("Status page updated successfully:", response.statusPage);
      // Invalidate and refetch status pages list
      queryClient.invalidateQueries({ queryKey: ["status-pages"] });
      // Update the specific status page in cache
      queryClient.setQueryData(
        ["status-page", variables.id],
        response.statusPage
      );
    },
    onError: (error: any) => {
      console.error("Error updating status page:", error);
    },
  });
}

// Delete status page
export function useDeleteStatusPage() {
  const queryClient = useQueryClient();

  return useMutation<DeleteStatusPageResponse, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete status page");
      }

      return res.json();
    },
    onSuccess: (response, id) => {
      console.log("Status page deleted successfully:", response.message);
      // Invalidate and refetch status pages list
      queryClient.invalidateQueries({ queryKey: ["status-pages"] });
      // Remove the specific status page from cache
      queryClient.removeQueries({ queryKey: ["status-page", id] });
    },
    onError: (error: any) => {
      console.error("Error deleting status page:", error);
    },
  });
}

// Publish/Unpublish status page (convenience hook)
export function useToggleStatusPagePublication() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateStatusPageResponse,
    Error,
    { id: string; isPublished: boolean }
  >({
    mutationFn: async ({ id, isPublished }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublished }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update status page publication status");
      }

      return res.json();
    },
    onSuccess: (response, variables) => {
      console.log(`Status page ${variables.isPublished ? 'published' : 'unpublished'} successfully:`, response.statusPage);
      // Invalidate and refetch status pages list
      queryClient.invalidateQueries({ queryKey: ["status-pages"] });
      // Update the specific status page in cache
      queryClient.setQueryData(
        ["status-page", variables.id],
        response.statusPage
      );
    },
    onError: (error: any) => {
      console.error("Error updating status page publication status:", error);
    },
  });
}