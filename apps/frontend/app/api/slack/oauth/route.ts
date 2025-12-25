import { NextRequest, NextResponse } from "next/server";
import { getSessionOnServer } from "@/lib/GetSessionOnServer";
import { prisma } from "db/client";

interface SlackApiChannel {
  id: string;
  name: string;
  is_archived: boolean;
  is_private?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOnServer();
    if (!session?.authenticated || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error("Slack OAuth error:", tokenData);
      return NextResponse.json(
        { error: tokenData.error || "Failed to exchange authorization code" },
        { status: 400 }
      );
    }

    
    let webhookUrl: string | null = null;
    if (tokenData.incoming_webhook) {
      webhookUrl = tokenData.incoming_webhook.url;
      console.log("Webhook URL received from Slack:", webhookUrl);
    }

    
    let defaultChannelId: string | null = null;
    let defaultChannelName: string | null = null;

    try {
      const channelsResponse = await fetch("https://slack.com/api/conversations.list", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const channelsData = await channelsResponse.json();

      if (channelsData.ok && channelsData.channels) {
        
        const generalChannel = channelsData.channels.find((ch: SlackApiChannel) => 
          ch.name === "general" && !ch.is_archived
        );

        if (generalChannel) {
          defaultChannelId = generalChannel.id;
          defaultChannelName = generalChannel.name;
        } else {
          
          const firstChannel = channelsData.channels.find((ch: SlackApiChannel) => 
            !ch.is_private && !ch.is_archived
          );
          
          if (firstChannel) {
            defaultChannelId = firstChannel.id;
            defaultChannelName = firstChannel.name;
          }
        }
      }
    } catch (channelError) {
      console.error("Error fetching default channel:", channelError);
      
    }

    
    const existingIntegration = await prisma.slackIntegration.findUnique({
      where: { teamId: tokenData.team.id },
    });

    if (existingIntegration) {
      
      await prisma.slackIntegration.update({
        where: { teamId: tokenData.team.id },
        data: {
          userId: session.user.id,
          accessToken: tokenData.access_token,
          botUserId: tokenData.bot_user_id,
          scope: tokenData.scope,
          defaultChannelId,
          defaultChannelName,
          webhookUrl,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } else {
      
      await prisma.slackIntegration.create({
        data: {
          userId: session.user.id,
          teamId: tokenData.team.id,
          teamName: tokenData.team.name,
          accessToken: tokenData.access_token,
          botUserId: tokenData.bot_user_id,
          scope: tokenData.scope,
          defaultChannelId,
          defaultChannelName,
          webhookUrl,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      team: {
        id: tokenData.team.id,
        name: tokenData.team.name,
      },
      defaultChannel: defaultChannelId ? {
        id: defaultChannelId,
        name: defaultChannelName,
      } : null,
      webhook: webhookUrl ? {
        url: webhookUrl,
        configured: true,
      } : null,
    });
  } catch (error) {
    console.error("Slack OAuth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}