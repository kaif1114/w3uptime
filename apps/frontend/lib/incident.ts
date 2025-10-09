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
            
            
            const downtime = time.getTime() - incident.createdAt.getTime();
            
            
            const escalationLogs = await prisma.escalationLog.findMany({
                where: {
                    Alert: {
                        incidentId: incident.id
                    }
                },
                include: {
                    escalationLevel: true,
                    Alert: true
                }
            });

            console.log(`Found ${escalationLogs.length} escalation logs for incident ${incident.id} resolution notifications`);

            
            const emailRecipients = new Set<string>();
            const slackRecipients = new Set<string>();
            let slackWorkspaces: string | null = null;

            for (const log of escalationLogs) {
                const { escalationLevel } = log;
                
                if (escalationLevel.channel === 'EMAIL') {
                    escalationLevel.contacts.forEach(contact => emailRecipients.add(contact));
                } else if (escalationLevel.channel === 'SLACK') {
                    escalationLevel.contacts.forEach(contact => slackRecipients.add(contact));
                    
                    if (escalationLevel.slackChannels && !slackWorkspaces) {
                        slackWorkspaces = JSON.stringify(escalationLevel.slackChannels);
                    }
                }
            }

            
            const notificationPromises: Promise<void>[] = [];

            
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

            
            await Promise.allSettled(notificationPromises);

            
            await prisma.incident.update({
                where: { id: incident.id },
                data: { 
                    status: "RESOLVED", 
                    resolvedAt: time,
                    downtime: Math.round(downtime / 1000) 
                }
            })

            
            await prisma.timelineEvent.create({
                data: {
                    description: `Incident resolved: ${incident.title}`,
                    incidentId: incident.id,
                    type: "RESOLUTION",
                    createdAt: time,
                },
            });

            
            stopEscalation(monitorId, incident.id);
            
            console.log(`Successfully resolved incident ${incident.id} with ${emailRecipients.size} email and ${slackRecipients.size} Slack notifications sent`);
        }
    } catch (error) {
        console.error("Error resolving incident:", error);
    }
}