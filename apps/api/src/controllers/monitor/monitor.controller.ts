import { Request, Response } from "express";
import { prisma } from "db/client";
import { z } from "zod";

const createMonitorSchema = z.object({
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
