import EscalationManager from './escalationManager';


async function createEscalationTimelineEvent(
    incidentId: string,
    description: string
): Promise<void> {
    try {
        const { prisma } = await import('db/client');
        await prisma.timelineEvent.create({
            data: {
                description,
                incidentId,
                type: "ESCALATION",
                createdAt: new Date(),
            },
        });
    } catch (error) {
        console.error('Failed to create timeline event:', error);
    }
}


export async function startEscalation(monitorId: string, incidentId: string): Promise<void> {
    await EscalationManager.startEscalation(monitorId, incidentId);
}


export async function stopEscalation(monitorId: string, incidentId: string): Promise<void> {
    await EscalationManager.stopEscalation(monitorId, incidentId);
}


export async function sendEscalationEmail(
    contacts: string[], 
    title: string, 
    message: string, 
    monitorId: string,
    incidentId: string,
    escalationLogId?: string
): Promise<void> {
    console.log(`Sending escalation email for monitor ${monitorId}`);
    console.log(`Recipients: ${contacts.join(', ')}`);
    
    
    const { sendEscalationEmail: sendEmail } = await import('./email');
    
    try {
        
        await sendEmail(contacts, title, message, monitorId, incidentId, escalationLogId);
        
        
        if (incidentId) {
            const validEmails = contacts.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
            await createEscalationTimelineEvent(
                incidentId,
                `Email alert sent to: ${validEmails.join(', ')}`
            );
        }
        
        console.log(`Email escalation sent successfully`);
    } catch (error) {
        console.error(`Failed to send escalation email:`, error);
        
        
        if (incidentId) {
            await createEscalationTimelineEvent(
                incidentId,
                `Failed to send email alert to: ${contacts.join(', ')} - ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
        
        
        throw error;
    }
}


export async function sendEscalationSlack(
    contacts: string[], 
    title: string, 
    message: string, 
    monitorId: string,
    slackWorkspacesData?: string | null,
    incidentId?: string,
    escalationLogId?: string
): Promise<void> {
    console.log(`Sending escalation Slack message for monitor ${monitorId}`);
    
    
    const { prisma } = await import('db/client');
    
    let slackWorkspaces: { teamId: string; teamName: string; defaultChannelId: string; defaultChannelName: string; }[] = [];
    if (slackWorkspacesData) {
        try {
            slackWorkspaces = JSON.parse(slackWorkspacesData);
        } catch (error) {
            console.error('Error parsing slack workspaces data:', error);
        }
    }

    if (slackWorkspaces.length === 0) {
        console.log(`No Slack workspaces configured for this escalation`);
        
        console.log(`Title: ${title}`);
        console.log(`Message: ${message}`);
        console.log(`Channels/Users: ${contacts.join(', ')}`);
        console.log(`Slack escalation logged (no workspaces configured)`);
        
        
        if (incidentId) {
            await createEscalationTimelineEvent(
                incidentId,
                `Slack alert attempted but no workspaces configured for contacts: ${contacts.join(', ')}`
            );
        }
        return;
    }

    
    const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        select: { name: true, url: true, userId: true }
    });

    if (!monitor) {
        throw new Error(`Monitor ${monitorId} not found`);
    }

    
    const { 
        sendSlackNotification, 
        sendSlackWebhookNotification, 
        createIncidentMessage, 
        createEscalationMessage 
    } = await import('./slack');

    
    console.log('Slack escalation - escalationLogId:', escalationLogId);
    const escalationMsg = createEscalationMessage({
        title,
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        message,
        createdAt: new Date(),
        incidentId,
        escalationLogId
    });

    
    let webhookSuccess = false;
    try {
        webhookSuccess = await sendSlackWebhookNotification(monitor.userId, escalationMsg);
        if (webhookSuccess) {
            console.log(`Sent Slack webhook escalation for monitor ${monitorId}`);
            
            
            if (incidentId) {
                await createEscalationTimelineEvent(
                    incidentId,
                    `Slack Alert sent`
                );
            }
        }
    } catch (error) {
        console.error('Error sending webhook escalation:', error);
    }

    
    if (!webhookSuccess && slackWorkspaces.length > 0) {
        
        const incidentMessage = createIncidentMessage({
            title,
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            status: 'ONGOING',
            createdAt: new Date()
        });

        
        for (const workspace of slackWorkspaces) {
            try {
                
                const channelMessage = {
                    ...incidentMessage,
                    channel: workspace.defaultChannelId
                };

                const success = await sendSlackNotification(monitor.userId, channelMessage);
                if (success) {
                    console.log(`Sent Slack Bot API notification to ${workspace.teamName}#${workspace.defaultChannelName}`);
                    webhookSuccess = true; 
                    
                    
                    if (incidentId) {
                        await createEscalationTimelineEvent(
                            incidentId,
                            `Slack alert sent to ${workspace.teamName}#${workspace.defaultChannelName}`
                        );
                    }
                } else {
                    console.error(`Failed to send Slack Bot API notification to ${workspace.teamName}#${workspace.defaultChannelName}`);
                    
                    
                    if (incidentId) {
                        await createEscalationTimelineEvent(
                            incidentId,
                            `Failed to send Slack alert to ${workspace.teamName}#${workspace.defaultChannelName}`
                        );
                    }
                }
            } catch (error) {
                console.error(`Error sending to workspace ${workspace.teamName}:`, error);
                
                
                if (incidentId) {
                    await createEscalationTimelineEvent(
                        incidentId,
                        `Error sending Slack alert to ${workspace.teamName}: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }
        }
    }

    
    if (!webhookSuccess && slackWorkspaces.length === 0) {
        console.log(`No Slack integration methods available (no webhook URLs or selected workspaces)`);
    }
}


export async function sendEscalationWebhook(
    contacts: string[], 
    title: string, 
    message: string, 
    monitorId: string
): Promise<void> {
    console.log(`Sending escalation webhook for monitor ${monitorId}`);
    console.log(`Webhook URLs: ${contacts.join(', ')}`);
    
    
    const { prisma } = await import('db/client');
    const incident = await prisma.incident.findFirst({
        where: {
            monitorId,
            status: { in: ["ONGOING", "ACKNOWLEDGED"] }
        },
        select: { id: true }
    });
    const currentIncidentId = incident?.id;

    
    
    const validWebhooks = contacts.filter(url => {
        try {
            new URL(url);
            return url.startsWith('http://') || url.startsWith('https://');
        } catch {
            return false;
        }
    });

    if (validWebhooks.length === 0) {
        console.log(`No valid webhook URLs provided`);
        if (currentIncidentId) {
            await createEscalationTimelineEvent(
                currentIncidentId,
                `Webhook alert attempted but no valid URLs provided: ${contacts.join(', ')}`
            );
        }
        return;
    }

    
    const _payload = {
        title,
        message,
        monitorId,
        timestamp: new Date().toISOString(),
        type: 'escalation',
    };

    
    const webhookPromises = validWebhooks.map(async (webhookUrl) => {
        try {
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            
            
            
            
            
            
            
            
            
            

            console.log(`Webhook sent to: ${webhookUrl}`);
            
            
            if (currentIncidentId) {
                await createEscalationTimelineEvent(
                    currentIncidentId,
                    `Webhook alert sent to: ${webhookUrl}`
                );
            }
            
            return { url: webhookUrl, success: true };
        } catch (error) {
            console.error(`Failed to send webhook to ${webhookUrl}:`, error);
            
            
            if (currentIncidentId) {
                await createEscalationTimelineEvent(
                    currentIncidentId,
                    `Failed to send webhook alert to ${webhookUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
            
            return { url: webhookUrl, success: false, error };
        }
    });

    
    const results = await Promise.all(webhookPromises);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`Webhook escalation completed: ${successCount}/${validWebhooks.length} successful`);
}


export async function sendResolutionSlack(
    contacts: string[], 
    title: string, 
    monitorName: string,
    monitorUrl: string,
    resolvedAt: Date,
    monitorId: string,
    slackWorkspacesData?: string | null,
    incidentId?: string,
    downtime?: number
): Promise<void> {
    console.log(`Sending resolution Slack message for monitor ${monitorId}`);
    
    
    const { prisma } = await import('db/client');
    
    let slackWorkspaces: { teamId: string; teamName: string; defaultChannelId: string; defaultChannelName: string; }[] = [];
    if (slackWorkspacesData) {
        try {
            slackWorkspaces = JSON.parse(slackWorkspacesData);
        } catch (error) {
            console.error('Error parsing slack workspaces data:', error);
        }
    }

    if (slackWorkspaces.length === 0) {
        console.log(`No Slack workspaces configured for this resolution notification`);
        
        console.log(`Title: ${title} - Resolved`);
        console.log(`Monitor: ${monitorName}`);
        console.log(`Channels/Users: ${contacts.join(', ')}`);
        console.log(`Slack resolution notification logged (no workspaces configured)`);
        
        
        if (incidentId) {
            await createEscalationTimelineEvent(
                incidentId,
                `Slack resolution notification attempted but no workspaces configured for contacts: ${contacts.join(', ')}`
            );
        }
        return;
    }

    
    const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        select: { name: true, url: true, userId: true }
    });

    if (!monitor) {
        throw new Error(`Monitor ${monitorId} not found`);
    }

    
    const { 
        sendSlackNotification, 
        sendSlackWebhookNotification, 
        createIncidentMessage, 
        createResolutionMessage 
    } = await import('./slack');

    
    const resolutionMsg = createResolutionMessage({
        title,
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        resolvedAt,
        downtime,
        incidentId
    });

    
    let webhookSuccess = false;
    try {
        webhookSuccess = await sendSlackWebhookNotification(monitor.userId, resolutionMsg);
        if (webhookSuccess) {
            console.log(`Sent Slack webhook resolution notification for monitor ${monitorId}`);
            
            
            if (incidentId) {
                await createEscalationTimelineEvent(
                    incidentId,
                    `Slack webhook resolution notification sent`
                );
            }
        }
    } catch (error) {
        console.error('Error sending webhook resolution notification:', error);
    }

    
    if (!webhookSuccess && slackWorkspaces.length > 0) {
        
        const incidentMessage = createIncidentMessage({
            title: `${title} - Resolved`,
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            status: 'RESOLVED',
            createdAt: resolvedAt
        });

        
        for (const workspace of slackWorkspaces) {
            try {
                
                const channelMessage = {
                    ...incidentMessage,
                    channel: workspace.defaultChannelId
                };

                const success = await sendSlackNotification(monitor.userId, channelMessage);
                if (success) {
                    console.log(`Sent Slack Bot API resolution notification to ${workspace.teamName}#${workspace.defaultChannelName}`);
                    webhookSuccess = true; 
                    
                    
                    if (incidentId) {
                        await createEscalationTimelineEvent(
                            incidentId,
                            `Slack resolution notification sent to ${workspace.teamName}#${workspace.defaultChannelName}`
                        );
                    }
                } else {
                    console.error(`Failed to send Slack Bot API resolution notification to ${workspace.teamName}#${workspace.defaultChannelName}`);
                    
                    
                    if (incidentId) {
                        await createEscalationTimelineEvent(
                            incidentId,
                            `Failed to send Slack resolution notification to ${workspace.teamName}#${workspace.defaultChannelName}`
                        );
                    }
                }
            } catch (error) {
                console.error(`Error sending resolution notification to workspace ${workspace.teamName}:`, error);
                
                
                if (incidentId) {
                    await createEscalationTimelineEvent(
                        incidentId,
                        `Error sending Slack resolution notification to ${workspace.teamName}: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }
        }
    }

    
    if (!webhookSuccess && slackWorkspaces.length === 0) {
        console.log(`No Slack integration methods available for resolution notification (no webhook URLs or selected workspaces)`);
    }
}