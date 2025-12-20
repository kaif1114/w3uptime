import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

const createAlertSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  triggerStatusCode: z.number().int().optional(),
  expectedStatusCode: z.number().int().optional(),
  triggeredAt: z.date().default(new Date()),
  monitorId: z.string().min(1).optional(), 
  status: z.enum(["PENDING", "SENT", "ACKNOWLEDGED", "RESOLVED"]).default("PENDING"),
});



export const GET = withAuth(async (req: NextRequest, user) =>
{
  const body = await req.json();
  const validation = createAlertSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: 400 }
    );
  }

  try {
    const whereClause: Prisma.AlertWhereInput = {
      monitor: {
        userId: user.id,  
      },
    };

    
    const targetMonitorId = validation.data.monitorId || user.id;
    whereClause.monitorId = targetMonitorId;

    

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: {
        triggeredAt: 'desc',
      },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
});


export const POST = withAuth(async (req: NextRequest, user) =>
{
  const body = await req.json();
  const validation = createAlertSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: 400 }
    );
  } 

  try{
    const { title, message, severity, triggerStatusCode, expectedStatusCode } = validation.data;
    const monitorId = validation.data.monitorId || user.id;
    
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: user.id,
      },
    });

    if (!monitor) {
      return NextResponse.json(
        { error: `Monitor not found with ID: ${monitorId}` },
        { status: 404 }
      );
    }

    
    const alert = await prisma.alert.create({
      data: {
        title,
        message,
        triggerStatusCode,
        expectedStatusCode,
        monitorId,
        
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

    
    

    return NextResponse.json(
      {
        message: "Alert sent successfully",
        alert,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
});
