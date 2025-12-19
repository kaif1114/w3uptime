import { prisma } from "db/client";

/**
 * Tool handler: Get all monitors for a user
 */
export async function getAllMonitors(userId: string) {
  const monitors = await prisma.monitor.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      url: true,
      status: true,
      timeout: true,
      checkInterval: true,
      expectedStatusCodes: true,
      lastCheckedAt: true,
      createdAt: true,
      escalationPolicyId: true,
      Incident: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return monitors.map((monitor) => ({
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    status: monitor.status,
    timeout: monitor.timeout,
    checkInterval: monitor.checkInterval,
    expectedStatusCodes: monitor.expectedStatusCodes,
    lastCheckedAt: monitor.lastCheckedAt?.toISOString() || null,
    createdAt: monitor.createdAt.toISOString(),
    escalationPolicyId: monitor.escalationPolicyId,
    hasOngoingIncident: monitor.Incident.some(
      (incident) => incident.status !== "RESOLVED"
    ),
    recentIncidents: monitor.Incident.map((incident) => ({
      id: incident.id,
      status: incident.status,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() || null,
    })),
  }));
}

/**
 * Tool handler: Get detailed monitor data including ticks and incidents
 */
export async function getMonitorData(userId: string, monitorId: string) {
  const monitor = await prisma.monitor.findFirst({
    where: {
      id: monitorId,
      userId,
    },
    include: {
      Incident: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      monitorTicks: {
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          status: true,
          latency: true,
          countryCode: true,
          continentCode: true,
          city: true,
          createdAt: true,
        },
      },
      escalationPolicy: {
        select: {
          id: true,
          name: true,
          enabled: true,
        },
      },
    },
  });

  if (!monitor) {
    throw new Error("Monitor not found");
  }

  // Calculate basic stats from ticks
  const recentTicks = monitor.monitorTicks;
  const goodTicks = recentTicks.filter((tick) => tick.status === "GOOD");
  const avgLatency =
    recentTicks.length > 0
      ? recentTicks.reduce((sum, tick) => sum + tick.latency, 0) /
        recentTicks.length
      : 0;
  const uptimePercentage =
    recentTicks.length > 0
      ? (goodTicks.length / recentTicks.length) * 100
      : 0;

  return {
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    status: monitor.status,
    timeout: monitor.timeout,
    checkInterval: monitor.checkInterval,
    expectedStatusCodes: monitor.expectedStatusCodes,
    lastCheckedAt: monitor.lastCheckedAt?.toISOString() || null,
    createdAt: monitor.createdAt.toISOString(),
    escalationPolicyId: monitor.escalationPolicyId,
    escalationPolicy: monitor.escalationPolicy,
    incidents: monitor.Incident.map((incident) => ({
      id: incident.id,
      title: incident.title,
      status: incident.status,
      cause: incident.cause,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() || null,
    })),
    stats: {
      totalChecks: recentTicks.length,
      successfulChecks: goodTicks.length,
      avgLatency: Math.round(avgLatency * 100) / 100,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
    },
    recentTicks: recentTicks.map((tick) => ({
      id: tick.id,
      status: tick.status,
      latency: tick.latency,
      countryCode: tick.countryCode,
      continentCode: tick.continentCode,
      city: tick.city,
      createdAt: tick.createdAt.toISOString(),
    })),
  };
}

/**
 * Tool handler: Get all escalation policies for a user
 */
export async function getEscalationPolicies(userId: string) {
  const policies = await prisma.escalationPolicy.findMany({
    where: { userId },
    include: {
      levels: {
        orderBy: {
          levelOrder: "asc",
        },
      },
      monitors: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return policies.map((policy) => ({
    id: policy.id,
    name: policy.name,
    enabled: policy.enabled,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
    levels: policy.levels.map((level) => ({
      id: level.id,
      order: level.levelOrder,
      waitMinutes: level.waitMinutes,
      channel: level.channel,
      contacts: level.contacts,
      slackChannels: level.slackChannels,
    })),
    monitorCount: policy.monitors.length,
    monitors: policy.monitors.map((monitor) => ({
      id: monitor.id,
      name: monitor.name,
    })),
  }));
}

/**
 * Tool handler: Get incidents with optional filters
 */
export async function getIncidents(
  userId: string,
  filters: {
    monitorId?: string;
    status?: "ONGOING" | "ACKNOWLEDGED" | "RESOLVED";
    limit?: number;
  } = {}
) {
  const { monitorId, status, limit = 20 } = filters;

  const whereClause: {
    Monitor: { userId: string };
    monitorId?: string;
    status?: "ONGOING" | "ACKNOWLEDGED" | "RESOLVED";
  } = {
    Monitor: { userId },
  };

  if (monitorId) {
    whereClause.monitorId = monitorId;
  }

  if (status) {
    whereClause.status = status;
  }

  const incidents = await prisma.incident.findMany({
    where: whereClause,
    include: {
      Monitor: {
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return incidents.map((incident) => ({
    id: incident.id,
    title: incident.title,
    status: incident.status,
    cause: incident.cause,
    monitorId: incident.monitorId,
    monitorName: incident.Monitor.name,
    monitorUrl: incident.Monitor.url,
    createdAt: incident.createdAt.toISOString(),
    resolvedAt: incident.resolvedAt?.toISOString() || null,
    downtime: incident.downtime,
  }));
}

/**
 * Tool handler: Get status page public URL
 */
export async function getStatusPageLink(
  userId: string,
  statusPageId?: string
) {
  const whereClause: { userId: string; id?: string } = { userId };

  if (statusPageId) {
    whereClause.id = statusPageId;
  }

  const statusPage = await prisma.statusPage.findFirst({
    where: whereClause,
    select: {
      id: true,
      name: true,
      isPublished: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!statusPage) {
    throw new Error("Status page not found");
  }

  if (!statusPage.isPublished) {
    throw new Error("Status page is not published");
  }

  // Return the public URL format
  // Based on the routes, it appears to be /public/status-pages/[id]
  return {
    id: statusPage.id,
    name: statusPage.name,
    publicUrl: `/public/status-pages/${statusPage.id}`,
    isPublished: statusPage.isPublished,
  };
}

/**
 * Tool handler: Get all incidents for a specific monitor
 */
export async function getAllIncidentsForMonitor(
  userId: string,
  monitorId: string,
  filters: {
    status?: "ONGOING" | "ACKNOWLEDGED" | "RESOLVED";
    limit?: number;
  } = {}
) {
  // First verify the monitor belongs to the user
  const monitor = await prisma.monitor.findFirst({
    where: {
      id: monitorId,
      userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!monitor) {
    throw new Error("Monitor not found");
  }

  const { status, limit = 50 } = filters;

  const whereClause: {
    monitorId: string;
    status?: "ONGOING" | "ACKNOWLEDGED" | "RESOLVED";
  } = {
    monitorId,
  };

  if (status) {
    whereClause.status = status;
  }

  const incidents = await prisma.incident.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return {
    monitorId: monitor.id,
    monitorName: monitor.name,
    incidents: incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      status: incident.status,
      cause: incident.cause,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() || null,
      downtime: incident.downtime,
    })),
    total: incidents.length,
  };
}
