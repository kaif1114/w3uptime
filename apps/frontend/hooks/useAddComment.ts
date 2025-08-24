import { useState } from "react";

interface AddCommentRequest {
  description: string;
}

interface TimelineEvent {
  id: string;
  description: string;
  type: string;
  createdAt: Date;
  user: {
    id: string;
    walletAddress: string;
  } | null;
}

interface UseAddCommentReturn {
  addComment: (incidentId: string, data: AddCommentRequest) => Promise<TimelineEvent>;
  loading: boolean;
  error: string | null;
}

export function useAddComment(): UseAddCommentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addComment = async (incidentId: string, data: AddCommentRequest): Promise<TimelineEvent> => {
    try {
      setLoading(true);
      setError(null);

      if (!incidentId) {
        throw new Error("Incident ID is required");
      }

      if (!data.description?.trim()) {
        throw new Error("Comment description is required");
      }

      const response = await fetch(`/api/incidents/${incidentId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: data.description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add comment: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Transform the response to ensure dates are properly converted
      const timelineEvent: TimelineEvent = {
        ...result.timelineEvent,
        createdAt: new Date(result.timelineEvent.createdAt),
      };

      return timelineEvent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add comment";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    addComment,
    loading,
    error,
  };
}