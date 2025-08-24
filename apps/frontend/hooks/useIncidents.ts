import { useState, useEffect } from "react";
import {
  Incident,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  IncidentsResponse,
  PaginationMetadata,
  IncidentFilters,
} from "@/types/incident";

interface FetchIncidentsOptions {
  monitorId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
}

interface UseIncidentsReturn {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  pagination?: PaginationMetadata;
  filters?: IncidentFilters;
  createIncident: (data: CreateIncidentRequest) => Promise<void>;
  updateIncident: (id: string, data: UpdateIncidentRequest) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;
  refetch: (options?: FetchIncidentsOptions) => Promise<void>;
  fetchIncidents: (options?: FetchIncidentsOptions) => Promise<void>;
}

export function useIncidents(): UseIncidentsReturn {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMetadata>();
  const [filters, setFilters] = useState<IncidentFilters>();

  const fetchIncidents = async (options?: FetchIncidentsOptions) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const searchParams = new URLSearchParams();
      
      if (options?.monitorId) {
        searchParams.append("monitorId", options.monitorId);
      }
      if (options?.page) {
        searchParams.append("page", options.page.toString());
      }
      if (options?.limit) {
        searchParams.append("limit", options.limit.toString());
      }
      if (options?.sortBy) {
        searchParams.append("sortBy", options.sortBy);
      }
      if (options?.sortOrder) {
        searchParams.append("sortOrder", options.sortOrder);
      }
      if (options?.status) {
        searchParams.append("status", options.status);
      }

      const url = `/api/incidents${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch incidents: ${response.statusText}`);
      }

      const data: IncidentsResponse = await response.json();

      // Transform the API response to match the expected Incident type
      const transformedIncidents: Incident[] = data.incidents.map(
        (incident) => ({
          ...incident,
          // Provide default values for missing fields
          severity: (incident as any).severity || "MINOR",
          downtime: (incident as any).downtime || undefined,
          createdAt: new Date(incident.createdAt),
          updatedAt: new Date(incident.updatedAt),
          resolvedAt: incident.resolvedAt
            ? new Date(incident.resolvedAt)
            : undefined,
          comments: incident.comments.map((comment) => ({
            ...comment,
            createdAt: new Date(comment.createdAt),
          })),
          postmortem: incident.postmortem
            ? {
                ...incident.postmortem,
                createdAt: new Date(incident.postmortem.createdAt),
              }
            : undefined,
        })
      );

      setIncidents(transformedIncidents);
      setPagination(data.pagination);
      setFilters(data.filters);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch incidents"
      );
    } finally {
      setLoading(false);
    }
  };

  const createIncident = async (data: CreateIncidentRequest) => {
    try {
      setError(null);

      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create incident: ${response.statusText}`);
      }

      // Refetch incidents to get the updated list
      await fetchIncidents();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create incident"
      );
      throw err;
    }
  };

  const updateIncident = async (id: string, data: UpdateIncidentRequest) => {
    try {
      setError(null);

      const response = await fetch(`/api/incidents/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update incident: ${response.statusText}`);
      }

      // Refetch incidents to get the updated list
      await fetchIncidents();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update incident"
      );
      throw err;
    }
  };

  const deleteIncident = async (id: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/incidents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete incident: ${response.statusText}`);
      }

      // Refetch incidents to get the updated list
      await fetchIncidents();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete incident"
      );
      throw err;
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  return {
    incidents,
    loading,
    error,
    pagination,
    filters,
    createIncident,
    updateIncident,
    deleteIncident,
    refetch: fetchIncidents,
    fetchIncidents,
  };
}
