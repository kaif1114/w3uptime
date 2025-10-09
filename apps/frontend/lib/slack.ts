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
  elements?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    style?: string;
    url?: string;
  }>;
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
  const statusEmoji = incident.status === "RESOLVED" ? "" : "";

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


export class SlackWebhookAPI {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  
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


export function createEscalationMessage(escalation: {
  title: string;
  monitorName: string;
  monitorUrl: string;
  message?: string;
  createdAt: Date;
  incidentId?: string;
  escalationLogId?: string;
}): SlackMessage {
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: " Escalation Alert"
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${escalation.title}*\n${escalation.message || `Monitor "${escalation.monitorName}" requires attention`}`
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Monitor:*\n${escalation.monitorName}`
        },
        {
          type: "mrkdwn", 
          text: `*URL:*\n${escalation.monitorUrl}`
        },
        {
          type: "mrkdwn",
          text: `*Time:*\n${escalation.createdAt.toLocaleString()}`
        }
      ]
    }
  ];

  
  console.log('Slack createEscalationMessage - escalationLogId:', escalation.escalationLogId);
  if (escalation.escalationLogId) {
    console.log('Adding acknowledge button to Slack');
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "✓ Acknowledge Alert"
          },
          style: "primary",
          url: `${process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}/acknowledge/${escalation.escalationLogId}?via=slack`
        },
        {
          type: "button", 
          text: {
            type: "plain_text",
            text: "View Dashboard"
          },
          url: `${process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}`
        }
      ]
    });
  }

  return {
    text: `Escalation Alert: ${escalation.title}`,
    blocks,
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


export function createResolutionMessage(resolution: {
  title: string;
  monitorName: string;
  monitorUrl: string;
  resolvedAt: Date;
  downtime?: number;
  incidentId?: string;
}): SlackMessage {
  const downtimeText = resolution.downtime ? `${Math.round(resolution.downtime / 1000 / 60)} minutes` : 'Unknown duration';

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: " Incident Resolved"
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${resolution.title}* - Resolved\n\nThe incident has been resolved and the monitor is functioning normally again.`
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Monitor:*\n${resolution.monitorName}`
        },
        {
          type: "mrkdwn", 
          text: `*URL:*\n${resolution.monitorUrl}`
        },
        {
          type: "mrkdwn",
          text: `*Resolved At:*\n${resolution.resolvedAt.toLocaleString()}`
        },
        {
          type: "mrkdwn",
          text: `*Total Downtime:*\n${downtimeText}`
        }
      ]
    },
    {
      type: "actions",
      elements: [
        {
          type: "button", 
          text: {
            type: "plain_text",
            text: "View All Monitors"
          },
          url: `${process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}/monitors`
        }
      ]
    }
  ];

  return {
    text: `Incident Resolved: ${resolution.title}`,
    blocks,
    attachments: [
      {
        color: "good",
        title: "Incident Resolved",
        text: `${resolution.title} - The monitor is functioning normally again`,
        fields: [
          {
            title: "Monitor",
            value: resolution.monitorName,
            short: true,
          },
          {
            title: "URL",
            value: resolution.monitorUrl,
            short: true,
          },
          {
            title: "Resolved At",
            value: resolution.resolvedAt.toLocaleString(),
            short: true,
          },
          {
            title: "Total Downtime",
            value: downtimeText,
            short: true,
          },
        ],
        footer: "W3Uptime - Incident Resolved",
        ts: Math.floor(resolution.resolvedAt.getTime() / 1000),
      },
    ],
  };
}