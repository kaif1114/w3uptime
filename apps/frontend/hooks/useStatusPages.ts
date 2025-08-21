import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateStatusPageData,
  CreateStatusPageResponse,
  DeleteStatusPageResponse,
  GetStatusPageResponse,
  StatusPagesListResponse,
  UpdateStatusPageData,
  UpdateStatusPageResponse,
} from "@/types/status-page";

const API_BASE = "/api/status-pages";

export function useStatusPages() {
  return useQuery<StatusPagesListResponse>({
    queryKey: ["status-pages"],
    queryFn: async () => {
      const res = await fetch(API_BASE, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch status pages");
      return res.json();
    },
  });
}

export function useStatusPage(id: string) {
  return useQuery<GetStatusPageResponse>({
    queryKey: ["status-page", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/${id}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch status page");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateStatusPage() {
  const qc = useQueryClient();
  return useMutation<CreateStatusPageResponse, Error, CreateStatusPageData>({
    mutationFn: async (data) => {
      const res = await fetch(API_BASE, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let message = "Failed to create status page";
        try {
          const err = await res.json();
          message = err.error || message;
        } catch {}
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["status-pages"] });
    },
  });
}

export function useUpdateStatusPage() {
  const qc = useQueryClient();
  return useMutation<
    UpdateStatusPageResponse,
    Error,
    { id: string; data: UpdateStatusPageData }
  >({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let message = "Failed to update status page";
        try {
          const err = await res.json();
          message = err.error || message;
        } catch {}
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["status-pages"] });
      qc.invalidateQueries({ queryKey: ["status-page", vars.id] });
    },
  });
}

export function useDeleteStatusPage() {
  const qc = useQueryClient();
  return useMutation<DeleteStatusPageResponse, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete status page");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["status-pages"] });
    },
  });
}
