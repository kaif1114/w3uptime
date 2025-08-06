import { NextFunction, Request, Response } from "express";
import { prisma } from "db/client";
import { z } from "zod";

const createIncidentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "MAINTENANCE"]).default("MINOR"),
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED", "POSTMORTEM"]).default("INVESTIGATING"),
  monitorId: z.string().min(1),
  escalated: z.boolean().default(false),
});

const updateIncidentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "MAINTENANCE"]).optional(),
  status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED", "POSTMORTEM"]).optional(),
  escalated: z.boolean().optional(),
  downtime: z.number().int().positive().optional(),
});

// 1. Create new incident
export async function createIncident(req: Request, res: Response, next: NextFunction) {
  const validation = createIncidentSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ error: validation.error.message });
    return;
  }

  const { title, description, severity, status, monitorId, escalated } = validation.data;

  try {
    // Check if monitor exists and belongs to user
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: req.user.id,
      },
    });

    if (!monitor) {
      res.status(404).json({ error: "Monitor not found" });
      return;
    }

    // No unique constraint check needed - multiple incidents allowed per monitor
    const incident = await prisma.incident.create({
      data: {
        title,
        description,
        severity,
        status,
        monitorId,
        escalated,
      },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Incident created successfully",
      incident,
    });
  } catch (error) {
    next(error);
  }
}

// 2. Get all incidents (with optional monitor filter)
export async function getIncidents(req: Request, res: Response) {
  const { monitorId } = req.query;

  try {
    const whereClause: any = {
      monitor: {
        userId: req.user.id,
      },
    };

    if (monitorId) {
      whereClause.monitorId = monitorId as string;
    }

    const incidents = await prisma.incident.findMany({
      where: whereClause,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        postmortem: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({ incidents });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
}

// 3. Delete incident
export async function deleteIncident(req: Request, res: Response) {
  const { incidentId } = req.params;

  if (!incidentId) {
    res.status(400).json({ error: "Incident ID is required" });
    return;
  }

  try {
    const incident = await prisma.incident.findFirst({
      where: {
        id: incidentId,
        monitor: {
          userId: req.user.id,
        },
      },
    });

    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }

    await prisma.incident.delete({
      where: {
        id: incidentId,
      },
    });

    res.status(200).json({ message: "Incident deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete incident" });
  }
}

// 4. Update incident
export async function updateIncident(req: Request, res: Response) {
  const { incidentId } = req.params;

  if (!incidentId) {
    res.status(400).json({ error: "Incident ID is required" });
    return;
  }

  const validation = updateIncidentSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ error: validation.error.message });
    return;
  }

  try {
    const existingIncident = await prisma.incident.findFirst({
      where: {
        id: incidentId,
        monitor: {
          userId: req.user.id,
        },
      },
    });

    if (!existingIncident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }

    const updateData: any = { ...validation.data };

    // Auto-set resolvedAt when status changes to RESOLVED
    if (validation.data.status === "RESOLVED" && existingIncident.status !== "RESOLVED") {
      updateData.resolvedAt = new Date();
      
      if (!validation.data.downtime) {
        const downtimeSeconds = Math.floor(
          (new Date().getTime() - existingIncident.createdAt.getTime()) / 1000
        );
        updateData.downtime = downtimeSeconds;
      }
    }

    const updatedIncident = await prisma.incident.update({
      where: {
        id: incidentId,
      },
      data: updateData,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        postmortem: true,
      },
    });

    res.status(200).json({
      message: "Incident updated successfully",
      incident: updatedIncident,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update incident" });
  }
}