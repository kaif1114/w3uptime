import EscalationManager from './escalationManager';

/**
 * Start escalation for a monitor incident
 * This function is called when an incident is created
 */
export async function startEscalation(monitorId: string, incidentId: string): Promise<void> {
    console.log(`🚨 Starting escalation for monitor ${monitorId}, incident ${incidentId}`);
    await EscalationManager.startEscalation(monitorId, incidentId);
}

/**
 * Stop escalation for a monitor incident  
 * This function is called when an incident is acknowledged or resolved
 */
export async function stopEscalation(monitorId: string, incidentId: string): Promise<void> {
    console.log(`🛑 Stopping escalation for monitor ${monitorId}, incident ${incidentId}`);
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
 * Send escalation via Slack (dummy implementation)
 * This function simulates sending an escalation to Slack
 */
export async function sendEscalationSlack(
    contacts: string[], 
    title: string, 
    message: string, 
    monitorId: string
): Promise<void> {
    console.log(`💬 Sending escalation Slack message for monitor ${monitorId}`);
    console.log(`💬 Title: ${title}`);
    console.log(`💬 Message: ${message}`);
    console.log(`💬 Channels/Users: ${contacts.join(', ')}`);
    
    // Simulate Slack API delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    console.log(`✅ Slack escalation sent successfully`);
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