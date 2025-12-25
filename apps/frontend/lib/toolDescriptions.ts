/**
 * Converts technical tool names to user-friendly descriptions
 * Used for displaying thinking process steps in the chat UI
 */
export function getToolDescription(toolName: string, args?: Record<string, unknown>): string {
  const descriptions: Record<string, (args?: Record<string, unknown>) => string> = {
    getMonitors: () => 'Getting your monitors',
    getMonitorDetails: (args) => `Fetching details for monitor ${args?.monitorId || ''}`,
    getMonitorStats: (args) => `Analyzing ${args?.period || 'recent'} statistics`,
    getMonitorAnalytics: (args) => `Calculating analytics for ${args?.period || 'recent'} period`,
    getMonitorTimeSeries: (args) => `Retrieving ${args?.metric || 'performance'} data over time`,
    createMonitor: (args) => `Creating monitor for ${args?.url || 'website'}`,
    updateMonitor: () => 'Updating monitor configuration',
    deleteMonitor: () => 'Deleting monitor',
    getIncidents: () => 'Fetching incidents',
    getIncidentDetails: () => 'Getting incident details',
    updateIncident: () => 'Updating incident status',
    getEscalationPolicies: () => 'Retrieving escalation policies',
    createEscalationPolicy: () => 'Creating escalation policy',
    getActiveAlerts: () => 'Checking active alerts',
    getValidatorStats: () => 'Analyzing validator network',
    getValidatorDashboard: () => 'Loading validator dashboard',
  };

  const formatter = descriptions[toolName];
  return formatter ? formatter(args) : `Executing ${toolName}`;
}
