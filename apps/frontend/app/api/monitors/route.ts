import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const createMonitorSchema = z.object({
  name: z.string().min(1),
  url: z.url().min(1),
  timeout: z.number().int().positive().default(30), // seconds
  checkInterval: z.number().int().positive().default(300), // seconds
  expectedStatusCodes: z.array(z.number().int()).default([200, 201, 202, 204]),
  status: z.enum(["ACTIVE", "PAUSED", "DISABLED"]).default("ACTIVE"),
});

// POST /api/monitors - Create monitor
export const POST = withAuth(async (req: NextRequest, user) => {
  try { 
    const body = await req.json();
    const validation = createMonitorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { name, url, timeout, checkInterval, expectedStatusCodes, status } = validation.data;

    const monitor = await prisma.monitor.create({
      data: {
        name,
        url,
        userId: user.id, // Use authenticated user's ID
        timeout,
        checkInterval,
        expectedStatusCodes,
        status,
      },
    });

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating monitor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

// GET /api/monitors - Get all monitors for user
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const monitors = await prisma.monitor.findMany({
      where: {
        userId: user.id, // Use authenticated user's ID
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format monitors to match frontend interface
    const formattedMonitors = monitors.map(monitor => ({
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      status: monitor.status,
      timeout: monitor.timeout,
      checkInterval: monitor.checkInterval,
      expectedStatusCodes: monitor.expectedStatusCodes,
      createdAt: monitor.createdAt.toISOString(),
      updatedAt: monitor.createdAt.toISOString(), // Use createdAt since updatedAt doesn't exist
    }));

    return NextResponse.json({
      monitors: formattedMonitors,
      walletAddress: user.walletAddress,
    });
  } catch (error) {
    console.error("Error fetching monitors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
