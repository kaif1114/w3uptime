import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=slack_oauth_${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=missing_parameters`
      );
    }

    // Validate state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_state`
      );
    }

    const { userId, timestamp } = stateData;
    
    // Check if state is not too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=expired_state`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID!,
        client_secret: SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=slack_token_${tokenData.error}`
      );
    }

    // Store the integration in database
    await prisma.slackIntegration.upsert({
      where: {
        userId_teamId: {
          userId: userId,
          teamId: tokenData.team.id
        }
      },
      update: {
        teamName: tokenData.team.name,
        accessToken: tokenData.access_token,
        botUserId: tokenData.bot_user_id,
        botAccessToken: tokenData.bot?.bot_access_token,
        scope: tokenData.scope,
        authedUser: tokenData.authed_user,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        userId: userId,
        teamId: tokenData.team.id,
        teamName: tokenData.team.name,
        accessToken: tokenData.access_token,
        botUserId: tokenData.bot_user_id,
        botAccessToken: tokenData.bot?.bot_access_token,
        scope: tokenData.scope,
        authedUser: tokenData.authed_user,
        isActive: true
      }
    });

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=slack_connected&team=${encodeURIComponent(tokenData.team.name)}`
    );

  } catch (error) {
    console.error('Error handling Slack OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=internal_error`
    );
  }
}
