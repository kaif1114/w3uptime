import { WebClient } from '@slack/web-api';
import { getSlackConfig } from '../config';
import { NotificationResult } from '../types';

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
          errors.push(`Failed to send to ${channel}: ${result.error}`);
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

  private normalizeChannel(channel: string): string {
    // Ensure channel starts with # for public channels or @ for DMs
    if (!channel.startsWith('#') && !channel.startsWith('@') && !channel.startsWith('C') && !channel.startsWith('D')) {
      return `#${channel}`;
    }
    return channel;
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
