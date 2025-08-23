import { useState, useEffect } from "react";
import {
  Incident,
  CreateIncidentRequest,
  UpdateIncidentRequest,
} from "@/types/incident";
import { generateDummyIncidents } from "@/lib/dummy-data";

interface UseIncidentsReturn {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  createIncident: (data: CreateIncidentRequest) => Promise<void>;
  updateIncident: (id: string, data: UpdateIncidentRequest) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useIncidents(): UseIncidentsReturn {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, use dummy data
      // TODO: Replace with actual API call when ready
      const dummyData = generateDummyIncidents();
      setIncidents(dummyData);
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

      // TODO: Replace with actual API call when ready
      const newIncident: Incident = {
        id: `incident-${Date.now()}`,
        title: data.title,
        description: data.description,
        severity: data.severity || "MINOR",
        status: data.status || "ACKNOWLEDGED",
        monitorId: data.monitorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        escalated: data.escalated || false,
        Monitor: {
          id: data.monitorId,
          name: "New Monitor",
          url: "https://example.com",
        },
        comments: [],
      };

      setIncidents((prev) => [newIncident, ...prev]);
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

      // TODO: Replace with actual API call when ready
      setIncidents((prev) =>
        prev.map((incident) =>
          incident.id === id
            ? {
                ...incident,
                ...data,
                updatedAt: new Date(),
                resolvedAt:
                  data.status === "RESOLVED" ? new Date() : incident.resolvedAt,
              }
            : incident
        )
      );
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

      // TODO: Replace with actual API call when ready
      setIncidents((prev) => prev.filter((incident) => incident.id !== id));
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
    createIncident,
    updateIncident,
    deleteIncident,
    refetch: fetchIncidents,
  };
}
