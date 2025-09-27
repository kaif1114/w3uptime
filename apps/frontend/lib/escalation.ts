import EscalationManager from './escalationManager';

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
 * Send escalation via email (dummy implementation)
 * This function simulates sending an escalation email
 */
export async function sendEscalationEmail(
    contacts: string[], 
    title: string, 
    message: string, 
    monitorId: string
): Promise<void> {
    console.log(`📧 Sending escalation email for monitor ${monitorId}`);
    console.log(`📧 Title: ${title}`);
    console.log(`📧 Message: ${message}`);
    console.log(`📧 Recipients: ${contacts.join(', ')}`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`✅ Email escalation sent successfully`);
}

/**
 * Send escalation via Slack using default channel from integration
 * This function sends escalation messages to the default Slack channel
 */
export async function sendEscalationSlack(
    contacts: string[], 
    title: string, 
    message: string, 
    monitorId: string,
    slackChannelsData?: string | null
): Promise<void> {
    console.log(`💬 Sending escalation Slack message for monitor ${monitorId}`);
    
    // Get monitor and user's Slack integrations
    const { prisma } = await import('db/client');
    const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        select: { name: true, url: true, userId: true }
    });

    if (!monitor) {
        throw new Error(`Monitor ${monitorId} not found`);
    }

    // Get user's active Slack integrations with default channels
    const integrations = await prisma.slackIntegration.findMany({
        where: {
            userId: monitor.userId,
            isActive: true,
            defaultChannelId: {
                not: null
            }
        },
    });

    if (integrations.length === 0) {
        console.log(`💬 No Slack integrations with default channels found for user ${monitor.userId}`);
        // Fallback to legacy behavior (logging only)
        console.log(`💬 Title: ${title}`);
        console.log(`💬 Message: ${message}`);
        console.log(`💬 Channels/Users: ${contacts.join(', ')}`);
        console.log(`✅ Slack escalation logged (no integrations with default channels)`);
        return;
    }

    // Use actual Slack integration
    const { sendSlackNotification, createIncidentMessage } = await import('./slack');

    // Create incident message
    const incidentMessage = createIncidentMessage({
        title,
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        status: 'ONGOING',
        createdAt: new Date()
    });

    // Send to each integration's default channel
    for (const integration of integrations) {
        try {
            // Update message with specific channel
            const channelMessage = {
                ...incidentMessage,
                channel: integration.defaultChannelId!
            };

            const success = await sendSlackNotification(monitor.userId, channelMessage);
            if (success) {
                console.log(`✅ Sent Slack notification to ${integration.teamName}#${integration.defaultChannelName}`);
            } else {
                console.error(`❌ Failed to send Slack notification to ${integration.teamName}#${integration.defaultChannelName}`);
            }
        } catch (error) {
            console.error(`Error sending to channel ${integration.defaultChannelName}:`, error);
        }
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
    console.log(`🔗 Sending escalation webhook for monitor ${monitorId}`);
    console.log(`🔗 Title: ${title}`);
    console.log(`🔗 Message: ${message}`);
    console.log(`🔗 Webhook URLs: ${contacts.join(', ')}`);
    
    // Simulate webhook HTTP request delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log(`✅ Webhook escalation sent successfully`);
}