import { useQuery } from "@tanstack/react-query";

interface TimelineEvent {
  id: string;
  description: string;
  type:
    | "INCIDENT"
    | "USER_COMMENT"
    | "POSTMORTEM"
    | "ESCALATION"
    | "RESOLUTION";
  createdAt: string;
  incidentId: string;
  userId: string;
  user: {
    id: string;
  };
  escalationLog?: {
    id: string;
    Alert?: {
      id: string;
      title: string;
      message: string;
      type: string;
      triggerStatusCode: number;
      expectedStatusCode: number;
      triggeredAt: string;
    };
    escalationLevel?: {
      id: string;
      name: string;
      levelOrder: number;
      waitMinutes: number;
      channel: string;
      contacts: string[];
      message: string;
    };
  };
}

interface TimelineApiResponse {
  timelineEvents: TimelineEvent[];
}

const fetchIncidentTimeline = async (incidentId: string) => {
  const response = await fetch(`/api/incidents/${incidentId}/timeline`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch timeline: ${response.statusText}`);
  }

  return response.json();
};

export function useIncidentTimeline(incidentId: string) {
  return useQuery<TimelineApiResponse, Error>({
    queryKey: ["incident-timeline", incidentId],
    queryFn: () => fetchIncidentTimeline(incidentId),
    enabled: Boolean(incidentId),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
