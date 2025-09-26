import { NextResponse } from "next/server";
import { getSessionOnServer } from "@/lib/get-session-on-server";
import { prisma } from "db/client";

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface WorkspaceChannels {
  teamId: string;
  teamName: string;
  channels: SlackChannel[];
}

export async function GET() {
  try {
    const session = await getSessionOnServer();
    if (!session?.authenticated || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's active Slack integrations
    const integrations = await prisma.slackIntegration.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    if (integrations.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    const workspaceChannels: WorkspaceChannels[] = [];

    // Fetch channels for each workspace
    for (const integration of integrations) {
      try {
        const response = await fetch("https://slack.com/api/conversations.list", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${integration.accessToken}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.ok && data.channels) {
          const channels: SlackChannel[] = data.channels
            .filter((channel: any) => !channel.is_archived) // Only active channels
            .map((channel: any) => ({
              id: channel.id,
              name: channel.name,
              isPrivate: channel.is_private || false,
            }));

          workspaceChannels.push({
            teamId: integration.teamId,
            teamName: integration.teamName,
            channels,
          });
        } else {
          console.error(`Failed to fetch channels for team ${integration.teamName}:`, data.error);
        }
      } catch (error) {
        console.error(`Error fetching channels for team ${integration.teamName}:`, error);
      }
    }

    return NextResponse.json({ workspaces: workspaceChannels });
  } catch (error) {
    console.error("Error fetching Slack channels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}