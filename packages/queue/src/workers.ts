import { Worker, Job } from 'bullmq';
import { getRedisConnection } from './connection';
import { AlertJobData, EscalationJobData, RecoveryJobData } from './types';
import emailService, { createIncidentEmailTemplate, createRecoveryEmailTemplate } from './services/emailService';
import slackService, { createIncidentSlackMessage, createRecoverySlackMessage } from './services/slackService';
import webhookService, { createIncidentWebhookPayload, createRecoveryWebhookPayload } from './services/webhookService';
import { queueManager } from './queues';

// Global prisma instance - will be set by the consuming application
let prismaInstance: any = null;

export function setPrismaInstance(prisma: any) {
  prismaInstance = prisma;
}

function getPrisma() {
  if (!prismaInstance) {
    throw new Error('Prisma instance not set. Call setPrismaInstance() before starting workers.');
  }
  return prismaInstance;
}

export class WorkerManager {
  private workers: Worker[] = [];

  start(): void {
    console.log('🚀 Starting queue workers...');

    // Immediate alert processor - routes to appropriate notification channels
    const immediateAlertWorker = new Worker<AlertJobData>(
      'alert-immediate',
      async (job: Job<AlertJobData>) => {
        const data = job.data;
        console.log(`📨 Processing immediate alert for ${data.monitorName} (Level ${data.levelOrder})`);

        // Route to appropriate notification channel
        switch (data.channel) {
          case 'EMAIL':
            await queueManager.getQueue('email-notifications')?.add('send-email', data);
            break;
          case 'SLACK':
            await queueManager.getQueue('slack-notifications')?.add('send-slack', data);
            break;
          case 'WEBHOOK':
            await queueManager.getQueue('webhook-notifications')?.add('send-webhook', data);
            break;
        }

        return { processed: true, channel: data.channel };
      },
      { connection: getRedisConnection() }
    );

    // Delayed escalation processor
    const delayedEscalationWorker = new Worker<EscalationJobData>(
      'alert-delayed',
      async (job: Job<EscalationJobData>) => {
        const data = job.data;
        console.log(`⏰ Processing delayed escalation for ${data.monitorName} (Level ${data.levelOrder})`);

        // Check if incident is still ongoing before escalating
        const prisma = getPrisma();
        const incident = await prisma.incident.findFirst({
          where: {
            monitorId: data.monitorId,
            status: { in: ['ONGOING', 'ACKNOWLEDGED'] }
          }
        });

        if (!incident) {
          console.log(`✅ Incident resolved, skipping escalation for ${data.monitorName}`);
          return { skipped: true, reason: 'incident_resolved' };
        }

        // Process current level
        await queueManager.addImmediateAlert(data);

        // Schedule remaining levels
        if (data.remainingLevels.length > 0) {
          const nextLevel = data.remainingLevels[0];
          const nextEscalationData: EscalationJobData = {
            ...data,
            escalationLevelId: nextLevel.id,
            levelOrder: nextLevel.levelOrder,
            channel: nextLevel.channel,
            contacts: nextLevel.contacts,
            message: nextLevel.message,
            waitMinutes: nextLevel.waitMinutes,
            remainingLevels: data.remainingLevels.slice(1),
          };

          await queueManager.addDelayedEscalation(nextEscalationData);
        }

        return { processed: true, nextLevels: data.remainingLevels.length };
      },
      { connection: getRedisConnection() }
    );

    // Email notification worker
    const emailWorker = new Worker<AlertJobData>(
      'email-notifications',
      async (job: Job<AlertJobData>) => {
        const data = job.data;
        console.log(`📧 Sending email notification for ${data.monitorName}`);

        const template = createIncidentEmailTemplate(
          data.monitorName,
          data.monitorUrl,
          data.incidentTitle,
          data.timestamp,
          data.levelOrder,
          data.message
        );

        const result = await emailService.sendEmail(data.contacts, template);
        
        // Log the notification
        if (result.success) {
          await this.logNotificationSent(data, result.sentTo, 'EMAIL');
        }

        return result;
      },
      { connection: getRedisConnection() }
    );

    // Slack notification worker
    const slackWorker = new Worker<AlertJobData>(
      'slack-notifications',
      async (job: Job<AlertJobData>) => {
        const data = job.data;
        console.log(`💬 Sending Slack notification for ${data.monitorName}`);

        const message = createIncidentSlackMessage(
          data.monitorName,
          data.monitorUrl,
          data.incidentTitle,
          data.timestamp,
          data.levelOrder,
          data.message
        );

        const result = await slackService.sendSlackMessage(data.contacts, message);
        
        // Log the notification
        if (result.success) {
          await this.logNotificationSent(data, result.sentTo, 'SLACK');
        }

        return result;
      },
      { connection: getRedisConnection() }
    );

    // Webhook notification worker
    const webhookWorker = new Worker<AlertJobData>(
      'webhook-notifications',
      async (job: Job<AlertJobData>) => {
        const data = job.data;
        console.log(`🔗 Sending webhook notification for ${data.monitorName}`);

        const payload = createIncidentWebhookPayload(
          data.monitorId,
          data.monitorName,
          data.monitorUrl,
          data.incidentId,
          data.incidentTitle,
          data.severity,
          data.timestamp,
          data.levelOrder,
          data.message
        );

        const result = await webhookService.sendWebhook(data.contacts, payload);
        
        // Log the notification
        if (result.success) {
          await this.logNotificationSent(data, result.sentTo, 'WEBHOOK');
        }

        return result;
      },
      { connection: getRedisConnection() }
    );

    // Recovery notification worker
    const recoveryWorker = new Worker<RecoveryJobData>(
      'recovery-notifications',
      async (job: Job<RecoveryJobData>) => {
        const data = job.data;
        console.log(`🎉 Sending recovery notifications for ${data.monitorName}`);

        const results = {
          email: { success: false, sentTo: [] as string[], errors: [] as string[] },
          slack: { success: false, sentTo: [] as string[], errors: [] as string[] },
          webhook: { success: false, sentTo: [] as string[], errors: [] as string[] }
        };

        // Send email recovery notifications
        if (data.notifiedContacts.length > 0) {
          const emailTemplate = createRecoveryEmailTemplate(
            data.monitorName,
            data.monitorUrl,
            data.recoveryTime
          );
          results.email = await emailService.sendEmail(data.notifiedContacts, emailTemplate);
        }

        // Send Slack recovery notifications (if any Slack channels were notified)
        // This would require tracking which channels were notified - for now, skip

        // Send webhook recovery notifications
        // This would require tracking which webhooks were notified - for now, skip

        return results;
      },
      { connection: getRedisConnection() }
    );

    this.workers = [
      immediateAlertWorker,
      delayedEscalationWorker,
      emailWorker,
      slackWorker,
      webhookWorker,
      recoveryWorker
    ];

    // Add error handling for all workers
    this.workers.forEach((worker, index) => {
      worker.on('completed', (job) => {
        console.log(`✅ Worker ${worker.name} completed job ${job.id}`);
      });

      worker.on('failed', (job, err) => {
        console.error(`❌ Worker ${worker.name} failed job ${job?.id}:`, err);
      });

      worker.on('error', (err) => {
        console.error(`❌ Worker ${worker.name} error:`, err);
      });
    });

    console.log(`✅ Started ${this.workers.length} queue workers`);
  }

  private async logNotificationSent(
    data: AlertJobData,
    contacts: string[],
    channel: 'EMAIL' | 'SLACK' | 'WEBHOOK'
  ): Promise<void> {
    try {
      const prisma = getPrisma();
      
      // Find the escalation log for this alert and level
      const escalationLog = await prisma.escalationLog.findFirst({
        where: {
          alertId: data.alertId,
          escalationLevelId: data.escalationLevelId,
        }
      });

      if (escalationLog) {
        // Update the escalation log with sent contacts
        await prisma.escalationLog.update({
          where: { id: escalationLog.id },
          data: {
            sentTo: contacts,
            triggeredAt: new Date(),
          }
        });

        // Create timeline event if we have an incident ID
        if (data.incidentId) {
          await prisma.timelineEvent.create({
            data: {
              description: `${channel} notification sent to: ${contacts.join(', ')}`,
              escalationLogId: escalationLog.id,
              incidentId: data.incidentId,
              type: 'ESCALATION',
              createdAt: new Date()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping queue workers...');
    
    await Promise.all(
      this.workers.map(async (worker) => {
        try {
          await worker.close();
          console.log(`✅ Stopped worker: ${worker.name}`);
        } catch (error) {
          console.error(`❌ Error stopping worker ${worker.name}:`, error);
        }
      })
    );

    this.workers = [];
    console.log('✅ All workers stopped');
  }
}

export const workerManager = new WorkerManager();
