# Slack Integration Setup Guide

This guide explains how to set up user-specific Slack integration for W3Uptime, allowing users to connect their Slack workspaces and receive alerts in their chosen channels.

## Overview

The Slack integration allows users to:
- Connect their Slack workspace via OAuth
- Select channels from their connected workspace
- Receive monitor alerts in their chosen Slack channels
- Manage multiple Slack workspace integrations

## Architecture

```
User → OAuth Flow → Slack API → Database → Alert System → User's Slack Channels
```

### Key Components

1. **SlackIntegration Model** - Stores user-specific Slack OAuth tokens
2. **OAuth Endpoints** - Handle Slack authentication flow
3. **Channel API** - Fetch available channels for users
4. **Enhanced SlackService** - Send messages using user tokens
5. **Frontend UI** - Manage integrations and select channels

## Setup Instructions

### 1. Slack App Configuration

Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps):

1. **Create New App** → "From scratch"
2. **App Name**: "W3Uptime Monitor"
3. **Workspace**: Choose your development workspace

#### OAuth & Permissions

Configure the following scopes:

**Bot Token Scopes:**
- `channels:read` - View basic information about public channels
- `chat:write` - Send messages as the app
- `users:read` - View people in the workspace

**User Token Scopes:**
- `channels:read` - View basic information about public channels

#### Redirect URLs

Add your OAuth redirect URL:
- Development: `http://localhost:8000/api/integrations/slack/callback`
- Production: `https://yourdomain.com/api/integrations/slack/callback`

### 2. Environment Variables

Add these variables to your `.env` file:

```bash
# Slack OAuth Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:8000/api/integrations/slack/callback

# Optional: Global bot token for fallback (existing setup)
SLACK_BOT_TOKEN=xoxb-your-global-bot-token
SLACK_DEFAULT_CHANNEL=#alerts
```

### 3. Database Migration

Run the database migration to add the SlackIntegration model:

```bash
cd packages/db
npx prisma generate
npx prisma db push
```

### 4. Frontend Integration

The integration includes:

- **Settings Page**: `/settings/integrations` - Connect/manage Slack workspaces
- **Enhanced Escalation UI**: Channel selector in escalation policy creation
- **User-specific Channels**: Only show channels the user has access to

## Usage Flow

### For Users

1. **Connect Slack Workspace**:
   - Navigate to Settings → Integrations
   - Click "Connect Slack"
   - Authorize W3Uptime in their Slack workspace

2. **Configure Escalation Policies**:
   - Create/edit escalation policy
   - Select "Slack" as escalation method
   - Choose from available channels or enter Channel ID manually

3. **Receive Alerts**:
   - Monitor incidents trigger escalation
   - Alerts sent to user's chosen Slack channels
   - Rich message format with incident details

### For Administrators

1. **Monitor Integration Health**:
   - Check logs for OAuth flow issues
   - Monitor Slack API rate limits
   - Track integration usage

2. **Troubleshooting**:
   - Verify Slack app permissions
   - Check redirect URL configuration
   - Validate environment variables

## API Endpoints

### OAuth Flow

- `GET /api/integrations/slack/auth` - Initiate OAuth flow
- `GET /api/integrations/slack/callback` - Handle OAuth callback

### Management

- `GET /api/integrations/slack/channels` - Fetch user's integrations and channels
- `POST /api/integrations/slack/disconnect` - Disconnect integration

## Database Schema

```sql
-- SlackIntegration table
CREATE TABLE SlackIntegration (
  id                String   @id @default(uuid())
  userId            String
  teamId            String
  teamName          String
  accessToken       String
  botUserId         String?
  botAccessToken    String?
  scope             String
  authedUser        Json?
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([userId, teamId])
);
```

## Security Considerations

1. **Token Storage**: OAuth tokens are encrypted and stored securely
2. **Scope Limitation**: Minimal required permissions requested
3. **User Isolation**: Each user's tokens are isolated
4. **Token Refresh**: Implement token refresh flow for long-lived integrations

## Troubleshooting

### Common Issues

1. **"No Slack integrations found"**:
   - User needs to connect their Slack workspace first
   - Check OAuth flow completion

2. **"Channel not found" errors**:
   - Bot needs to be invited to the channel
   - Channel ID might be incorrect

3. **OAuth callback errors**:
   - Verify redirect URL matches Slack app configuration
   - Check environment variables are set correctly

4. **Permission errors**:
   - Verify bot has required scopes
   - Check if bot is added to workspace

### Debug Steps

1. **Check Logs**: Monitor application logs for OAuth and API errors
2. **Test OAuth Flow**: Manually test the authentication flow
3. **Verify Tokens**: Ensure tokens are stored and retrieved correctly
4. **Test Channel Access**: Verify bot can access configured channels

## Testing

### Manual Testing

1. **OAuth Flow**:
   ```bash
   # Navigate to settings page
   open http://localhost:8000/settings/integrations
   
   # Click "Connect Slack" and complete OAuth
   # Verify integration appears in list
   ```

2. **Channel Selection**:
   ```bash
   # Create escalation policy
   # Select Slack method
   # Verify channels appear in dropdown
   ```

3. **Alert Delivery**:
   ```bash
   # Trigger monitor incident
   # Verify Slack message received
   # Check message formatting
   ```

### Automated Testing

```bash
# Test Slack OAuth endpoints
npm test -- --grep "Slack Integration"

# Test escalation with Slack
npm test -- --grep "Slack Escalation"
```

## Migration from Global Bot Token

If migrating from the existing global bot token setup:

1. **Gradual Migration**: Both systems can coexist
2. **User Choice**: Users can choose to use personal integration
3. **Fallback**: Global token used if no user integration available
4. **Data Migration**: Existing escalation policies continue to work

## Monitoring and Analytics

Track integration usage:

- Number of connected workspaces per user
- Alert delivery success rates
- Channel usage patterns
- OAuth completion rates

## Support

For issues with Slack integration:

1. Check this documentation
2. Review application logs
3. Test OAuth flow manually
4. Verify Slack app configuration
5. Contact development team with specific error messages

---

**Note**: This integration requires users to have appropriate permissions in their Slack workspace to authorize the app and access channels.
