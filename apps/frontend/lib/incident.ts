import { prisma } from "db/client";
import { startEscalation, stopEscalation, sendResolutionSlack } from "./escalation";
import { sendResolutionEmail } from "./email";

export async function createIncident(monitorId: string, title: string, time: Date) {
  try {
    const isExistingIncident = await prisma.incident.findFirst({
      where: {
        monitorId,
        cause: "URL_UNAVAILABLE",
        status: {
          in: ["ONGOING", "ACKNOWLEDGED"],
        },
      },
    });
    if (isExistingIncident) {
      return;
    }
    console.log('Creating incident...');
    const incident = await prisma.incident.create({
      data: {
        title,
        monitorId,
        createdAt: time,
        cause: "URL_UNAVAILABLE",
      },
    });

    await prisma.timelineEvent.create({
      data: {
        description: `Incident reported: ${title}`,
        incidentId: incident.id,
        type: "INCIDENT",
        createdAt: time,
      },
    });
    startEscalation(monitorId, incident.id);
  } catch (error) {
    console.error("Error creating incident:", error);
  }
}

export async function resolveIncident(monitorId: string, time: Date) {
    try {
        const incident = await prisma.incident.findFirst({
            where: {
                monitorId,
                cause: "URL_UNAVAILABLE",
                status: {
                    in: ["ONGOING", "ACKNOWLEDGED"]
                }
            },
            include: {
                Monitor: {
                    select: {
                        name: true,
                        url: true
                    }
                }
            }
        })
        
        if(incident) {
            console.log(`Resolving incident ${incident.id} for monitor ${monitorId}`);
            
            // Calculate downtime duration
            const downtime = time.getTime() - incident.createdAt.getTime();
            
            // Find escalation logs for alerts related to this specific incident
            const escalationLogs = await prisma.escalationLog.findMany({
                where: {
                    Alert: {
                        OR: [
                            { incidentId: incident.id },                    // New alerts with incident link
                            { 
                                incidentId: null,                           // Legacy alerts without incident link
                                monitorId: monitorId,
                                triggeredAt: {
                                    gte: incident.createdAt,                // Time-based fallback
                                    lte: time                               // Before resolution time
                                }
                            }
                        ]
                    }
                },
                include: {
                    escalationLevel: true,
                    Alert: true
                }
            });

            console.log(`Found ${escalationLogs.length} escalation logs for incident ${incident.id} resolution notifications`);

            // Group recipients by channel type for efficient sending
            const emailRecipients = new Set<string>();
            const slackRecipients = new Set<string>();
            let slackWorkspaces: string | null = null;

            for (const log of escalationLogs) {
                const { escalationLevel } = log;
                
                if (escalationLevel.channel === 'EMAIL') {
                    escalationLevel.contacts.forEach(contact => emailRecipients.add(contact));
                } else if (escalationLevel.channel === 'SLACK') {
                    escalationLevel.contacts.forEach(contact => slackRecipients.add(contact));
                    // Use the slack workspaces data from the escalation level if available
                    if (escalationLevel.slackChannels && !slackWorkspaces) {
                        slackWorkspaces = JSON.stringify(escalationLevel.slackChannels);
                    }
                }
            }

            // Send resolution notifications to previous alert recipients
            const notificationPromises: Promise<void>[] = [];

            // Send email notifications
            if (emailRecipients.size > 0) {
                console.log(`Sending resolution emails to: ${Array.from(emailRecipients).join(', ')}`);
                notificationPromises.push(
                    sendResolutionEmail(
                        Array.from(emailRecipients),
                        incident.title,
                        incident.Monitor.name,
                        incident.Monitor.url,
                        time,
                        incident.id,
                        downtime
                    ).catch(async (error) => {
                        console.error('Failed to send resolution emails:', error);
                        // Create timeline event for failed email notifications
                        try {
                            await prisma.timelineEvent.create({
                                data: {
                                    description: `Failed to send resolution emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                    incidentId: incident.id,
                                    type: "RESOLUTION",
                                    createdAt: time,
                                },
                            });
                        } catch (timelineError) {
                            console.error('Failed to create timeline event:', timelineError);
                        }
                    })
                );
            }

            // Send Slack notifications
            if (slackRecipients.size > 0) {
                console.log(`Sending resolution Slack notifications to: ${Array.from(slackRecipients).join(', ')}`);
                notificationPromises.push(
                    sendResolutionSlack(
                        Array.from(slackRecipients),
                        incident.title,
                        incident.Monitor.name,
                        incident.Monitor.url,
                        time,
                        monitorId,
                        slackWorkspaces,
                        incident.id,
                        downtime
                    ).catch(async (error) => {
                        console.error('Failed to send resolution Slack notifications:', error);
                        // Create timeline event for failed Slack notifications
                        try {
                            await prisma.timelineEvent.create({
                                data: {
                                    description: `Failed to send resolution Slack notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                    incidentId: incident.id,
                                    type: "RESOLUTION",
                                    createdAt: time,
                                },
                            });
                        } catch (timelineError) {
                            console.error('Failed to create timeline event:', timelineError);
                        }
                    })
                );
            }

            // Wait for all notifications to be sent (or fail)
            await Promise.allSettled(notificationPromises);

            // Update incident status to resolved
            await prisma.incident.update({
                where: { id: incident.id },
                data: { 
                    status: "RESOLVED", 
                    resolvedAt: time,
                    downtime: Math.round(downtime / 1000) // Store downtime in seconds
                }
            })

            // Create resolution timeline event
            await prisma.timelineEvent.create({
                data: {
                    description: `Incident resolved: ${incident.title}`,
                    incidentId: incident.id,
                    type: "RESOLUTION",
                    createdAt: time,
                },
            });

            // Stop any pending escalations
            stopEscalation(monitorId, incident.id);
            
            console.log(`Successfully resolved incident ${incident.id} with ${emailRecipients.size} email and ${slackRecipients.size} Slack notifications sent`);
        }
    } catch (error) {
        console.error("Error resolving incident:", error);
    }
}