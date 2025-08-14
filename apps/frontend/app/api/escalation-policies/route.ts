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
        method: z.enum(["EMAIL", "SLACK", "WEBHOOK"]),
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

// GET /api/escalation-policies - Get escalation policies for user with pagination and search
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where clause with search
    const whereClause: any = {
      userId: user.id,
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Build order by clause
    const orderByClause: any = {};
    if (sortBy === "name") {
      orderByClause.name = sortOrder;
    } else if (sortBy === "createdAt") {
      orderByClause.createdAt = sortOrder;
    } else if (sortBy === "updatedAt") {
      orderByClause.updatedAt = sortOrder;
    } else {
      orderByClause.createdAt = "desc"; // Default
    }

    // Get total count for pagination
    const totalCount = await prisma.escalationPolicy.count({
      where: whereClause,
    });

    // Get paginated policies
    const escalationPolicies = await prisma.escalationPolicy.findMany({
      where: whereClause,
      include: {
        levels: {
          orderBy: {
            levelOrder: "asc",
          },
        },
      },
      orderBy: orderByClause,
      skip: offset,
      take: limit,
    });

    // Transform the data to match frontend types
    const transformedPolicies = escalationPolicies.map((policy: any) => ({
      id: policy.id,
      name: policy.name,
      userId: policy.userId,
      enabled: policy.enabled,
      levels: policy.levels.map((level: any) => ({
        id: level.id,
        order: level.levelOrder,
        method: level.channel.toLowerCase(),
        target: level.contacts[0] || "", // Take first contact for now
        waitTimeMinutes: level.waitMinutes,
      })),
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      escalationPolicies: transformedPolicies,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      search,
      sortBy,
      sortOrder,
    });
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
          details: validation.error.message,
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
              channel: level.method.toUpperCase(),
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
        method: level.channel.toUpperCase(),
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

// DELETE /api/escalation-policies - Bulk delete escalation policies
export const DELETE = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Policy IDs are required" },
        { status: 400 }
      );
    }

    // Verify all policies belong to the user and are not in use
    const policies = await prisma.escalationPolicy.findMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
      include: {
        monitors: true,
      },
    });

    if (policies.length !== ids.length) {
      return NextResponse.json(
        { error: "Some policies not found or access denied" },
        { status: 404 }
      );
    }

    // Check if any policies are in use by monitors
    const policiesInUse = policies.filter(
      (policy) => policy.monitors.length > 0
    );
    if (policiesInUse.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete policies that are in use by monitors",
          policiesInUse: policiesInUse.map((p) => ({
            id: p.id,
            name: p.name,
            monitorCount: p.monitors.length,
          })),
        },
        { status: 400 }
      );
    }

    // Delete policies and their levels in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Delete escalation levels first (due to foreign key constraints)
      await tx.escalationLevel.deleteMany({
        where: {
          escalationId: { in: ids },
        },
      });

      // Delete escalation policies
      const deletedPolicies = await tx.escalationPolicy.deleteMany({
        where: {
          id: { in: ids },
          userId: user.id,
        },
      });

      return deletedPolicies;
    });

    return NextResponse.json({
      message: `Successfully deleted ${result.count} escalation policies`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error deleting escalation policies:", error);
    return NextResponse.json(
      { error: "Failed to delete escalation policies" },
      { status: 500 }
    );
  }
});
