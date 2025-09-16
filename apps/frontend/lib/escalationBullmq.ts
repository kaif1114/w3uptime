import { prisma } from 'db/client';
import { alertSystem } from "../../../packages/queue/src";
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
  name?: string ;
  message?: string ;
}

/**
 * BullMQ-based Escalation Service
 * Replaces the setTimeout-based escalation with reliable Redis queues
 */
class BullMQEscalationService {
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

      // Create escalation logs for all levels
      const escalationLogs = await Promise.all(
        monitor.escalationPolicy.levels.map(level =>
          prisma.escalationLog.create({
            data: {
              alertId: alert.id,
              escalationLevelId: level.id,
              wasAcknowledged: false
            }
          })
        )
      );

      console.log(`Starting BullMQ escalation for monitor: ${monitor.name}, Alert ID: ${alert.id}`);

      // Determine severity based on monitor priority or escalation policy
      const severity = this.determineSeverity(monitor, monitor.escalationPolicy);

      // Find or create incident for timeline tracking
      let incident = await prisma.incident.findFirst({
        where: {
          monitorId: context.monitorId,
          status: { in: ['ONGOING', 'ACKNOWLEDGED'] }
        }
      });

      if (!incident) {
        incident = await prisma.incident.create({
          data: {
            title: context.incidentTitle,
            monitorId: context.monitorId,
            cause: 'URL_UNAVAILABLE',
            status: 'ONGOING',
            createdAt: context.timestamp
          }
        });

        // Create initial timeline event
        await prisma.timelineEvent.create({
          data: {
            description: `Incident "${context.incidentTitle}" was created`,
            incidentId: incident.id,
            type: 'INCIDENT',
            createdAt: context.timestamp
          }
        });
      }

      // Trigger BullMQ escalation
      await alertSystem.triggerIncidentAlert({
        alertId: alert.id,
        incidentId: incident.id,
        monitorId: context.monitorId,
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        incidentTitle: context.incidentTitle,
        severity,
        escalationLevels: monitor.escalationPolicy.levels.map(level => ({
          id: level.id,
          levelOrder: level.levelOrder,
          waitMinutes: level.waitMinutes,
          contacts: level.contacts,
          channel: level.channel as 'EMAIL' | 'SLACK' | 'WEBHOOK',
          name: level.name as string,
          message: level.message as string
        }))
      });

    } catch (error) {
      console.error('Error starting BullMQ escalation:', error);
    }
  }

  /**
   * Stop escalation process (called when incident is resolved)
   */
  async stopEscalation(monitorId: string): Promise<void> {
    try {
      // Stop BullMQ escalation
      await alertSystem.stopEscalation(monitorId);

      // Send recovery notifications to all contacts who received alerts
      await this.sendRecoveryNotifications(monitorId);

      console.log(`Stopped BullMQ escalation for monitor: ${monitorId}`);
    } catch (error) {
      console.error('Error stopping BullMQ escalation:', error);
    }
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

     }
     catch (error) {
      console.error('Error sending recovery notifications:', error);
    }
  }

  /**
   * Determine incident severity based on monitor configuration
   */
  private determineSeverity(monitor: { name: string }, escalationPolicy: { levels: unknown[] }): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // You can customize this logic based on your needs
    const levelCount = escalationPolicy.levels.length;
    
    if (levelCount >= 4) return 'CRITICAL';
    if (levelCount >= 3) return 'HIGH';
    if (levelCount >= 2) return 'MEDIUM';
    return 'LOW';
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

      // Check if there are any active incidents for this monitor
      const activeIncident = await prisma.incident.findFirst({
        where: {
          monitorId,
          status: { in: ['ONGOING', 'ACKNOWLEDGED'] }
        }
      });

      return {
        isActive: !!activeIncident,
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

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<Record<string, unknown>> {
    try {
      return await alertSystem.getSystemStats();
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {};
    }
  }

  /**
   * Clean up old jobs and logs
   */
  async cleanup(): Promise<void> {
    try {
      await alertSystem.cleanupSystem();
      console.log('BullMQ system cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Create singleton instance
const bullMQEscalationService = new BullMQEscalationService();

export default bullMQEscalationService;
