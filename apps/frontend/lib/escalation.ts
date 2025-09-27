import EscalationManager from './escalationManager';

/**
 * Create a timeline event for escalation activities
 */
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

/**
 * Start escalation for a monitor incident
 * This function is called when an incident is created
 */
export async function startEscalation(monitorId: string, incidentId: string): Promise<void> {
    await EscalationManager.startEscalation(monitorId, incidentId);
}

/**
 * Stop escalation for a monitor incident  
 * This function is called when an incident is acknowledged or resolved
 */
export async function stopEscalation(monitorId: string, incidentId: string): Promise<void> {
    await EscalationManager.stopEscalation(monitorId, incidentId);
}

/**
 * Send escalation via email
 * This function sends actual escalation emails using Nodemailer
 */
export async function sendEscalationEmail(
    contacts: string[], 
    title: string, 
    message: string, 
    monitorId: string
): Promise<void> {
    console.log(`Sending escalation email for monitor ${monitorId}`);
    console.log(`Recipients: ${contacts.join(', ')}`);
    
    // Import the actual email sending function
    const { sendEscalationEmail: sendEmail } = await import('./email');
    
    // Get incident ID if not provided
    const { prisma } = await import('db/client');

    // Get incident ID if not provided
    let currentIncidentId = incidentId;
    if (!currentIncidentId) {
        const incident = await prisma.incident.findFirst({
            where: {
                monitorId,
                status: { in: ["ONGOING", "ACKNOWLEDGED"] }
            },
            select: { id: true }
        });
        currentIncidentId = incident?.id;
    }
    
    try {
        // Send the actual email
        await sendEmail(contacts, title, message, monitorId);
        
        // Create timeline event for successful email escalation
        if (currentIncidentId) {
            const validEmails = contacts.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
            await createEscalationTimelineEvent(
                currentIncidentId,
                `📧 Email alert sent to: ${validEmails.join(', ')}`
            );
        }
        
        console.log(`Email escalation sent successfully`);
    } catch (error) {
        console.error(`Failed to send escalation email:`, error);
        
        // Create timeline event for failed email escalation
        if (currentIncidentId) {
            await createEscalationTimelineEvent(
                currentIncidentId,
                `❌ Failed to send email alert to: ${contacts.join(', ')} - ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
        
        // Re-throw to ensure the escalation system knows about the failure
        throw error;
    }
}

/**
 * Send escalation via Slack using selected workspaces
 * This function sends escalation messages to the selected Slack workspaces
 */
export async function sendEscalationSlack(
    contacts: string[], 
    title: string, 
    message: string, 
    monitorId: string,
    slackWorkspacesData?: string | null
): Promise<void> {
    console.log(`Sending escalation Slack message for monitor ${monitorId}`);
    
    // Get incident ID if not provided
    const { prisma } = await import('db/client');
    let currentIncidentId = incidentId;
    if (!currentIncidentId) {
        const incident = await prisma.incident.findFirst({
            where: {
                monitorId,
                status: { in: ["ONGOING", "ACKNOWLEDGED"] }
            },
            select: { id: true }
        });
        currentIncidentId = incident?.id;
    }

    
    // Parse slack workspaces data
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
        // Fallback to legacy behavior (logging only)
        console.log(`Title: ${title}`);
        console.log(`Message: ${message}`);
        console.log(`Channels/Users: ${contacts.join(', ')}`);
        console.log(`Slack escalation logged (no workspaces configured)`);
        
        // Create timeline event for no Slack configuration
        if (currentIncidentId) {
            await createEscalationTimelineEvent(
                currentIncidentId,
                `💬 Slack alert attempted but no workspaces configured: ${contacts.join(', ')}`
            );
        }
        return;
    }

    // Get monitor details for the message
    const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        select: { name: true, url: true, userId: true }
    });

    if (!monitor) {
        throw new Error(`Monitor ${monitorId} not found`);
    }

    // Use actual Slack integration - try both Bot API and Webhooks
    const { 
        sendSlackNotification, 
        sendSlackWebhookNotification, 
        createIncidentMessage, 
        createEscalationMessage 
    } = await import('./slack');

    // Create escalation message (more specific than incident message)
    const escalationMsg = createEscalationMessage({
        title,
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        message,
        createdAt: new Date()
    });

    // First try webhook approach (simpler, more reliable)
    let webhookSuccess = false;
    try {
        webhookSuccess = await sendSlackWebhookNotification(monitor.userId, escalationMsg);
        if (webhookSuccess) {
            console.log(`Sent Slack webhook escalation for monitor ${monitorId}`);
            
            // Create timeline event for successful webhook notification
            if (currentIncidentId) {
                await createEscalationTimelineEvent(
                    currentIncidentId,
                    `💬 Slack webhook alert sent`
                );
            }
        }
    } catch (error) {
        console.error('Error sending webhook escalation:', error);
    }

    // If webhook fails or not configured, fall back to Bot API with workspace targeting
    if (!webhookSuccess && slackWorkspaces.length > 0) {
        // Create incident message for Bot API (includes channel targeting)
        const incidentMessage = createIncidentMessage({
            title,
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            status: 'ONGOING',
            createdAt: new Date()
        });

        // Send to each selected workspace
        for (const workspace of slackWorkspaces) {
            try {
                // Update message with specific channel
                const channelMessage = {
                    ...incidentMessage,
                    channel: workspace.defaultChannelId
                };

                const success = await sendSlackNotification(monitor.userId, channelMessage);
                if (success) {
                    console.log(`Sent Slack Bot API notification to ${workspace.teamName}#${workspace.defaultChannelName}`);
                    webhookSuccess = true; // Mark as successful
                    
                    // Create timeline event for successful Bot API notification
                    if (currentIncidentId) {
                        await createEscalationTimelineEvent(
                            currentIncidentId,
                            `💬 Slack alert sent to ${workspace.teamName}#${workspace.defaultChannelName}`
                        );
                    }
                } else {
                    console.error(`Failed to send Slack Bot API notification to ${workspace.teamName}#${workspace.defaultChannelName}`);
                    
                    // Create timeline event for failed Bot API notification
                    if (currentIncidentId) {
                        await createEscalationTimelineEvent(
                            currentIncidentId,
                            `Failed to send Slack alert to ${workspace.teamName}#${workspace.defaultChannelName}`
                        );
                    }
                }
            } catch (error) {
                console.error(`Error sending to workspace ${workspace.teamName}:`, error);
                
                // Create timeline event for workspace error
                if (currentIncidentId) {
                    await createEscalationTimelineEvent(
                        currentIncidentId,
                        `Error sending Slack alert to ${workspace.teamName}: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }
        }
    }

    // If neither method worked, throw error
    if (!webhookSuccess && slackWorkspaces.length === 0) {
        console.log(`No Slack integration methods available (no webhook URLs or selected workspaces)`);
    }
}

/**
 * Send escalation via webhook (dummy implementation)
 * This function simulates sending an escalation to a webhook
 */
export async function sendEscalationWebhook(
    contacts: string[], 
    title: string, 
    message: string, 
    monitorId: string
): Promise<void> {
    console.log(`Sending escalation webhook for monitor ${monitorId}`);
    console.log(`Webhook URLs: ${contacts.join(', ')}`);
    
    // Get incident ID
    const { prisma } = await import('db/client');
    const incident = await prisma.incident.findFirst({
        where: {
            monitorId,
            status: { in: ["ONGOING", "ACKNOWLEDGED"] }
        },
        select: { id: true }
    });
    const currentIncidentId = incident?.id;

    
    // Validate webhook URLs
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
                `Webhook alert attempted but no valid URLs: ${contacts.join(', ')}`
            );
        }
        return;
    }

    // Prepare webhook payload (TODO: Use in actual HTTP request implementation)
    const _payload = {
        title,
        message,
        monitorId,
        timestamp: new Date().toISOString(),
        type: 'escalation',
    };

    // Send to each webhook URL
    const webhookPromises = validWebhooks.map(async (webhookUrl) => {
        try {
            // Simulate webhook HTTP request delay (in real implementation, use fetch)
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // TODO: Replace with actual HTTP request
            // const response = await fetch(webhookUrl, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(payload)
            // });
            // 
            // if (!response.ok) {
            //     throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            // }

            console.log(`Webhook sent to: ${webhookUrl}`);
            
            // Create timeline event for successful webhook
            if (currentIncidentId) {
                await createEscalationTimelineEvent(
                    currentIncidentId,
                    `Webhook alert sent to ${webhookUrl}`
                );
            }
            
            return { url: webhookUrl, success: true };
        } catch (error) {
            console.error(`Failed to send webhook to ${webhookUrl}:`, error);
            
            // Create timeline event for failed webhook
            if (currentIncidentId) {
                await createEscalationTimelineEvent(
                    currentIncidentId,
                    `Failed to send webhook alert to ${webhookUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
            
            return { url: webhookUrl, success: false, error };
        }
    });

    // Wait for all webhooks to complete
    const results = await Promise.all(webhookPromises);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`Webhook escalation completed: ${successCount}/${validWebhooks.length} successful`);
}