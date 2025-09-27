import { Job } from "bullmq";
import { prisma } from "db/client";
import { escalationQueue, EscalationJobData, getJobName, getJobPattern } from "./queue";

export class EscalationManager {
  
  /**
   * Start escalation for a monitor incident
   * Creates delayed jobs for each escalation level based on the monitor's escalation policy
   */
  static async startEscalation(monitorId: string, incidentId: string): Promise<void> {
    try {
      console.log(`Starting escalation for monitor ${monitorId}, incident ${incidentId}`);

      // Fetch monitor with its escalation policy and levels
      const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        include: {
          escalationPolicy: {
            include: {
              levels: {
                orderBy: {
                  levelOrder: 'asc'
                }
              }
            }
          }
        }
      });

      if (!monitor) {
        console.error(`Monitor ${monitorId} not found`);
        return;
      }

      if (!monitor.escalationPolicy || !monitor.escalationPolicy.enabled) {
        console.log(`No active escalation policy for monitor ${monitorId}`);
        return;
      }

      const { escalationPolicy } = monitor;
      
      if (!escalationPolicy.levels || escalationPolicy.levels.length === 0) {
        console.log(`No escalation levels defined for policy ${escalationPolicy.id}`);
        return;
      }

      // Get incident details for job data
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId }
      });

      if (!incident) {
        console.error(`Incident ${incidentId} not found`);
        return;
      }

      console.log(`Found ${escalationPolicy.levels.length} escalation levels for policy "${escalationPolicy.name}"`);

      // Calculate delay and create jobs for each level
      let cumulativeDelay = 0;

      for (const level of escalationPolicy.levels) {
        cumulativeDelay += level.waitMinutes * 60 * 1000; // Convert minutes to milliseconds

        const jobData: EscalationJobData = {
          monitor: {
            id: monitorId,
            name: monitor.name,
            url: monitor.url,
            status: monitor.status,
          },
          incident: {
            id: incidentId,
            title: incident.title,
          },
          escalationLevelId: level.id,
          levelOrder: level.levelOrder,
          method: level.channel,
          contacts: level.contacts,
        };

        const jobName = getJobName(incidentId, level.levelOrder);

        // Create delayed job
        const job = await escalationQueue.add(
          jobName,
          jobData,
          {
            delay: cumulativeDelay,
            jobId: jobName, // Use consistent job ID for easier removal
          }
        );

        console.log(`Scheduled ${level.channel} escalation (Level ${level.levelOrder}) in ${level.waitMinutes} minutes (total delay: ${cumulativeDelay/1000/60}min) - Job ID: ${job.id}`);
      }

      console.log(`Successfully scheduled ${escalationPolicy.levels.length} escalation jobs for monitor ${monitorId}`);

    } catch (error) {
      console.error(`Error starting escalation for monitor ${monitorId}:`, error);
    }
  }

  /**
   * Stop escalation for a monitor incident
   * Removes/cancels all pending escalation jobs for the incident
   */
  static async stopEscalation(monitorId: string, incidentId: string): Promise<void> {
    try {
      console.log(`Stopping escalation for monitor ${monitorId}, incident ${incidentId}`);

      // Get all jobs for this monitor-incident combination
      const jobs = await escalationQueue.getJobs(['waiting', 'delayed', 'active'], 0, -1);
      const jobsToCancel = jobs.filter(job => {
        if (!job.name) return false;
        const pattern = getJobPattern(incidentId);
        const regex = new RegExp(pattern.replace('*', '\\d+'));
        return regex.test(job.name);
      });

      if (jobsToCancel.length === 0) {
        console.log(`No pending escalation jobs found for monitor ${monitorId}, incident ${incidentId}`);
        return;
      }

      console.log(`Found ${jobsToCancel.length} escalation jobs to cancel`);

      // Cancel all matching jobs
      const cancelPromises = jobsToCancel.map(async (job) => {
        try {
          await job.remove();
          console.log(`Cancelled job: ${job.name}`);
        } catch (error) {
          console.error(`Failed to cancel job ${job.name}:`, error);
        }
      });

      await Promise.all(cancelPromises);
      console.log(`Successfully stopped escalation for monitor ${monitorId}, incident ${incidentId}`);

    } catch (error) {
      console.error(`Error stopping escalation for monitor ${monitorId}:`, error);
    }
  }

 

  /**
   * Clean up old completed/failed jobs (for maintenance)
   */
  static async cleanup(): Promise<void> {
    try {
      await escalationQueue.clean(24 * 60 * 60 * 1000, 100); // Clean jobs older than 24 hours, keep last 100
      console.log('🧹 Escalation queue cleanup completed');
    } catch (error) {
      console.error('Error during escalation queue cleanup:', error);
    }
  }
}

export default EscalationManager;