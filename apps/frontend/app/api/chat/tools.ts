import { tool } from 'ai';
import { z } from 'zod';
import { ToolExecutionContext } from '@/types/chat';

// Helper to make authenticated internal API calls
async function internalFetch(path: string, context: ToolExecutionContext, options: RequestInit = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Cookie': `sessionId=${context.sessionId}`,
      },
    });

    if (!response.ok) {
      return { error: true, message: `API returned ${response.status}: ${response.statusText}` };
    }

    return await response.json();
  } catch (error) {
    return { error: true, message: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export function createTools(context: ToolExecutionContext) {
  return {
    getMonitors: tool({
      description: 'Get a list of all monitors for the current user. Shows monitor name, URL, status (ACTIVE/PAUSED/DOWN), and basic configuration.',
      inputSchema: z.object({}),
      execute: async (): Promise<unknown> => {
        return await internalFetch('/api/monitors', context);
      },
    }),

    getMonitorDetails: tool({
      description: 'Get detailed information about a specific monitor by ID. Returns configuration, escalation policy, and creation date.',
      inputSchema: z.object({
        monitorId: z.uuid().describe('The UUID of the monitor'),
      }),
      execute: async ({ monitorId }: { monitorId: string }): Promise<unknown> => {
        return await internalFetch(`/api/monitors/${monitorId}`, context);
      },
    }),

    getMonitorStats: tool({
      description: 'Get uptime and latency statistics for a monitor over a time period (day, week, or month).',
      inputSchema: z.object({
        monitorId: z.uuid().describe('The UUID of the monitor'),
        period: z.enum(['day', 'week', 'month']).default('day').describe('Time period for statistics'),
      }),
      execute: async ({ monitorId, period }: { monitorId: string; period: 'day' | 'week' | 'month' }): Promise<unknown> => {
        return await internalFetch(`/api/monitors/${monitorId}/stats?period=${period}`, context);
      },
    }),

    getIncidents: tool({
      description: 'Get a list of incidents, optionally filtered by status (ongoing, acknowledged, resolved). Shows incident title, monitor, duration, and status.',
      inputSchema: z.object({
        status: z.enum(['ongoing', 'acknowledged', 'resolved']).optional().describe('Filter by incident status'),
        limit: z.number().int().positive().max(50).default(10).describe('Maximum number of incidents to return'),
      }),
      execute: async ({ status, limit }: { status?: 'ongoing' | 'acknowledged' | 'resolved'; limit: number }): Promise<unknown> => {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (status) params.append('status', status);
        return await internalFetch(`/api/incidents?${params}`, context);
      },
    }),

    getValidatorStats: tool({
      description: 'Get statistics about validator distribution across regions and countries. Shows total validators, geographic distribution, and network health.',
      inputSchema: z.object({}),
      execute: async (): Promise<unknown> => {
        return await internalFetch('/api/validators', context);
      },
    }),

    createMonitor: tool({
      description: 'Create a new monitor for a website. Requires URL, name, and escalation policy ID. Optionally set check interval (seconds) and expected status codes.',
      inputSchema: z.object({
        name: z.string().min(1).describe('Display name for the monitor'),
        url: z.url().describe('URL to monitor (must be valid HTTP/HTTPS)'),
        escalationPolicyId: z.uuid().describe('UUID of escalation policy to use'),
        checkInterval: z.number().int().positive().default(300).describe('Check interval in seconds (default: 300)'),
        timeout: z.number().int().positive().default(30).describe('Request timeout in seconds (default: 30)'),
        expectedStatusCodes: z.array(z.number().int()).default([200, 201, 202, 204]).describe('HTTP status codes considered successful'),
      }),
      execute: async (params: { name: string; url: string; escalationPolicyId: string; checkInterval: number; timeout: number; expectedStatusCodes: number[] }): Promise<unknown> => {
        return await internalFetch('/api/monitors', context, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
      },
    }),

    updateMonitor: tool({
      description: 'Update an existing monitor. Can change name, URL, status (ACTIVE/PAUSED), check interval, or escalation policy.',
      inputSchema: z.object({
        monitorId: z.uuid().describe('UUID of monitor to update'),
        name: z.string().min(1).optional().describe('New display name'),
        url: z.url().optional().describe('New URL to monitor'),
        status: z.enum(['ACTIVE', 'PAUSED']).optional().describe('Monitor status'),
        checkInterval: z.number().int().positive().optional().describe('Check interval in seconds'),
        timeout: z.number().int().positive().optional().describe('Request timeout in seconds'),
        escalationPolicyId: z.uuid().optional().describe('New escalation policy UUID'),
      }),
      execute: async ({ monitorId, ...updates }: { monitorId: string; name?: string; url?: string; status?: 'ACTIVE' | 'PAUSED'; checkInterval?: number; timeout?: number; escalationPolicyId?: string }): Promise<unknown> => {
        return await internalFetch(`/api/monitors/${monitorId}`, context, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      },
    }),

    deleteMonitor: tool({
      description: 'Delete a monitor permanently. This will remove the monitor and all associated data including incidents, alerts, and monitoring history. This action cannot be undone.',
      inputSchema: z.object({
        monitorId: z.uuid().describe('The UUID of the monitor to delete'),
      }),
      execute: async ({ monitorId }: { monitorId: string }): Promise<unknown> => {
        return await internalFetch(`/api/monitors/${monitorId}`, context, {
          method: 'DELETE',
        });
      },
    }),

    getMonitorAnalytics: tool({
      description: 'Get geographic analytics for a monitor including regional latency, validator distribution, and performance insights.',
      inputSchema: z.object({
        monitorId: z.uuid().describe('UUID of monitor'),
        period: z.enum(['day', 'week', 'month']).default('day').describe('Time period for analytics'),
      }),
      execute: async ({ monitorId, period }: { monitorId: string; period: 'day' | 'week' | 'month' }): Promise<unknown> => {
        return await internalFetch(`/api/monitors/${monitorId}/analytics?period=${period}`, context);
      },
    }),

    getMonitorTimeSeries: tool({
      description: 'Get time-bucketed data for charts showing uptime and latency over time. Returns data points suitable for line charts.',
      inputSchema: z.object({
        monitorId: z.uuid().describe('UUID of monitor'),
        period: z.enum(['day', 'week', 'month']).default('day').describe('Time period'),
        metric: z.enum(['uptime', 'latency', 'both']).default('both').describe('Which metrics to include'),
      }),
      execute: async ({ monitorId, period }: { monitorId: string; period: 'day' | 'week' | 'month'; metric: 'uptime' | 'latency' | 'both' }): Promise<unknown> => {
        return await internalFetch(`/api/monitors/${monitorId}/timeseries?period=${period}`, context);
      },
    }),

    getIncidentDetails: tool({
      description: 'Get full details of a specific incident including timeline events, affected monitor, duration, and resolution notes.',
      inputSchema: z.object({
        incidentId: z.uuid().describe('UUID of incident'),
      }),
      execute: async ({ incidentId }: { incidentId: string }): Promise<unknown> => {
        return await internalFetch(`/api/incidents/${incidentId}`, context);
      },
    }),

    updateIncident: tool({
      description: 'Update incident status (acknowledge or resolve). Optionally add resolution notes.',
      inputSchema: z.object({
        incidentId: z.uuid().describe('UUID of incident'),
        status: z.enum(['acknowledged', 'resolved']).describe('New incident status'),
        notes: z.string().optional().describe('Resolution notes or acknowledgment message'),
      }),
      execute: async ({ incidentId, status, notes }: { incidentId: string; status: 'acknowledged' | 'resolved'; notes?: string }): Promise<unknown> => {
        return await internalFetch(`/api/incidents/${incidentId}`, context, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, notes }),
        });
      },
    }),

    getEscalationPolicies: tool({
      description: 'Get all escalation policies for the user. Shows policy name, enabled status, and escalation levels.',
      inputSchema: z.object({}),
      execute: async (): Promise<unknown> => {
        return await internalFetch('/api/escalation-policies', context);
      },
    }),

    createEscalationPolicy: tool({
      description: 'Create a new escalation policy with multiple notification levels. Each level can use EMAIL, SLACK, or WEBHOOK.',
      inputSchema: z.object({
        name: z.string().min(1).describe('Policy name'),
        levels: z.array(z.object({
          method: z.enum(['EMAIL', 'SLACK', 'WEBHOOK']).describe('Notification method'),
          target: z.string().min(1).describe('Email address, Slack channel, or webhook URL'),
          waitTimeMinutes: z.number().int().min(0).max(1440).describe('Minutes to wait before this level triggers'),
        })).min(1).max(10).describe('Escalation levels (1-10)'),
      }),
      execute: async (params: { name: string; levels: Array<{ method: 'EMAIL' | 'SLACK' | 'WEBHOOK'; target: string; waitTimeMinutes: number }> }): Promise<unknown> => {
        return await internalFetch('/api/escalation-policies', context, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
      },
    }),

    getActiveAlerts: tool({
      description: 'Get all currently active alerts across all monitors. Shows which monitors are alerting right now.',
      inputSchema: z.object({}),
      execute: async (): Promise<unknown> => {
        return await internalFetch('/api/alerts', context);
      },
    }),

    getValidatorDashboard: tool({
      description: 'Get validator performance statistics for the current user if they run a validator. Shows earnings, reputation, and validation stats.',
      inputSchema: z.object({}),
      execute: async (): Promise<unknown> => {
        return await internalFetch('/api/validator/dashboard', context);
      },
    }),
  };
}
