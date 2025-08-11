import { prisma } from "db/client";

interface NotificationPayload {
  title: string;
  message: string;
  monitorName: string;
  monitorUrl: string;
  severity: string;
  triggerStatusCode?: number;
  expectedStatusCode?: number;
}

interface WebhookHeaders {
  [key: string]: string;
}

export class NotificationService {
  
  /**
   * Send notification via email
   */
  static async sendEmail(contacts: string[], payload: NotificationPayload): Promise<boolean> {
    try {
      // TODO: Implement actual email sending logic
      // This would typically use a service like SendGrid, SES, or Nodemailer
      console.log(`📧 Sending email notification to: ${contacts.join(', ')}`);
      console.log(`Subject: ${payload.title}`);
      console.log(`Message: ${payload.message}`);
      console.log(`Monitor: ${payload.monitorName} (${payload.monitorUrl})`);
      console.log(`Severity: ${payload.severity}`);
      
      if (payload.triggerStatusCode) {
        console.log(`Status: ${payload.triggerStatusCode} (Expected: ${payload.expectedStatusCode})`);
      }

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  /**
   * Send notification via Slack webhook
   */
  static async sendSlack(webhookUrls: string[], payload: NotificationPayload): Promise<boolean> {
    try {
      const slackMessage = {
        text: payload.title,
        attachments: [
          {
            color: this.getSeverityColor(payload.severity),
            fields: [
              {
                title: "Monitor",
                value: `${payload.monitorName}\n${payload.monitorUrl}`,
                short: true
              },
              {
                title: "Severity",
                value: payload.severity,
                short: true
              },
              {
                title: "Message",
                value: payload.message,
                short: false
              }
            ],
            footer: "W3Uptime Monitoring",
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      if (payload.triggerStatusCode) {
        slackMessage.attachments[0].fields.push({
          title: "Status Code",
          value: `${payload.triggerStatusCode} (Expected: ${payload.expectedStatusCode})`,
          short: true
        });
      }

      for (const webhookUrl of webhookUrls) {
        console.log(`💬 Sending Slack notification to: ${webhookUrl}`);
        
        // TODO: Implement actual Slack webhook call
        // const response = await fetch(webhookUrl, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify(slackMessage),
        // });
        
        console.log('Slack message payload:', JSON.stringify(slackMessage, null, 2));
      }

      return true;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }

  /**
   * Send notification via webhook
   */
  static async sendWebhook(
    webhookUrls: string[], 
    payload: NotificationPayload, 
    method: string = 'POST',
    headers?: WebhookHeaders
  ): Promise<boolean> {
    try {
      const webhookPayload = {
        alert: {
          title: payload.title,
          message: payload.message,
          severity: payload.severity,
          timestamp: new Date().toISOString(),
          triggerStatusCode: payload.triggerStatusCode,
          expectedStatusCode: payload.expectedStatusCode,
        },
        monitor: {
          name: payload.monitorName,
          url: payload.monitorUrl,
        },
        source: "w3uptime"
      };

      for (const webhookUrl of webhookUrls) {
        console.log(`🔗 Sending ${method} webhook to: ${webhookUrl}`);
        
        // TODO: Implement actual webhook call
        // const response = await fetch(webhookUrl, {
        //   method: method,
        //   headers: {
        //     'Content-Type': 'application/json',
        //     ...headers,
        //   },
        //   body: JSON.stringify(webhookPayload),
        // });
        
        console.log('Webhook payload:', JSON.stringify(webhookPayload, null, 2));
        console.log('Headers:', headers);
      }

      return true;
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      return false;
    }
  }

  /**
   * Process escalation for an alert
   */
  static async processEscalation(alertId: string): Promise<void> {
    try {
      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
        include: {
          monitor: {
            include: {
              escalation: {
                include: {
                  levels: {
                    orderBy: {
                      levelOrder: 'asc',
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!alert || !alert.monitor.escalation) {
        console.log('No escalation policy found for alert:', alertId);
        return;
      }

      const escalation = alert.monitor.escalation;
      if (!escalation.enabled) {
        console.log('Escalation policy is disabled for alert:', alertId);
        return;
      }

      const currentLevel = escalation.levels.find(
        level => level.levelOrder === alert.currentEscalationLevel
      );

      if (!currentLevel) {
        console.log('No current escalation level found for alert:', alertId);
        return;
      }

      // Check if enough time has passed to escalate
      const waitTime = currentLevel.waitMinutes * 60 * 1000; // Convert to milliseconds
      const timeSinceTriggered = Date.now() - alert.triggeredAt.getTime();

      if (timeSinceTriggered < waitTime && alert.currentEscalationLevel > 1) {
        console.log('Not enough time has passed for escalation:', alertId);
        return;
      }

      const payload: NotificationPayload = {
        title: alert.title,
        message: currentLevel.message || alert.message,
        monitorName: alert.monitor.name,
        monitorUrl: alert.monitor.url,
        severity: alert.severity,
        triggerStatusCode: alert.triggerStatusCode || undefined,
        expectedStatusCode: alert.expectedStatusCode || undefined,
      };

      // Send notification based on channel
      let success = false;
      switch (currentLevel.channel) {
        case 'EMAIL':
          success = await this.sendEmail(currentLevel.contacts, payload);
          break;
        case 'SLACK':
          success = await this.sendSlack(currentLevel.contacts, payload);
          break;
        case 'WEBHOOK':
          success = await this.sendWebhook(
            currentLevel.contacts, 
            payload, 
            currentLevel.webhookMethod || 'POST',
            currentLevel.webhookHeaders as WebhookHeaders || undefined
          );
          break;
      }

      if (success) {
        // Move to next escalation level if available
        const nextLevel = escalation.levels.find(
          level => level.levelOrder === alert.currentEscalationLevel + 1
        );

        if (nextLevel) {
          await prisma.alert.update({
            where: { id: alertId },
            data: {
              currentEscalationLevel: alert.currentEscalationLevel + 1,
              status: 'SENT',
            },
          });
        } else {
          // Mark escalation as completed
          await prisma.alert.update({
            where: { id: alertId },
            data: {
              escalationCompleted: true,
              status: 'SENT',
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to process escalation for alert:', alertId, error);
    }
  }

  /**
   * Get Slack color based on severity
   */
  private static getSeverityColor(severity: string): string {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return '#FF0000'; // Red
      case 'HIGH':
        return '#FF8C00'; // Dark Orange
      case 'MEDIUM':
        return '#FFD700'; // Gold
      case 'LOW':
        return '#32CD32'; // Lime Green
      default:
        return '#808080'; // Gray
    }
  }

  /**
   * Schedule escalation check (this would be called by a background job)
   */
  static async scheduleEscalationChecks(): Promise<void> {
    try {
      // Find all active alerts that haven't completed escalation
      const activeAlerts = await prisma.alert.findMany({
        where: {
          status: {
            in: ['PENDING', 'SENT'],
          },
          escalationCompleted: false,
        },
        include: {
          monitor: {
            include: {
              escalation: {
                include: {
                  levels: true,
                },
              },
            },
          },
        },
      });

      console.log(`Processing ${activeAlerts.length} active alerts for escalation`);

      for (const alert of activeAlerts) {
        await this.processEscalation(alert.id);
      }
    } catch (error) {
      console.error('Failed to schedule escalation checks:', error);
    }
  }
} 