import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`;

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

    if (!SLACK_CLIENT_ID) {
      console.error('SLACK_CLIENT_ID environment variable not set');
      return NextResponse.json(
        { 
          error: 'Slack integration not configured',
          details: 'SLACK_CLIENT_ID environment variable is required. Please check your .env file.'
        },
        { status: 500 }
      );
    }

    // Generate state parameter for security (include user ID)
    const state = Buffer.from(JSON.stringify({
      userId: authResult.user.id,
      timestamp: Date.now()
    })).toString('base64');

    // Slack OAuth URL with required scopes
    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.append('client_id', SLACK_CLIENT_ID);
    slackAuthUrl.searchParams.append('scope', 'channels:read,chat:write,users:read');
    slackAuthUrl.searchParams.append('user_scope', 'channels:read');
    slackAuthUrl.searchParams.append('redirect_uri', SLACK_REDIRECT_URI);
    slackAuthUrl.searchParams.append('state', state);

    return NextResponse.json({
      success: true,
      authUrl: slackAuthUrl.toString()
    });

  } catch (error) {
    console.error('Error initiating Slack OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Slack authentication' },
      { status: 500 }
    );
  }
}
