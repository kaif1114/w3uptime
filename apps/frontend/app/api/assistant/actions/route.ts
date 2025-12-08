import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "db/client";
import { Prisma } from "@prisma/client";

type ActionBody = {
  actionType?: string;
  actionData?: Record<string, unknown>;
};

async function handleAcknowledgeIncident(userId: string, incidentId?: string) {
  if (!incidentId) throw new Error("incidentId is required");

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, Monitor: { userId } },
    select: { id: true, status: true },
  });

  if (!incident) throw new Error("Incident not found");

  const updated = await prisma.incident.update({
    where: { id: incident.id },
    data: { status: "ACKNOWLEDGED" },
  });

  return updated;
}

async function handleResolveIncident(userId: string, incidentId?: string) {
  if (!incidentId) throw new Error("incidentId is required");

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, Monitor: { userId } },
    select: { id: true, status: true },
  });

  if (!incident) throw new Error("Incident not found");

  const updated = await prisma.incident.update({
    where: { id: incident.id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  return updated;
}

async function handleMonitorStatus(
  userId: string,
  monitorId: string | undefined,
  status: "ACTIVE" | "PAUSED"
) {
  if (!monitorId) throw new Error("monitorId is required");

  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, userId },
    select: { id: true },
  });

  if (!monitor) throw new Error("Monitor not found");

  return prisma.monitor.update({
    where: { id: monitor.id },
    data: { status },
  });
}

async function handleCreateMonitor(
  userId: string,
  data: Record<string, unknown> | undefined
) {
  const name = data?.name as string | undefined;
  const url = data?.url as string | undefined;
  const timeout = Number(data?.timeout ?? 30);
  const checkInterval = Number(data?.checkInterval ?? 300);
  const expectedStatusCodes = (data?.expectedStatusCodes as
    | number[]
    | undefined) ?? [200, 201, 202, 204];
  const escalationPolicyId = data?.escalationPolicyId as string | undefined;

  if (!name || !url) throw new Error("name and url are required");

  return prisma.monitor.create({
    data: {
      name,
      url,
      timeout,
      checkInterval,
      expectedStatusCodes,
      userId,
      escalationPolicyId: escalationPolicyId || undefined,
    },
  });
}

async function handleDeleteMonitor(userId: string, monitorId?: string) {
  if (!monitorId) throw new Error("monitorId is required");

  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, userId },
    select: { id: true },
  });
  if (!monitor) throw new Error("Monitor not found");

  await prisma.monitor.delete({ where: { id: monitor.id } });
  return { deleted: true, monitorId };
}

async function handleCreateEscalationPolicy(
  userId: string,
  data: Record<string, unknown> | undefined
) {
  const name = data?.name as string | undefined;
  const levels =
    (data?.levels as Array<Record<string, unknown>> | undefined) ?? [];

  if (!name) throw new Error("name is required");

  const policy = await prisma.escalationPolicy.create({
    data: {
      name,
      userId,
      enabled: true,
      levels: {
        create: levels.map((lvl, index) => ({
          levelOrder: Number(lvl.levelOrder ?? index + 1),
          waitMinutes: Number(lvl.waitMinutes ?? 5),
          contacts: (lvl.contacts as string[] | undefined) ?? [],
          channel:
            (lvl.channel as "EMAIL" | "SLACK" | "WEBHOOK" | undefined) ??
            "EMAIL",
          name: (lvl.name as string | undefined) ?? undefined,
          message: (lvl.message as string | undefined) ?? undefined,
          slackChannels:
            (lvl.slackChannels as Prisma.InputJsonValue | undefined) ??
            undefined,
        })),
      },
    },
    include: { levels: true },
  });

  return policy;
}

async function handleRemoveEscalationPolicy(
  userId: string,
  escalationPolicyId?: string
) {
  if (!escalationPolicyId) throw new Error("escalationPolicyId is required");

  const policy = await prisma.escalationPolicy.findFirst({
    where: { id: escalationPolicyId, userId },
    select: { id: true },
  });
  if (!policy) throw new Error("Escalation policy not found");

  // Detach from monitors before delete
  await prisma.monitor.updateMany({
    where: { escalationPolicyId: policy.id, userId },
    data: { escalationPolicyId: null },
  });

  await prisma.escalationPolicy.delete({ where: { id: policy.id } });
  return { deleted: true, escalationPolicyId };
}

async function handleEditEscalationPolicy(
  userId: string,
  escalationPolicyId: string | undefined,
  data: Record<string, unknown> | undefined
) {
  if (!escalationPolicyId) throw new Error("escalationPolicyId is required");

  const policy = await prisma.escalationPolicy.findFirst({
    where: { id: escalationPolicyId, userId },
    select: { id: true },
  });
  if (!policy) throw new Error("Escalation policy not found");

  const name = data?.name as string | undefined;
  const enabled = data?.enabled as boolean | undefined;
  const levels =
    (data?.levels as Array<Record<string, unknown>> | undefined) ?? null;

  const updated = await prisma.escalationPolicy.update({
    where: { id: policy.id },
    data: {
      ...(name ? { name } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    },
  });

  if (levels) {
    // Replace levels
    await prisma.escalationLevel.deleteMany({
      where: { escalationId: policy.id },
    });
    await prisma.escalationLevel.createMany({
      data: levels.map((lvl, index) => ({
        escalationId: policy.id,
        levelOrder: Number(lvl.levelOrder ?? index + 1),
        waitMinutes: Number(lvl.waitMinutes ?? 5),
        contacts: (lvl.contacts as string[] | undefined) ?? [],
        channel:
          (lvl.channel as "EMAIL" | "SLACK" | "WEBHOOK" | undefined) ?? "EMAIL",
        name: (lvl.name as string | undefined) ?? null,
        message: (lvl.message as string | undefined) ?? null,
        slackChannels:
          (lvl.slackChannels as Prisma.InputJsonValue | undefined) ?? undefined,
      })),
      skipDuplicates: false,
    });
  }

  return updated;
}

async function handleViewIncidentTimeline(userId: string, incidentId?: string) {
  if (!incidentId) throw new Error("incidentId is required");

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, Monitor: { userId } },
    select: { id: true },
  });
  if (!incident) throw new Error("Incident not found");

  const events = await prisma.timelineEvent.findMany({
    where: { incidentId: incident.id },
    orderBy: { createdAt: "asc" },
    include: {
      escalationLog: {
        include: {
          Alert: true,
          escalationLevel: true,
        },
      },
      user: { select: { id: true, walletAddress: true } },
    },
  });

  return events;
}

export const POST = withAuth(async (req: NextRequest, user, _session) => {
  try {
    const body = (await req.json()) as ActionBody;
    const { actionType, actionData } = body;

    if (!actionType) {
      return NextResponse.json(
        { error: "actionType is required" },
        { status: 400 }
      );
    }

    let result: unknown;

    switch (actionType) {
      case "acknowledge_incident":
        result = await handleAcknowledgeIncident(
          user.id,
          actionData?.incidentId as string | undefined
        );
        break;
      case "resolve_incident":
        result = await handleResolveIncident(
          user.id,
          actionData?.incidentId as string | undefined
        );
        break;
      case "create_monitor":
        result = await handleCreateMonitor(user.id, actionData);
        break;
      case "pause_monitor":
        result = await handleMonitorStatus(
          user.id,
          actionData?.monitorId as string | undefined,
          "PAUSED"
        );
        break;
      case "resume_monitor":
        result = await handleMonitorStatus(
          user.id,
          actionData?.monitorId as string | undefined,
          "ACTIVE"
        );
        break;
      case "delete_monitor":
        result = await handleDeleteMonitor(
          user.id,
          actionData?.monitorId as string | undefined
        );
        break;
      case "create_escalation_policy":
        result = await handleCreateEscalationPolicy(user.id, actionData);
        break;
      case "remove_escalation_policy":
        result = await handleRemoveEscalationPolicy(
          user.id,
          actionData?.escalationPolicyId as string | undefined
        );
        break;
      case "edit_escalation_policy":
        result = await handleEditEscalationPolicy(
          user.id,
          actionData?.escalationPolicyId as string | undefined,
          actionData
        );
        break;
      case "view_incident_timeline":
        result = await handleViewIncidentTimeline(
          user.id,
          actionData?.incidentId as string | undefined
        );
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported action type: ${actionType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[assistant actions] error", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
});
