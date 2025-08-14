import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";

// Type assertion to help TypeScript understand Prisma client
const db = prisma as any;

// Test user ID for Postman testing (matching other test APIs)
const TEST_USER_ID = "user-123";

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
          .min(1, "Wait time must be at least 1 minute")
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

// GET /api/escalation-policies/test - Get all escalation policies for test user
export async function GET(req: NextRequest) {
  try {
    const escalationPolicies = await db.escalationPolicy.findMany({
      where: {
        userId: TEST_USER_ID, // Use test user ID
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
        target: level.contacts[0] || "",
        waitTimeMinutes: level.waitMinutes,
      })),
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      escalationPolicies: transformedPolicies,
      message: `Found ${transformedPolicies.length} escalation policies for test user`,
    });
  } catch (error) {
    console.error("Error fetching escalation policies:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch escalation policies",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/escalation-policies/test - Create new escalation policy for test user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createEscalationPolicySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, levels } = validation.data;

    // Create escalation policy with levels in a transaction
    const escalationPolicy = await db.$transaction(async (tx: any) => {
      // Create the escalation policy
      const policy = await tx.escalationPolicy.create({
        data: {
          name,
          userId: TEST_USER_ID, // Use test user ID
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
      userId: TEST_USER_ID,
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
        success: true,
        message: "Escalation policy created successfully",
        escalationPolicy: transformedPolicy,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating escalation policy:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create escalation policy",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/escalation-policies/test - Delete all test escalation policies
export async function DELETE(req: NextRequest) {
  try {
    // Delete all escalation policies for test user
    const deletedPolicies = await db.$transaction(async (tx: any) => {
      // First get all policies for test user
      const policies = await tx.escalationPolicy.findMany({
        where: {
          userId: TEST_USER_ID,
        },
        include: {
          levels: true,
        },
      });

      // Delete all levels first
      for (const policy of policies) {
        await tx.escalationLevel.deleteMany({
          where: {
            escalationId: policy.id,
          },
        });
      }

      // Then delete all policies
      const result = await tx.escalationPolicy.deleteMany({
        where: {
          userId: TEST_USER_ID,
        },
      });

      return result;
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedPolicies.count} escalation policies for test user`,
      deletedCount: deletedPolicies.count,
    });
  } catch (error) {
    console.error("Error deleting escalation policies:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete escalation policies",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
