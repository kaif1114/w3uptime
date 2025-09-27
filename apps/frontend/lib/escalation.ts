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
    console.log(`💬 Sending escalation Slack message for monitor ${monitorId}`);
    
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
        console.log(`💬 No Slack workspaces configured for this escalation`);
        // Fallback to legacy behavior (logging only)
        console.log(`💬 Title: ${title}`);
        console.log(`💬 Message: ${message}`);
        console.log(`💬 Channels/Users: ${contacts.join(', ')}`);
        console.log(`✅ Slack escalation logged (no workspaces configured)`);
        return;
    }

    // Get monitor details for the message
    const { prisma } = await import('db/client');
    const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        select: { name: true, url: true, userId: true }
    });

    if (!monitor) {
        throw new Error(`Monitor ${monitorId} not found`);
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
                console.log(`✅ Sent Slack notification to ${workspace.teamName}#${workspace.defaultChannelName}`);
            } else {
                console.error(`❌ Failed to send Slack notification to ${workspace.teamName}#${workspace.defaultChannelName}`);
            }
        } catch (error) {
            console.error(`Error sending to workspace ${workspace.teamName}:`, error);
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