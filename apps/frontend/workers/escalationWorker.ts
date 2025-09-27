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

    this.setupEventListeners();
  }

  /**
   * Process an individual escalation job
   */
  private async processJob(job: Job<EscalationJobData>): Promise<void> {
    const {
      monitorId,
      incidentId,
      escalationLevelId,
      method,
      contacts,
      message,
      title,
    } = job.data;

    console.log(`Processing escalation job: ${job.name}`);

    try {
      // Check if incident is still ongoing (not acknowledged or resolved)
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        select: { status: true, title: true },
      });

      if (!incident) {
        console.log(`Incident ${incidentId} not found, skipping escalation`);
        return;
      }

      if (
        incident.status === "ACKNOWLEDGED" ||
        incident.status === "RESOLVED"
      ) {
        console.log(
          `Incident ${incidentId} is ${incident.status.toLowerCase()}, skipping escalation`
        );
        return;
      }

      // Get escalation level details
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

      // Create alert record for this escalation attempt
      const alert = await prisma.alert.create({
        data: {
          title: `Escalation Level ${escalationLevel.levelOrder}`,
          type: "URL_UNAVAILABLE",
          message:
            message ||
            `Escalation level ${escalationLevel.levelOrder} triggered for incident: ${title}`,
          monitorId,
          triggeredAt: new Date(),
        },
      });

      // Send the escalation based on the method
      let success = false;
      let error: string | null = null;

      try {
        switch (method) {
          case "EMAIL":
            await sendEscalationEmail(
              contacts,
              title,
              message || "",
              monitorId
            );
            console.log(`=� Sent EMAIL escalation to: ${contacts.join(", ")}`);
            success = true;
            break;

          case "SLACK":
            await sendEscalationSlack(
              contacts,
              title,
              message || "",
              monitorId
            );
            console.log(`=📱 Sent SLACK escalation to default channels`);
            success = true;
            break;

          case "WEBHOOK":
            await sendEscalationWebhook(
              contacts,
              title,
              message || "",
              monitorId
            );
            console.log(`= Sent WEBHOOK escalation to: ${contacts.join(", ")}`);
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

      // Log the escalation attempt
      await prisma.escalationLog.create({
        data: {
          alertId: alert.id,
          escalationLevelId,
          wasAcknowledged: false, // Will be updated if/when acknowledged
        },
      });

      // Create timeline event for this escalation
      await prisma.timelineEvent.create({
        data: {
          description: success
            ? `Escalation level ${escalationLevel.levelOrder} sent via ${method} to ${contacts.join(", ")}`
            : `Failed to send escalation level ${escalationLevel.levelOrder} via ${method}: ${error}`,
          incidentId,
          type: "ESCALATION",
          createdAt: new Date(),
        },
      });

      if (!success && error) {
        throw new Error(error);
      }

      console.log(` Successfully processed escalation job: ${job.name}`);
    } catch (error) {
      console.error(`L Error processing escalation job ${job.name}:`, error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  /**
   * Setup event listeners for the worker
   */
  private setupEventListeners(): void {
    this.worker.on("completed", (job) => {
      console.log(` Escalation job completed: ${job.name}`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`L Escalation job failed: ${job?.name}`, err);
    });

    this.worker.on("error", (err) => {
      console.error("L Worker error:", err);
    });

    this.worker.on("stalled", (jobId) => {
      console.warn(`� Escalation job stalled: ${jobId}`);
    });
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    console.log("Starting escalation worker...");
    // Worker starts automatically when created
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    console.log("=� Stopping escalation worker...");
    await this.worker.close();
    console.log(" Escalation worker stopped");
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean } {
    return {
      isRunning: !this.worker.closing,
    };
  }
}

// Create and export a singleton worker instance
let workerInstance: EscalationWorker | null = null;

export const getEscalationWorker = (): EscalationWorker => {
  if (!workerInstance) {
    workerInstance = new EscalationWorker();
  }
  return workerInstance;
};

const worker = getEscalationWorker();
worker.start().catch(console.error);
