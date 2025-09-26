"use client";

import { useQuery } from "@tanstack/react-query";

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

export interface WorkspaceChannels {
  teamId: string;
  teamName: string;
  channels: SlackChannel[];
}

interface SlackChannelsResponse {
  workspaces: WorkspaceChannels[];
}

export function useSlackChannels() {
  return useQuery<SlackChannelsResponse>({
    queryKey: ["slack-channels"],
    queryFn: async () => {
      const response = await fetch("/api/slack/channels");
      if (!response.ok) {
        throw new Error("Failed to fetch Slack channels");
      }
      return response.json();
    },
  });
}