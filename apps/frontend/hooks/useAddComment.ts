import { useMutation } from "@tanstack/react-query";
import { TimelineEvent } from "@prisma/client";

export function useAddComment() {
  return useMutation<
    TimelineEvent,
    Error,
    {
      incidentId: string;
      description: string;
    }
  >({
    mutationFn: async ({
      incidentId,
      description,
    }: {
      incidentId: string;
      description: string;
    }) => {
      const response = await fetch(`/api/incidents/${incidentId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to add any comment: ${response.statusText}`
        );
      }

      const result = await response.json();
      return result.timelineEvent;
    },
  });
}
