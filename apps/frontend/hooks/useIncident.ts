import { useQuery } from "@tanstack/react-query";

interface IncidentApiResponse {
  incident: {
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
  };
}

const fetchIncident = async (id: string) => {
  const response = await fetch(`/api/incidents/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch incident: ${response.statusText}`);
  }

  const data: IncidentApiResponse = await response.json();
  
  return {
    id: data.incident.id,
    title: data.incident.title,
    description: data.incident.cause === "TEST" ? "Test incident" : "URL unavailable",
    cause: data.incident.cause,
    severity: "MINOR" as const,
    status: data.incident.status,
    monitorId: data.incident.monitorId,
    createdAt: new Date(data.incident.createdAt),
    updatedAt: new Date(data.incident.updatedAt),
    resolvedAt: data.incident.resolvedAt ? new Date(data.incident.resolvedAt) : undefined,
    downtime: undefined,
    escalated: false,
    Monitor: data.incident.Monitor,
    comments: [],
    postmortem: undefined,
  };
};

export function useIncident(id: string) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: () => fetchIncident(id),
    enabled: Boolean(id),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}