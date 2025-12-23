import { ToolName } from "./tool-definitions";

/**
 * Summarize tool results to reduce token usage while preserving essential information.
 * Large arrays (like 100 ticks) are converted to summary statistics.
 */
export function summarizeToolResult(
  toolType: ToolName | string,
  result: unknown
): string {
  if (result === null || result === undefined) {
    return `${toolType}: No data found`;
  }

  if (typeof result !== "object") {
    return `${toolType}: ${String(result)}`;
  }

  switch (toolType) {
    case "get_all_monitors":
      return summarizeMonitorsList(result as MonitorListResult[]);

    case "get_monitor_data":
      return summarizeMonitorData(result as MonitorDataResult);

    case "get_escalation_policies":
      return summarizeEscalationPolicies(result as EscalationPolicyResult[]);

    case "get_incidents":
      return summarizeIncidents(result as IncidentResult[]);

    case "get_all_incidents_for_monitor":
      return summarizeMonitorIncidents(result as MonitorIncidentsResult);

    case "get_status_page_link":
      return JSON.stringify(result, null, 2);

    default:
      // For unknown tools, return truncated JSON
      const json = JSON.stringify(result, null, 2);
      if (json.length > 2000) {
        return json.slice(0, 2000) + "\n... [truncated]";
      }
      return json;
  }
}

// Type definitions for tool results
type MonitorListResult = {
  id: string;
  name: string;
  url: string;
  status: string;
  hasOngoingIncident: boolean;
  lastCheckedAt: string | null;
  recentIncidents?: Array<{ id: string; status: string }>;
};

type MonitorDataResult = {
  id: string;
  name: string;
  url: string;
  status: string;
  stats: {
    totalChecks: number;
    successfulChecks: number;
    avgLatency: number;
    uptimePercentage: number;
  };
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
  recentTicks: Array<{
    status: string;
    latency: number;
    createdAt: string;
  }>;
  escalationPolicy?: { id: string; name: string; enabled: boolean } | null;
};

type EscalationPolicyResult = {
  id: string;
  name: string;
  enabled: boolean;
  levels: Array<{
    order: number;
    waitMinutes: number;
    channel: string;
    contacts: string[];
  }>;
  monitorCount: number;
  monitors: Array<{ id: string; name: string }>;
};

type IncidentResult = {
  id: string;
  title: string;
  status: string;
  cause: string;
  monitorId: string;
  monitorName: string;
  createdAt: string;
  resolvedAt: string | null;
  downtime?: number | null;
};

type MonitorIncidentsResult = {
  monitorId: string;
  monitorName: string;
  incidents: IncidentResult[];
  total: number;
};

function summarizeMonitorsList(monitors: MonitorListResult[]): string {
  if (!monitors || monitors.length === 0) {
    return "No monitors found.";
  }

  const summary = {
    totalMonitors: monitors.length,
    byStatus: {} as Record<string, number>,
    withOngoingIncidents: monitors.filter((m) => m.hasOngoingIncident).length,
    monitors: monitors.map((m) => ({
      id: m.id,
      name: m.name,
      url: m.url,
      status: m.status,
      hasOngoingIncident: m.hasOngoingIncident,
    })),
  };

  // Count by status
  monitors.forEach((m) => {
    summary.byStatus[m.status] = (summary.byStatus[m.status] || 0) + 1;
  });

  return JSON.stringify(summary, null, 2);
}

function summarizeMonitorData(data: MonitorDataResult): string {
  if (!data) {
    return "Monitor not found.";
  }

  // Summarize ticks instead of including all 100
  const tickSummary = summarizeTicks(data.recentTicks || []);

  const summary = {
    id: data.id,
    name: data.name,
    url: data.url,
    status: data.status,
    stats: data.stats,
    tickSummary,
    recentIncidents: (data.incidents || []).slice(0, 5).map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      createdAt: i.createdAt,
    })),
    totalIncidents: (data.incidents || []).length,
    escalationPolicy: data.escalationPolicy,
  };

  return JSON.stringify(summary, null, 2);
}

function summarizeTicks(
  ticks: Array<{ status: string; latency: number; createdAt: string }>
): object {
  if (!ticks || ticks.length === 0) {
    return { message: "No recent checks" };
  }

  const goodTicks = ticks.filter((t) => t.status === "GOOD");
  const badTicks = ticks.filter((t) => t.status !== "GOOD");
  const latencies = ticks.map((t) => t.latency);

  return {
    totalChecks: ticks.length,
    successful: goodTicks.length,
    failed: badTicks.length,
    uptimePercent: Math.round((goodTicks.length / ticks.length) * 100 * 100) / 100,
    latency: {
      avg: Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 100) / 100,
      min: Math.min(...latencies),
      max: Math.max(...latencies),
    },
    timeRange: {
      oldest: ticks[ticks.length - 1]?.createdAt,
      newest: ticks[0]?.createdAt,
    },
  };
}

function summarizeEscalationPolicies(
  policies: EscalationPolicyResult[]
): string {
  if (!policies || policies.length === 0) {
    return "No escalation policies found.";
  }

  const summary = {
    totalPolicies: policies.length,
    policies: policies.map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      monitorCount: p.monitorCount,
      levels: p.levels.map((l) => ({
        order: l.order,
        channel: l.channel,
        contacts: l.contacts,
        waitMinutes: l.waitMinutes,
      })),
    })),
  };

  return JSON.stringify(summary, null, 2);
}

function summarizeIncidents(incidents: IncidentResult[]): string {
  if (!incidents || incidents.length === 0) {
    return "No incidents found.";
  }

  const byStatus = {} as Record<string, number>;
  incidents.forEach((i) => {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });

  const summary = {
    total: incidents.length,
    byStatus,
    incidents: incidents.slice(0, 10).map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      monitorName: i.monitorName,
      createdAt: i.createdAt,
      resolvedAt: i.resolvedAt,
    })),
  };

  return JSON.stringify(summary, null, 2);
}

function summarizeMonitorIncidents(data: MonitorIncidentsResult): string {
  if (!data) {
    return "Monitor not found.";
  }

  const incidents = data.incidents || [];
  const byStatus = {} as Record<string, number>;
  incidents.forEach((i) => {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });

  const summary = {
    monitorId: data.monitorId,
    monitorName: data.monitorName,
    totalIncidents: data.total,
    byStatus,
    recentIncidents: incidents.slice(0, 10).map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      cause: i.cause,
      createdAt: i.createdAt,
      resolvedAt: i.resolvedAt,
    })),
  };

  return JSON.stringify(summary, null, 2);
}

/**
 * Format tool results for the follow-up LLM call.
 * Includes clear labels and instructions for the model.
 */
export function formatToolResultsForLLM(
  results: Array<{
    toolType: string;
    result: unknown;
    error?: string;
  }>
): string {
  const formatted = results.map((r) => {
    if (r.error) {
      return `[${r.toolType}] ERROR: ${r.error}`;
    }
    const summary = summarizeToolResult(r.toolType, r.result);
    return `[${r.toolType}] Result:\n${summary}`;
  });

  return [
    "=== FRESH DATA FROM TOOLS ===",
    "Use ONLY this data to answer. Do NOT mention that you fetched it.",
    "",
    ...formatted,
  ].join("\n\n");
}

