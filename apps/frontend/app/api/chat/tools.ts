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
        monitorId: z.string().uuid().describe('The UUID of the monitor'),
      }),
      execute: async ({ monitorId }: { monitorId: string }): Promise<unknown> => {
        return await internalFetch(`/api/monitors/${monitorId}`, context);
      },
    }),

    getMonitorStats: tool({
      description: 'Get uptime and latency statistics for a monitor over a time period (day, week, or month).',
      inputSchema: z.object({
        monitorId: z.string().uuid().describe('The UUID of the monitor'),
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
  };
}
