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
    downtime: number | null;
    Monitor: {
      id: string;
      name: string;
      url: string;
      escalationPolicy?: {
        id: string;
        name: string;
      };
    };
    }
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

  return response.json();

};

export function useIncident(id: string) {
  return useQuery<IncidentApiResponse, Error>({
    queryKey: ["incident", id],
    queryFn: () => fetchIncident(id),
    enabled: Boolean(id),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}