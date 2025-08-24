import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Incident, UpdateIncidentRequest } from "@/types/incident";

interface IncidentsApiResponse {
  incidents: Array<{
    id: string;
    title: string;
    cause: string;
    status: "ONGOING" | "ACKNOWLEDGED" | "RESOLVED";
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
    monitorId: string;
    Monitor: {
      id: string;
      name: string;
      url: string;
      escalationPolicy?: {
        id: string;
        name: string;
      };
    };
  }>;
}

interface FetchIncidentsOptions {
  monitorId?: string;
  status?: string;
}

const fetchIncidents = async (options?: FetchIncidentsOptions): Promise<Incident[]> => {
  const searchParams = new URLSearchParams();
  
  if (options?.monitorId) {
    searchParams.append("monitorId", options.monitorId);
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

  const data: IncidentsApiResponse = await response.json();

  return data.incidents.map(incident => ({
    id: incident.id,
    title: incident.title,
    description: incident.cause === "TEST" ? "Test incident" : "URL unavailable",
    severity: "MINOR" as const,
    status: incident.status,
    monitorId: incident.monitorId,
    createdAt: new Date(incident.createdAt),
    updatedAt: new Date(incident.updatedAt),
    resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt) : undefined,
    downtime: undefined,
    escalated: false,
    Monitor: incident.Monitor,
    comments: [],
    postmortem: undefined,
  }));
};

export function useIncidents(options?: FetchIncidentsOptions) {
  return useQuery({
    queryKey: ["incidents", options],
    queryFn: () => fetchIncidents(options),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

const updateIncident = async ({ id, data }: { id: string; data: { status: "ONGOING" | "ACKNOWLEDGED" | "RESOLVED" } }) => {
  const response = await fetch(`/api/incidents/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update incident: ${response.statusText}`);
  }

  return response.json();
};

const deleteIncident = async (id: string) => {
  const response = await fetch(`/api/incidents/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete incident: ${response.statusText}`);
  }

  return response.json();
};

export function useUpdateIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}
