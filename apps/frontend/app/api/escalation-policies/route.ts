import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

// Validation schema for creating escalation policy
const createEscalationPolicySchema = z.object({
  name: z
    .string()
    .min(1, "Policy name is required")
    .max(100, "Policy name cannot exceed 100 characters"),
  levels: z
    .array(
      z.object({
        method: z.enum(["email", "slack", "webhook"]),
        target: z.string().min(1, "Target is required"),
        waitTimeMinutes: z
          .number()
          .min(0, "Wait time cannot be negative")
          .max(1440, "Wait time cannot exceed 24 hours"),
      })
    )
    .min(1, "At least one escalation level is required")
    .max(10, "Cannot have more than 10 escalation levels"),
});

// Map frontend escalation method to database channel enum
function mapMethodToChannel(method: string) {
  switch (method) {
    case "email":
      return "EMAIL";
    case "slack":
      return "SLACK";
    case "webhook":
      return "WEBHOOK";
    default:
      throw new Error(`Invalid escalation method: ${method}`);
  }
}

// Map database channel enum to frontend method
function mapChannelToMethod(channel: string) {
  switch (channel) {
    case "EMAIL":
      return "email";
    case "SLACK":
      return "slack";
    case "WEBHOOK":
      return "webhook";
    default:
      throw new Error(`Invalid escalation channel: ${channel}`);
  }
}

// GET /api/escalation-policies - Get all escalation policies for user
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const escalationPolicies = await prisma.escalationPolicy.findMany({
      where: {
        userId: user.id, // Direct userId lookup
      },
      include: {
        levels: {
          orderBy: {
            levelOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to match frontend types
    const transformedPolicies = escalationPolicies.map((policy: any) => ({
      id: policy.id,
      name: policy.name,
      userId: policy.userId,
      levels: policy.levels.map((level: any) => ({
        id: level.id,
        order: level.levelOrder,
        method: mapChannelToMethod(level.channel),
        target: level.contacts[0] || "", // Take first contact for now
        waitTimeMinutes: level.waitMinutes,
      })),
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));

    return NextResponse.json({ escalationPolicies: transformedPolicies });
  } catch (error) {
    console.error("Error fetching escalation policies:", error);
    return NextResponse.json(
      { error: "Failed to fetch escalation policies" },
      { status: 500 }
    );
  }
});

// POST /api/escalation-policies - Create new escalation policy
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const validation = createEscalationPolicySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, levels } = validation.data;

    // Create escalation policy with levels in a transaction
    const escalationPolicy = await prisma.$transaction(async (tx: any) => {
      // Create the escalation policy
      const policy = await tx.escalationPolicy.create({
        data: {
          name,
          userId: user.id, // Associate with authenticated user
          enabled: true,
        },
      });

      // Create escalation levels
      const createdLevels = await Promise.all(
        levels.map((level: any, index: number) =>
          tx.escalationLevel.create({
            data: {
              escalationId: policy.id,
              levelOrder: index + 1, // 1-based ordering
              waitMinutes: level.waitTimeMinutes,
              contacts: [level.target], // Store as array
              channel: mapMethodToChannel(level.method),
              name: `Level ${index + 1}`,
              message: `Escalation level ${index + 1} for ${name}`,
            },
          })
        )
      );

      return {
        ...policy,
        levels: createdLevels,
      };
    });

    // Transform response to match frontend types
    const transformedPolicy = {
      id: escalationPolicy.id,
      name: escalationPolicy.name,
      userId: user.id,
      levels: escalationPolicy.levels.map((level: any) => ({
        id: level.id,
        order: level.levelOrder,
        method: mapChannelToMethod(level.channel),
        target: level.contacts[0] || "",
        waitTimeMinutes: level.waitMinutes,
      })),
      createdAt: escalationPolicy.createdAt,
      updatedAt: escalationPolicy.updatedAt,
    };

    return NextResponse.json(
      {
        message: "Escalation policy created successfully",
        escalationPolicy: transformedPolicy,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating escalation policy:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Failed to create escalation policy", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
