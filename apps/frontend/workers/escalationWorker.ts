import { Worker, Job } from "bullmq";
import { prisma } from "db/client";
import { redis, EscalationJobData } from "../lib/queue";
import {
  sendEscalationEmail,
  sendEscalationSlack,
  sendEscalationWebhook,
} from "../lib/escalation";

export class EscalationWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker("escalation", this.processJob.bind(this), {
      connection: redis,
      concurrency: 5,
    });

  }

  
  private async processJob(job: Job<EscalationJobData>): Promise<void> {
    const {
      monitor,
      incident,
      escalationLevelId,
      method,
      contacts,
    } = job.data;

    console.log(`Processing escalation job: ${job.name}`);

    try {
      
      const incidentData = await prisma.incident.findUnique({
        where: { id: incident.id },
        select: { status: true, title: true },
      });

      if (!incidentData) {
        console.log(`Incident ${incident.id} not found, skipping escalation`);
        return;
      }

      if (
        incidentData.status === "ACKNOWLEDGED" ||
        incidentData.status === "RESOLVED"
      ) {
        console.log(
          `Incident ${incident.id} is ${incidentData.status.toLowerCase()}, skipping escalation`
        );
        return;
      }

      
      const escalationLevel = await prisma.escalationLevel.findUnique({
        where: { id: escalationLevelId },
        include: {
          escalation: {
            select: { name: true },
          },
        },
      });

      if (!escalationLevel) {
        console.error(`L Escalation level ${escalationLevelId} not found`);
        throw new Error(`Escalation level not found: ${escalationLevelId}`);
      }

    
      
      const alertMessage = `ALERT!

Monitor: ${monitor.name}
Status: ${monitor.status}
Incident: ${incident.title}

The incident has been ongoing and requires immediate attention.

`;


      
      const alert = await prisma.alert.create({
        data: {
          title: `${monitor.name} - Monitor Alert`,
          type: "URL_UNAVAILABLE",
          message: alertMessage,
          monitorId: monitor.id,
          incidentId: incident.id,
          triggeredAt: new Date(),
        },
      });

      
      const escalationLog = await prisma.escalationLog.create({
        data: {
          alertId: alert.id,
          escalationLevelId,
          wasAcknowledged: false, 
        },
      });
      
      console.log('Worker created escalationLog ID:', escalationLog.id);

      
      let success = false;
      let error: string | null = null;

      try {
        switch (method) {
          case "EMAIL":
            await sendEscalationEmail(
              contacts,
              `${monitor.name} - Alert`,
             alert.message,
              monitor.id,
              incident.id,
              escalationLog.id
            );
            console.log(` Sent EMAIL escalation to: ${contacts.join(", ")}`);
            success = true;
            break;

          case "SLACK":
            await sendEscalationSlack(
              contacts,
              `${monitor.name} - Alert`,
              alert.message,
              monitor.id,
              escalationLevel.slackChannels as string | null,
              incident.id,
              escalationLog.id
            );
            const workspaceInfo: { teamId: string; teamName: string; defaultChannelId: string; defaultChannelName: string; }[] = escalationLevel.slackChannels 
              ? JSON.parse(escalationLevel.slackChannels as string)
              : [];
            const slackTargets = workspaceInfo.length > 0 
              ? workspaceInfo.map((ws) => `${ws.teamName}#${ws.defaultChannelName}`).join(", ")
              : "selected workspaces";
            console.log(`Sent SLACK escalation to: ${slackTargets}`);
            success = true;
            break;

          case "WEBHOOK":
            await sendEscalationWebhook(
              contacts,
              `${monitor.name} - Alert`,
              alert.message,
              monitor.id
            );
            console.log(`Sent WEBHOOK escalation to: ${contacts.join(", ")}`);
            success = true;
            break;

          default:
            throw new Error(`Unsupported escalation method: ${method}`);
        }
      } catch (escalationError) {
        console.error(
          `L Failed to send ${method} escalation:`,
          escalationError
        );
        error =
          escalationError instanceof Error
            ? escalationError.message
            : String(escalationError);
      }


      if (!success && error) {
        throw new Error(error);
      }

      console.log(`Successfully processed escalation job: ${job.name}`);
    } catch (error) {
      console.error(`L Error processing escalation job ${job.name}:`, error);
      throw error; 
    }
  }

  
  async start(): Promise<void> {
    console.log("Starting escalation worker...");
    
  }

  
  async stop(): Promise<void> {
    console.log(" Stopping escalation worker...");
    await this.worker.close();
    console.log("Escalation worker stopped");
  }

  
  getStatus(): { isRunning: boolean } {
    return {
      isRunning: !this.worker.closing,
    };
  }
}


let workerInstance: EscalationWorker | null = null;

export const getEscalationWorker = (): EscalationWorker => {
  if (!workerInstance) {
    workerInstance = new EscalationWorker();
  }
  return workerInstance;
};

const worker = getEscalationWorker();
worker.start().catch(console.error);
