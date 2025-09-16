import { prisma } from "db/client";
import { Prisma } from "@prisma/client";
import emailService, { createIncidentEmailTemplate, createRecoveryEmailTemplate } from "./email";

// Define the Monitor type with the specific includes we use in this service
type MonitorWithEscalationPolicy = Prisma.MonitorGetPayload<{
  include: {
    escalationPolicy: {
      include: {
        levels: true;
      };
    };
    user: true;
  };
}>;

export interface EscalationContext {
  monitorId: string;
  incidentTitle: string;
  timestamp: Date;
}

export interface EscalationLevelData {
  id: string;
  levelOrder: number;
  waitMinutes: number;
  contacts: string[];
  channel: 'EMAIL' | 'SLACK' | 'WEBHOOK';
  name?: string | null;
  message?: string | null;
}

class EscalationService {
  private activeEscalations = new Map<string, NodeJS.Timeout>();

  /**
   * Start the escalation process for a monitor incident
   */
  async startEscalation(context: EscalationContext): Promise<void> {
    try {
      // Get monitor with escalation policy
      const monitor = await prisma.monitor.findUnique({
        where: { id: context.monitorId },
        include: {
          escalationPolicy: {
            include: {
              levels: {
                orderBy: { levelOrder: 'asc' }
              }
            }
          },
          user: true
        }
      });

      if (!monitor) {
        console.error(`Monitor not found: ${context.monitorId}`);
        return;
      }

      if (!monitor.escalationPolicy || !monitor.escalationPolicy.enabled) {
        console.log(`No escalation policy or disabled for monitor: ${monitor.name}`);
        return;
      }

      // Create alert for this incident
      const alert = await prisma.alert.create({
        data: {
          title: context.incidentTitle,
          message: `Monitor ${monitor.name} is experiencing issues`,
          monitorId: context.monitorId,
          type: 'URL_UNAVAILABLE',
          triggeredAt: context.timestamp
        }
      });

      console.log(`Starting escalation for monitor: ${monitor.name}, Alert ID: ${alert.id}`);

      // Start with level 1 immediately
      await this.executeEscalationLevel(
        alert.id,
        monitor.escalationPolicy.levels[0],
        monitor,
        context
      );

      // Schedule subsequent levels
      this.scheduleNextEscalationLevels(
        alert.id,
        monitor.escalationPolicy.levels.slice(1),
        monitor,
        context
      );

    } catch (error) {
      console.error('Error starting escalation:', error);
    }
  }

  /**
   * Stop escalation process (called when incident is resolved)
   */
  async stopEscalation(monitorId: string): Promise<void> {
    const escalationKey = `escalation_${monitorId}`;
    
    if (this.activeEscalations.has(escalationKey)) {
      clearTimeout(this.activeEscalations.get(escalationKey)!);
      this.activeEscalations.delete(escalationKey);
      console.log(`Stopped escalation for monitor: ${monitorId}`);
    }

    // Send recovery notifications to all contacts who received alerts
    await this.sendRecoveryNotifications(monitorId);
  }

  /**
   * Execute a specific escalation level
   */
  private async executeEscalationLevel(
    alertId: string,
    level: EscalationLevelData,
    monitor: MonitorWithEscalationPolicy,
    context: EscalationContext
  ): Promise<void> {
    try {
      console.log(`Executing escalation level ${level.levelOrder} for monitor: ${monitor.name}`);

      // Create escalation log
      const escalationLog = await prisma.escalationLog.create({
        data: {
          alertId,
          escalationLevelId: level.id,
          wasAcknowledged: false
        }
      });

      // Send notifications based on channel
      switch (level.channel) {
        case 'EMAIL':
          await this.sendEmailNotifications(level, monitor, context, escalationLog.id);
          break;
        case 'SLACK':
          await this.sendSlackNotifications(level, monitor, context, escalationLog.id);
          break;
        case 'WEBHOOK':
          await this.sendWebhookNotifications(level, monitor, context, escalationLog.id);
          break;
        default:
          console.warn(`Unsupported escalation channel: ${level.channel}`);
      }

    } catch (error) {
      console.error(`Error executing escalation level ${level.levelOrder}:`, error);
    }
  }

  /**
   * Schedule subsequent escalation levels
   */
  private scheduleNextEscalationLevels(
    alertId: string,
    remainingLevels: EscalationLevelData[],
    monitor: MonitorWithEscalationPolicy,
    context: EscalationContext
  ): void {
    if (remainingLevels.length === 0) {
      return;
    }

    const nextLevel = remainingLevels[0];
    const escalationKey = `escalation_${context.monitorId}_${nextLevel.levelOrder}`;

    const timeout = setTimeout(async () => {
      // Check if incident is still ongoing before escalating
      const incident = await prisma.incident.findFirst({
        where: {
          monitorId: context.monitorId,
          status: { in: ['ONGOING', 'ACKNOWLEDGED'] }
        }
      });

      if (incident) {
        await this.executeEscalationLevel(alertId, nextLevel, monitor, context);
        
        // Schedule remaining levels
        this.scheduleNextEscalationLevels(
          alertId,
          remainingLevels.slice(1),
          monitor,
          context
        );
      }
      
      this.activeEscalations.delete(escalationKey);
    }, nextLevel.waitMinutes * 60 * 1000); // Convert minutes to milliseconds

    this.activeEscalations.set(escalationKey, timeout);
    console.log(`Scheduled escalation level ${nextLevel.levelOrder} in ${nextLevel.waitMinutes} minutes`);
  }

  /**
   * Send email notifications
   */
  private async sendEmailNotifications(
    level: EscalationLevelData,
    monitor: MonitorWithEscalationPolicy,
    context: EscalationContext,
    escalationLogId: string
  ): Promise<void> {
    try {
      const emailTemplate = createIncidentEmailTemplate(
        monitor.name,
        monitor.url,
        context.incidentTitle,
        context.timestamp,
        level.levelOrder,
        level.message as string
      );

      const emailsSent: string[] = [];

      for (const contact of level.contacts) {
        if (this.isValidEmail(contact)) {
          const success = await emailService.sendEmail({
            to: contact,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          });

          if (success) {
            emailsSent.push(contact);
            console.log(`Email sent to: ${contact} for escalation level ${level.levelOrder}`);
          } else {
            console.error(`Failed to send email to: ${contact}`);
          }
        } else {
          console.warn(`Invalid email address: ${contact}`);
        }
      }

      // Log successful notifications
      if (emailsSent.length > 0) {
        await this.logNotificationSent(escalationLogId, emailsSent, 'EMAIL');
      }

    } catch (error) {
      console.error('Error sending email notifications:', error);
    }
  }

  /**
   * Send Slack notifications (placeholder)
   */
  private async sendSlackNotifications(
    level: EscalationLevelData,
    monitor: MonitorWithEscalationPolicy,
    context: EscalationContext,
    escalationLogId: string
  ): Promise<void> {
    console.log(`Slack notification not implemented yet for level ${level.levelOrder}`);
    // TODO: Implement Slack webhook notifications
    // This would involve sending HTTP requests to Slack webhook URLs
  }

  /**
   * Send webhook notifications (placeholder)
   */
  private async sendWebhookNotifications(
    level: EscalationLevelData,
    monitor: MonitorWithEscalationPolicy,
    context: EscalationContext,
    escalationLogId: string
  ): Promise<void> {
    console.log(`Webhook notification not implemented yet for level ${level.levelOrder}`);
    // TODO: Implement generic webhook notifications
    // This would involve sending HTTP POST requests to the specified webhook URLs
  }

  /**
   * Send recovery notifications to all contacts who received alerts
   */
  private async sendRecoveryNotifications(monitorId: string): Promise<void> {
    try {
      const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        include: {
          escalationPolicy: {
            include: {
              levels: true
            }
          }
        }
      });

      if (!monitor) return;

      // Get all recent escalation logs for this monitor
      const recentAlerts = await prisma.alert.findMany({
        where: {
          monitorId,
          triggeredAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        include: {
          EscalationLog: {
            include: {
              escalationLevel: true
            }
          }
        }
      });

      // Collect all unique email contacts who received notifications
      const notifiedContacts = new Set<string>();
      
      recentAlerts.forEach(alert => {
        alert.EscalationLog.forEach(log => {
          if (log.escalationLevel.channel === 'EMAIL') {
            log.escalationLevel.contacts.forEach(contact => {
              if (this.isValidEmail(contact)) {
                notifiedContacts.add(contact);
              }
            });
          }
        });
      });

      if (notifiedContacts.size > 0) {
        const recoveryTemplate = createRecoveryEmailTemplate(
          monitor.name,
          monitor.url,
          new Date()
        );

        // Send recovery emails
        for (const contact of notifiedContacts) {
          await emailService.sendEmail({
            to: contact,
            subject: recoveryTemplate.subject,
            html: recoveryTemplate.html,
            text: recoveryTemplate.text
          });
        }

        console.log(`Recovery notifications sent to ${notifiedContacts.size} contacts for monitor: ${monitor.name}`);
      }

    } catch (error) {
      console.error('Error sending recovery notifications:', error);
    }
  }

  /**
   * Log successful notification
   */
  private async logNotificationSent(
    escalationLogId: string,
    contacts: string[],
    channel: 'EMAIL' | 'SLACK' | 'WEBHOOK'
  ): Promise<void> {
    try {
      // Create timeline event for the notification
      // First, get the incident ID from the escalation log
      const escalationLog = await prisma.escalationLog.findUnique({
        where: { id: escalationLogId },
        include: {
          Alert: {
            include: {
              monitor: {
                include: {
                  Incident: {
                    where: {
                      status: { in: ['ONGOING', 'ACKNOWLEDGED'] }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                  }
                }
              }
            }
          }
        }
      });

      if (escalationLog?.Alert?.monitor?.Incident?.[0]) {
        await prisma.timelineEvent.create({
          data: {
            description: `${channel} notification sent to: ${contacts.join(', ')}`,
            escalationLogId,
            incidentId: escalationLog.Alert.monitor.Incident[0].id,
            type: 'ESCALATION',
            createdAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * Validate email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get escalation status for a monitor
   */
  async getEscalationStatus(monitorId: string): Promise<{
    isActive: boolean;
    activeAlerts: number;
    lastEscalation?: Date;
  }> {
    try {
      const activeAlerts = await prisma.alert.count({
        where: {
          monitorId,
          triggeredAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      const lastEscalation = await prisma.escalationLog.findFirst({
        where: {
          Alert: {
            monitorId
          }
        },
        orderBy: {
          Alert: {
            triggeredAt: 'desc'
          }
        },
        include: {
          Alert: true
        }
      });

      return {
        isActive: this.activeEscalations.has(`escalation_${monitorId}`),
        activeAlerts,
        lastEscalation: lastEscalation?.Alert.triggeredAt
      };
    } catch (error) {
      console.error('Error getting escalation status:', error);
      return {
        isActive: false,
        activeAlerts: 0
      };
    }
  }
}

// Create singleton instance
const escalationService = new EscalationService();

export default escalationService;
