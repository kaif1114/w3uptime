import { Request, Response } from "express";
import { prisma } from "db/client";
import { z } from "zod";

const createMonitorSchema = z.object({
  name: z.string().min(1),
  url: z.url().min(1),
});

const patchMonitorSchema = z.object({
  name: z.string().min(1),
  url: z.url().min(1),
});

export async function createMonitor(req: Request, res: Response) {
  const validation = createMonitorSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.message });
  }

  const { name, url } = validation.data;

  const monitor = await prisma.monitor.create({
    data: {
      name,
      url,
      userId: req.user.id!,
    },
  });

  return res.status(201).json({
    message: "Monitor created successfully",
    
    monitor: {
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      createdAt: monitor.createdAt,
    },
  });
}

// for one monitor
export async function getMonitor(req: Request, res: Response) {
  const { id } = req.params;

  const monitor = await prisma.monitor.findUnique({
    where: {
      id,
    },
  });

  if (!monitor) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  return res.status(200).json({
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    createdAt: monitor.createdAt,
  });
}

// for more than one monitor
export async function getMonitors(req: Request, res: Response) {
  const { id: userId } = req.user;
  const monitors = await prisma.monitor.findMany({
    where: {
      userId,
    },
  });

  return res.status(200).json({ monitors });
}

export async function patchMonitor(req: Request, res: Response) {
  const { monitorId } = req.params;
  if (!monitorId) {
    return res.status(400).json({ error: "Monitor ID is required" });
  }

  const validation = patchMonitorSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.message });
  }

  const { name, url } = validation.data;

  const monitor = await prisma.monitor.update({
    where: {
      id: monitorId,
      userId: req.user.id,
    },
    data: {
      name,
      url,
    },
  });

  return res.status(200).json({
    message: "Monitor updated successfully",
    monitor: {
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      createdAt: monitor.createdAt,
    },
  });
}

export async function deleteMonitor(req: Request, res: Response) {
  const { monitorId } = req.params;
  if (!monitorId) {
    return res.status(400).json({ error: "Monitor ID is required" });
  }

  const monitor = await prisma.monitor.findUnique({
    where: {
      id: monitorId,
    },
  });

  if (!monitor) {
    return res.status(404).json({ error: "Monitor not found" });
  }
  await prisma.monitor.delete({
    where: {
      id: monitorId,
    },
  });
  return res.status(200).json({ message: "Monitor deleted successfully" });
}
