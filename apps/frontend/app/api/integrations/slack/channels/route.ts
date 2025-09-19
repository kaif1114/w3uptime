import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { prisma } from 'db/client';
import { WebClient } from '@slack/web-api';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await authenticateRequest(request);
    
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const teamId = url.searchParams.get('teamId');

    // Get user's Slack integrations
    const integrations = await prisma.slackIntegration.findMany({
      where: {
        userId: authResult.user.id,
        isActive: true,
        ...(teamId && { teamId })
      },
      select: {
        id: true,
        teamId: true,
        teamName: true,
        accessToken: true,
        botAccessToken: true,
        scope: true,
        createdAt: true
      }
    });

    if (integrations.length === 0) {
      return NextResponse.json({
        success: true,
        integrations: [],
        channels: []
      });
    }

    // Fetch channels for each integration
    const integrationsWithChannels = await Promise.all(
      integrations.map(async (integration: typeof integrations[0]) => {
        try {
          // Use bot token if available, otherwise use user token
          const token = integration.botAccessToken || integration.accessToken;
          const slack = new WebClient(token);

          // Fetch public channels
          const channelsResponse = await slack.conversations.list({
            types: 'public_channel,private_channel',
            exclude_archived: true,
            limit: 100
          });

          const channels = channelsResponse.channels?.map(channel => ({
            id: channel.id,
            name: channel.name,
            isPrivate: channel.is_private,
            isMember: channel.is_member,
            purpose: channel.purpose?.value || '',
            memberCount: channel.num_members
          })) || [];

          return {
            ...integration,
            channels: channels.filter(channel => channel.isMember), // Only show channels the bot/user is a member of
            accessToken: undefined, // Don't send tokens to frontend
            botAccessToken: undefined
          };

        } catch (error) {
          console.error(`Error fetching channels for team ${integration.teamId}:`, error);
          return {
            ...integration,
            channels: [],
            error: 'Failed to fetch channels',
            accessToken: undefined,
            botAccessToken: undefined
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      integrations: integrationsWithChannels
    });

  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Slack channels' },
      { status: 500 }
    );
  }
}
