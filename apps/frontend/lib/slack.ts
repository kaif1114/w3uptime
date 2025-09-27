import { prisma } from "db/client";

export interface SlackMessage {
  text: string;
  channel?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: SlackField[];
  footer?: string;
  ts?: number;
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: {
    type: string;
    text: string;
  }[];
}

export class SlackAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async sendMessage(message: SlackMessage): Promise<boolean> {
    try {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: message.channel || "#general",
          text: message.text,
          attachments: message.attachments,
          blocks: message.blocks,
        }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.error("Slack API error:", data.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error sending Slack message:", error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch("https://slack.com/api/auth.test", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error("Error testing Slack connection:", error);
      return false;
    }
  }
}

export async function sendSlackNotification(
  userId: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const integrations = await prisma.slackIntegration.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (integrations.length === 0) {
      console.log("No active Slack integrations found for user:", userId);
      return false;
    }

    const results = await Promise.allSettled(
      integrations.map(async (integration) => {
        const slack = new SlackAPI(integration.accessToken);
        return slack.sendMessage(message);
      })
    );

    const successCount = results.filter(
      (result) => result.status === "fulfilled" && result.value === true
    ).length;

    return successCount > 0;
  } catch (error) {
    console.error("Error sending Slack notifications:", error);
    return false;
  }
}

export function createIncidentMessage(incident: {
  title: string;
  monitorName: string;
  monitorUrl: string;
  status: string;
  createdAt: Date;
}): SlackMessage {
  const statusColor = incident.status === "RESOLVED" ? "good" : "danger";
  const statusEmoji = incident.status === "RESOLVED" ? "✅" : "🚨";

  return {
    text: `${statusEmoji} Incident Alert: ${incident.title}`,
    attachments: [
      {
        color: statusColor,
        title: incident.title,
        fields: [
          {
            title: "Monitor",
            value: incident.monitorName,
            short: true,
          },
          {
            title: "URL",
            value: incident.monitorUrl,
            short: true,
          },
          {
            title: "Status",
            value: incident.status,
            short: true,
          },
          {
            title: "Time",
            value: incident.createdAt.toLocaleString(),
            short: true,
          },
        ],
        footer: "W3Uptime",
        ts: Math.floor(incident.createdAt.getTime() / 1000),
      },
    ],
  };
}

export function createMonitorDownMessage(monitor: {
  name: string;
  url: string;
  lastCheckedAt: Date;
}): SlackMessage {
  return {
    text: `Monitor Down: ${monitor.name}`,
    attachments: [
      {
        color: "danger",
        title: `Monitor "${monitor.name}" is down`,
        fields: [
          {
            title: "URL",
            value: monitor.url,
            short: false,
          },
          {
            title: "Last Checked",
            value: monitor.lastCheckedAt.toLocaleString(),
            short: true,
          },
        ],
        footer: "W3Uptime",
        ts: Math.floor(monitor.lastCheckedAt.getTime() / 1000),
      },
    ],
  };
}

export function createTestMessage(): SlackMessage {
  return {
    text: "Test message from W3Uptime",
    attachments: [
      {
        color: "good",
        title: "Integration Test",
        text: "Your Slack integration is working correctly! You will receive notifications for incidents and monitor status changes.",
        footer: "W3Uptime",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

/**
 * SlackWebhookAPI - Sends messages using Slack Incoming Webhooks
 * Based on: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
 */
export class SlackWebhookAPI {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Send a message using the incoming webhook
   */
  async sendMessage(message: SlackMessage): Promise<boolean> {
    try {
      const payload = {
        text: message.text,
        attachments: message.attachments,
        blocks: message.blocks,
      };

      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Slack webhook responds with 200 and "ok" for success
      if (response.ok) {
        const responseText = await response.text();
        return responseText === "ok";
      }

      console.error("Slack webhook error:", response.status, response.statusText);
      return false;
    } catch (error) {
      console.error("Error sending Slack webhook message:", error);
      return false;
    }
  }

  /**
   * Test the webhook URL by sending a simple message
   */
  async testWebhook(): Promise<boolean> {
    const testMessage: SlackMessage = {
      text: "Webhook test from W3Uptime",
      attachments: [
        {
          color: "good",
          title: "Webhook Test",
          text: "Your Slack webhook is working correctly!",
          footer: "W3Uptime",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    return this.sendMessage(testMessage);
  }
}

/**
 * Send notification using webhook URLs from Slack integrations
 */
export async function sendSlackWebhookNotification(
  userId: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const integrations = await prisma.slackIntegration.findMany({
      where: {
        userId,
        isActive: true,
        webhookUrl: {
          not: null,
        },
      },
    });

    if (integrations.length === 0) {
      console.log("No active Slack webhook integrations found for user:", userId);
      return false;
    }

    const results = await Promise.allSettled(
      integrations.map(async (integration) => {
        if (!integration.webhookUrl) return false;
        
        const webhook = new SlackWebhookAPI(integration.webhookUrl);
        return webhook.sendMessage(message);
      })
    );

    const successCount = results.filter(
      (result) => result.status === "fulfilled" && result.value === true
    ).length;

    return successCount > 0;
  } catch (error) {
    console.error("Error sending Slack webhook notifications:", error);
    return false;
  }
}

/**
 * Create escalation message specifically formatted for webhooks
 */
export function createEscalationMessage(escalation: {
  title: string;
  monitorName: string;
  monitorUrl: string;
  message?: string;
  createdAt: Date;
}): SlackMessage {
  return {
    text: `Escalation Alert: ${escalation.title}`,
    attachments: [
      {
        color: "danger",
        title: "Escalation Alert",
        text: escalation.message || `Monitor "${escalation.monitorName}" requires attention`,
        fields: [
          {
            title: "Monitor",
            value: escalation.monitorName,
            short: true,
          },
          {
            title: "URL",
            value: escalation.monitorUrl,
            short: true,
          },
          {
            title: "Time",
            value: escalation.createdAt.toLocaleString(),
            short: true,
          },
        ],
        footer: "W3Uptime - Escalation Alert",
        ts: Math.floor(escalation.createdAt.getTime() / 1000),
      },
    ],
  };
}