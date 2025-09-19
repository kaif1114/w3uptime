import { WebClient } from '@slack/web-api';
import { getSlackConfig } from '../config';
import { NotificationResult } from '../types';

// Use CommonJS require for Prisma to avoid ESM/CJS issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require('db/client');

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
}

class SlackService {
  private client: WebClient | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const config = getSlackConfig();
      
      if (!config.token) {
        console.warn('Slack token missing. Slack notifications will be disabled.');
        return;
      }

      this.client = new WebClient(config.token);
      console.log('💬 Slack service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Slack service:', error);
    }
  }

  async sendSlackMessage(channels: string[], message: SlackMessage): Promise<NotificationResult> {
    if (!this.client) {
      return {
        success: false,
        sentTo: [],
        errors: ['Slack service not initialized']
      };
    }

    const sentTo: string[] = [];
    const errors: string[] = [];

    for (const channel of channels) {
      try {
        const result = await this.client.chat.postMessage({
          channel: this.normalizeChannel(channel),
          text: message.text,
          blocks: message.blocks,
        });

        if (result.ok) {
          sentTo.push(channel);
          console.log(`💬 Slack message sent to ${channel}: ${result.ts}`);
        } else {
          const errorMsg = this.getSlackErrorMessage(result.error, channel);
          errors.push(errorMsg);
          console.error(`❌ Failed to send Slack message to ${channel}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to send to ${channel}: ${errorMessage}`);
        console.error(`❌ Failed to send Slack message to ${channel}:`, error);
      }
    }

    return {
      success: sentTo.length > 0,
      sentTo,
      errors
    };
  }

  /**
   * Send Slack message using user-specific integration
   * This method fetches the user's Slack integration and uses their token
   */
  async sendSlackMessageToUser(
    userId: string, 
    channels: string[], 
    message: SlackMessage
  ): Promise<NotificationResult> {
    try {
      // Get user's active Slack integrations
      const integrations = await prisma.slackIntegration.findMany({
        where: {
          userId: userId,
          isActive: true
        },
        select: {
          id: true,
          teamId: true,
          teamName: true,
          accessToken: true,
          botAccessToken: true
        }
      });

      if (integrations.length === 0) {
        return {
          success: false,
          sentTo: [],
          errors: ['No active Slack integrations found for user']
        };
      }

      const sentTo: string[] = [];
      const errors: string[] = [];

      // Try each integration until we find one that works for the channels
      for (const integration of integrations) {
        const token = integration.botAccessToken || integration.accessToken;
        const slack = new WebClient(token);

        for (const channel of channels) {
          try {
            const result = await slack.chat.postMessage({
              channel: this.normalizeChannel(channel),
              text: message.text,
              blocks: message.blocks,
            });

            if (result.ok) {
              sentTo.push(`${channel} (${integration.teamName})`);
              console.log(`💬 Slack message sent to ${channel} in ${integration.teamName}: ${result.ts}`);
            } else {
              const errorMsg = this.getSlackErrorMessage(result.error, `${channel} (${integration.teamName})`);
              errors.push(errorMsg);
              console.error(`❌ Failed to send Slack message to ${channel} in ${integration.teamName}: ${result.error}`);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to send to ${channel} (${integration.teamName}): ${errorMessage}`);
            console.error(`❌ Failed to send Slack message to ${channel} in ${integration.teamName}:`, error);
          }
        }
      }

      return {
        success: sentTo.length > 0,
        sentTo,
        errors
      };

    } catch (error) {
      console.error('Error in sendSlackMessageToUser:', error);
      return {
        success: false,
        sentTo: [],
        errors: ['Failed to send Slack message: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }

  private normalizeChannel(channel: string): string {
    // Handle different channel formats:
    // - Channel IDs: C1234567890 (public), D1234567890 (DM), G1234567890 (private)
    // - Channel names: #channel-name or channel-name
    // - User mentions: @username
    
    if (channel.match(/^[CDG][A-Z0-9]{8,10}$/)) {
      // Already a valid channel ID, use as-is
      return channel;
    } else if (channel.startsWith('@')) {
      // User mention, use as-is
      return channel;
    } else if (channel.startsWith('#')) {
      // Channel name with #, use as-is
      return channel;
    } else {
      // Plain channel name, add # prefix
      return `#${channel}`;
    }
  }

  private getSlackErrorMessage(error: string | undefined, channel: string): string {
    switch (error) {
      case 'channel_not_found':
        return `Channel ${channel} not found. Make sure the Channel ID is correct.`;
      case 'not_in_channel':
        return `Bot not in channel ${channel}. Please invite the W3Uptime bot to this channel.`;
      case 'account_inactive':
        return `Slack account inactive. Please check your bot token.`;
      case 'invalid_auth':
        return `Invalid Slack bot token. Please check your configuration.`;
      case 'channel_is_archived':
        return `Channel ${channel} is archived. Please unarchive or use a different channel.`;
      case 'msg_too_long':
        return `Message too long for channel ${channel}.`;
      case 'rate_limited':
        return `Rate limited when sending to ${channel}. Will retry automatically.`;
      default:
        return `Failed to send to ${channel}: ${error || 'Unknown error'}`;
    }
  }
}

// Slack message template generators
export const createIncidentSlackMessage = (
  monitorName: string,
  monitorUrl: string,
  incidentTitle: string,
  timestamp: Date,
  levelOrder: number,
  customMessage?: string
): SlackMessage => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const text = `🚨 *Alert Level ${levelOrder}*: ${monitorName} is down`;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🚨 Service Alert - Level ${levelOrder}`,
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${incidentTitle}*`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Service:*\n${monitorName}`
        },
        {
          type: 'mrkdwn',
          text: `*URL:*\n<${monitorUrl}|${monitorUrl}>`
        },
        {
          type: 'mrkdwn',
          text: `*Escalation Level:*\n${levelOrder}`
        },
        {
          type: 'mrkdwn',
          text: `*Time:*\n${timestamp.toLocaleString()}`
        }
      ]
    }
  ];

  if (customMessage) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Message:*\n${customMessage}`
      }
    });
  }

  blocks.push(
    {
      type: 'divider'
    } as any,
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Monitor Dashboard',
            emoji: true
          },
          url: `${appUrl}/monitors`,
          style: 'primary'
        }
      ]
    } as any
  );

  return {
    channel: '', // Will be set by the caller
    text,
    blocks
  };
};

export const createRecoverySlackMessage = (
  monitorName: string,
  monitorUrl: string,
  recoveryTime: Date,
  downtimeDuration?: string
): SlackMessage => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const text = `✅ *Resolved*: ${monitorName} is back online`;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '✅ Service Recovered',
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${monitorName}* is back online!`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Service:*\n${monitorName}`
        },
        {
          type: 'mrkdwn',
          text: `*URL:*\n<${monitorUrl}|${monitorUrl}>`
        },
        {
          type: 'mrkdwn',
          text: `*Recovery Time:*\n${recoveryTime.toLocaleString()}`
        }
      ]
    }
  ];

  if (downtimeDuration) {
    (blocks[2] as any).fields.push({
      type: 'mrkdwn',
      text: `*Downtime Duration:*\n${downtimeDuration}`
    });
  }

  blocks.push(
    {
      type: 'divider'
    } as any,
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Monitor Dashboard',
            emoji: true
          },
          url: `${appUrl}/monitors`,
          style: 'primary'
        }
      ]
    } as any
  );

  return {
    channel: '', // Will be set by the caller
    text,
    blocks
  };
};

export default new SlackService();
