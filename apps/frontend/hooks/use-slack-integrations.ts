"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SlackIntegration {
  id: string;
  teamId: string;
  teamName: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  defaultChannelId?: string;
  defaultChannelName?: string;
  webhookUrl?: string;
}

interface SlackIntegrationsResponse {
  integrations: SlackIntegration[];
}

export function useSlackIntegrations() {
  return useQuery<SlackIntegrationsResponse>({
    queryKey: ["slack-integrations"],
    queryFn: async () => {
      const response = await fetch("/api/slack/integrations");
      if (!response.ok) {
        throw new Error("Failed to fetch Slack integrations");
      }
      return response.json();
    },
  });
}

export function useDeleteSlackIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await fetch(`/api/slack/integrations?id=${integrationId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete Slack integration");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slack-integrations"] });
    },
  });
}

