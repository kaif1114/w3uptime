export function startEscalation(monitorId: string) {
    console.log(`Starting escalation for monitor ${monitorId}`);
}
export function stopEscalation(monitorId: string) {
    console.log(`Stopping escalation for monitor ${monitorId}`);
}

export async function sendEscalationEmail(){
    console.log(`Sending escalation email`);
}
export async function sendEscalationSlack(){
    console.log(`Sending escalation slack`);
}
export async function sendEscalationWebhook(){
    console.log(`Sending escalation webhook`);
}