import { NextFunction, Request, Response } from "express";
import { prisma } from "db/client";
import { z } from "zod";


const createMonitorSchema = z.object({
  name: z.string().min(1),
  url: z.url().min(1),
  userId: z.string().min(1),
  timeout: z.number().int().positive().default(30), // seconds
  checkInterval: z.number().int().positive().default(300), //seconds hee hain
  expectedStatusCodes: z.array(z.number().int()).default([200, 201, 202, 204]),
  status: z.enum(["ACTIVE","PAUSED", "DISABLED"]).default("ACTIVE"),
});

const patchMonitorSchema = z.object({
  name: z.string().min(1),
  url: z.url().min(1),
  timeout: z.number().int().positive().default(30), // seconds
  checkInterval: z.number().int().positive().default(300), //seconds hee hain
  status: z.enum(["ACTIVE","PAUSED", "DISABLED"]).default("ACTIVE"),
  expectedStatusCodes: z.array(z.number().int()).default([200, 201, 202, 204]),
});

const pauseMonitorSchema = z.object({
  status: z.enum(["ACTIVE","PAUSED", "DISABLED"]).default("PAUSED"),
});


export async function createMonitor(req: Request, res: Response , next: NextFunction) {
  const validation = createMonitorSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ error: validation.error.message });
    return;
  }

  const { name, url, timeout, checkInterval, expectedStatusCodes, status } = validation.data;

  const monitor = await prisma.monitor.create({
    data: {
      name,
      url,
      userId: req.user.id!,
      timeout,
      checkInterval,
      expectedStatusCodes,
      status,
    },
  });

  res.status(201).json({
    message: "Monitor created successfully",
    
    monitor: {
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      status: monitor.status,
      timeout: monitor.timeout,
      checkInterval: monitor.checkInterval,
      expectedStatusCodes: monitor.expectedStatusCodes,

    },
  });
  
}

// for one monitor
export async function getMonitor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { monitorId } = req.params; // Changed from 'id' to 'monitorId' to match route

    const monitor = await prisma.monitor.findUnique({
      where: {
        id: monitorId
      }
    });

    if (!monitor) {
      res.status(404).json({ error: "Monitor not found" });
      return;
    }

    res.status(200).json({
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      status: monitor.status,
      checkInterval: monitor.checkInterval,
      expectedStatusCodes: monitor.expectedStatusCodes,
      createdAt: monitor.createdAt,
    });
  } catch (error) {
    next(error);
  }
}

// for more than one monitor
export async function getMonitors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: userId } = req.user;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return; // Added missing return
    }
    const monitors = await prisma.monitor.findMany({
      where: {
        userId,
      },
    });
    res.status(200).json({ monitors });
  } catch (error) {
    next(error); // Changed to use next(error) instead of manual error response
  }
}

// pause monitor 
export async function pauseMonitor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { monitorId } = req.params;
    if (!monitorId) {
      res.status(400).json({ error: "Monitor ID is required" });
      return; // Added missing return
    }

    const validation = pauseMonitorSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.message });
      return; // Added missing return
    }

    // Check if the monitor exists and belongs to the user
    const existingMonitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: req.user.id,
      },
    });

    if (!existingMonitor) {
      res.status(404).json({ error: "Monitor not found" });
      return; // Added missing return
    }

    const pausedMonitor = await prisma.monitor.update({
      where: {
        id: monitorId,
      },
      data: {
        status: validation.data.status, // Use validated status instead of hardcoded "PAUSED"
      },
    });

    res.status(200).json({
      message: "Monitor updated successfully", // Changed message to be more generic
      monitor: {
        id: pausedMonitor.id,
        name: pausedMonitor.name,
        status: pausedMonitor.status,
      },
    });
  } catch (error) {
    next(error); // Added proper error handling
  }
} 



export async function patchMonitor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { monitorId } = req.params;

    if (!monitorId) {
      res.status(400).json({ error: "Monitor ID is required" });
      return;
    }

    const validation = patchMonitorSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.message });
      return;
    }

    const { name, url, timeout, checkInterval, status, expectedStatusCodes } = validation.data;

    const existingMonitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: req.user.id,
      },
    });

    if (!existingMonitor) {
      res.status(404).json({ error: "Monitor not found" });
      return; 
    }

    const updatedMonitor = await prisma.monitor.update({
      where: {
        id: monitorId,
      },
      data: {
        name,
        url,
        timeout,
        checkInterval,
        expectedStatusCodes,
        status,
      },
    });

    res.status(200).json({
      message: "Monitor updated successfully",
      monitor: {
        id: updatedMonitor.id,
        name: updatedMonitor.name,
        url: updatedMonitor.url,
        status: updatedMonitor.status,
        timeout: updatedMonitor.timeout,
        checkInterval: updatedMonitor.checkInterval,
        expectedStatusCodes: updatedMonitor.expectedStatusCodes,
        createdAt: updatedMonitor.createdAt,
      },
    });
  } catch (error) {
      next(error); 
  }
}

export async function deleteMonitor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { monitorId } = req.params;
    
    if (!monitorId) {
      res.status(400).json({ error: "Monitor ID is required" });
      return;
    }

    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      res.status(404).json({ error: "Monitor not found" });
      return;
    }
    
    await prisma.monitor.delete({
      where: { id: monitorId },
    });
    
    res.status(200).json({ message: "Monitor deleted successfully" });
    // Remove the return statement here
  } catch (error) {
    next(error);
  }
}