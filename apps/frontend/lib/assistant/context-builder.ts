import { prisma } from "db/client";
import { ConversationContext } from "@/types/assistant";

type ContextOptions = {
  contextType?: ConversationContext;
  contextId?: string;
};

export type AssistantContext = Awaited<
  ReturnType<typeof buildAssistantContext>
>;

/**
 * Build a lightweight context object for the LLM using the
 * authenticated user's data. This keeps payloads small while
 * still providing enough signal for useful answers.
 */
export async function buildAssistantContext(
  userId: string,
  options: ContextOptions = {}
) {
  const { contextType, contextId } = options;

  const [user, monitors, incidents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletAddress: true,
        createdAt: true,
      },
    }),
    prisma.monitor.findMany({
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
      take: 25,
    }),
    prisma.incident.findMany({
      where: { Monitor: { userId } },
      select: {
        id: true,
        title: true,
        status: true,
        cause: true,
        monitorId: true,
        createdAt: true,
        resolvedAt: true,
        Monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Focused context for a specific monitor or incident (optional)
  let focusedContext: Record<string, unknown> | null = null;

  if (contextType === "MONITOR" && contextId) {
    const monitor = monitors.find((m) => m.id === contextId);
    focusedContext = monitor || null;
  }

  if (contextType === "INCIDENT" && contextId) {
    const incident = incidents.find((i) => i.id === contextId);
    focusedContext = incident || null;
  }

  return {
    user: user
      ? {
          id: user.id,
          walletAddress: user.walletAddress,
          memberSince: user.createdAt,
        }
      : null,
    summary: {
      monitors: monitors.map((m) => ({
        id: m.id,
        name: m.name,
        url: m.url,
        status: m.status,
        timeout: m.timeout,
        checkInterval: m.checkInterval,
        expectedStatusCodes: m.expectedStatusCodes,
        lastCheckedAt: m.lastCheckedAt,
        hasOngoingIncident: m.Incident.some((i) => i.status !== "RESOLVED"),
      })),
      incidents: incidents.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        cause: i.cause,
        monitorId: i.monitorId,
        monitorName: i.Monitor.name,
        monitorUrl: i.Monitor.url,
        createdAt: i.createdAt,
        resolvedAt: i.resolvedAt,
      })),
    },
    focus: focusedContext,
    contextType,
    contextId,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Public helper to return a smaller, UI-friendly context summary.
 */
export async function getAssistantContextSummary(userId: string) {
  const context = await buildAssistantContext(userId);

  return {
    monitors: context.summary.monitors.map((m) => ({
      id: m.id,
      name: m.name,
      url: m.url,
      status: m.status,
      hasOngoingIncident: m.hasOngoingIncident,
      lastCheckedAt: m.lastCheckedAt,
    })),
    incidents: context.summary.incidents.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      monitorId: i.monitorId,
      monitorName: i.monitorName,
      createdAt: i.createdAt,
    })),
    analytics: [], // Placeholder: could be extended with analytics summaries later
  };
}

