import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const createMonitorSchema = z
  .object({
    name: z.string().min(1),
    url: z.url().min(1),
    timeout: z.number().int().positive().default(30), 
    checkInterval: z.number().int().positive().default(300), 
    expectedStatusCodes: z
      .array(z.number().int())
      .default([200, 201, 202, 204]),
    status: z.enum(["ACTIVE", "PAUSED"]).default("ACTIVE"),
    escalationPolicyId: z.uuid().optional().nullable(),
    
    escalationPolicy: z
      .object({
        name: z.string().min(1),
        levels: z
          .array(
            z.object({
              method: z.enum(["EMAIL", "SLACK", "WEBHOOK"]),
              target: z.string().min(1),
              waitTimeMinutes: z.number().min(0).max(1440),
            })
          )
          .min(1)
          .max(10),
      })
      .optional(),
  })
  .refine((data) => !!data.escalationPolicyId || !!data.escalationPolicy, {
    message:
      "Either escalationPolicyId or escalationPolicy is required to create a monitor",
    path: ["escalationPolicyId"],
  });


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

    const {
      name,
      url,
      timeout,
      checkInterval,
      expectedStatusCodes,
      status,
      escalationPolicyId,
      escalationPolicy,
    } = validation.data;

    const monitor = await prisma.$transaction(async (tx) => {
      let policyId: string | undefined = escalationPolicyId ?? undefined;

      if (!policyId && escalationPolicy) {
        const createdPolicy = await tx.escalationPolicy.create({
          data: {
            name: escalationPolicy.name,
            userId: user.id,
            enabled: true,
          },
        });

        await Promise.all(
          escalationPolicy.levels.map((level, index) =>
            tx.escalationLevel.create({
              data: {
                escalationId: createdPolicy.id,
                levelOrder: index + 1,
                waitMinutes: level.waitTimeMinutes,
                contacts: [level.target],
                channel: level.method,
              },
            })
          )
        );

        policyId = createdPolicy.id;
      }

      if (!policyId) {
        throw new Error("Missing escalation policy after validation");
      }

      const createdMonitor = await tx.monitor.create({
        data: {
          name,
          url,
          userId: user.id,
          timeout,
          checkInterval,
          expectedStatusCodes,
          status,
          escalationPolicyId: policyId,
        },
      });

      return createdMonitor;
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
          escalationPolicyId: monitor.escalationPolicyId ?? null,
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


export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const monitors = await prisma.monitor.findMany({
      where: {
        userId: user.id, 
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    
    const formattedMonitors = monitors.map((monitor) => ({
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      status: monitor.status,
      timeout: monitor.timeout,
      checkInterval: monitor.checkInterval,
      expectedStatusCodes: monitor.expectedStatusCodes,
      createdAt: monitor.createdAt.toISOString(),
      updatedAt: monitor.createdAt.toISOString(), 
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
