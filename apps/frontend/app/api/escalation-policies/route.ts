import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { WhereClause, OrderByClause, DbEscalationPolicyWithLevels, DbEscalationLevel, PrismaTransaction } from "@/types/DatabaseOperation";
import { EscalationMethod } from "@/types/EscalationPolicy";

interface SlackChannelConfig {
  teamId: string;
  teamName: string;
  defaultChannelId: string;
  defaultChannelName: string;
}

interface EscalationLevelInput {
  method: EscalationMethod;
  target: string;
  slackChannels?: SlackChannelConfig[];
  waitTimeMinutes: number;
}



const createEscalationPolicySchema = z.object({
  name: z.string()
    .min(1, "Policy name is required")
    .max(100, "Policy name cannot exceed 100 characters"),
  levels: z
    .array(
      z.object({
        method: z.enum(["EMAIL", "SLACK", "WEBHOOK"]),
        target: z.string(),
        slackChannels: z.array(z.object({
          teamId: z.string(),
          teamName: z.string(),
          defaultChannelId: z.string(),
          defaultChannelName: z.string(),
        })).optional(),
        waitTimeMinutes: z
          .number()
          .min(0, "Wait time cannot be negative")
          .max(1440, "Wait time cannot exceed 24 hours"),
      })
      .refine((level) => {
        if (level.method === "SLACK") {
          return level.slackChannels && level.slackChannels.length > 0;
        }
        return level.target && level.target.trim().length > 0;
      }, "Target or Slack channels are required")
    )
    .min(1, "At least one escalation level is required")
    .max(10, "Cannot have more than 10 escalation levels"),
});


export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    
    const offset = (page - 1) * limit;

    
    const whereClause: WhereClause = {
      userId: user.id,
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    
    const orderByClause: OrderByClause = {};
    const order = (sortOrder === "asc" || sortOrder === "desc") ? sortOrder : "desc";
    if (sortBy === "name") {
      orderByClause.name = order;
    } else if (sortBy === "createdAt") {
      orderByClause.createdAt = order;
    } else if (sortBy === "updatedAt") {
      orderByClause.updatedAt = order;
    } else {
      orderByClause.createdAt = "desc"; 
    }

    
    const totalCount = await prisma.escalationPolicy.count({
      where: whereClause,
    });

    
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

    
    const transformedPolicies = escalationPolicies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      userId: policy.userId,
      enabled: policy.enabled,
      levels: policy.levels.map((level) => ({
        id: level.id,
        order: level.levelOrder,
        method: level.channel.toLowerCase(),
        target: level.contacts[0] || "", 
        slackChannels: level.slackChannels ? JSON.parse(level.slackChannels as string) : [],
        waitTimeMinutes: level.waitMinutes,
      })),
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));

    
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

    
    const escalationPolicy = await prisma.$transaction(async (tx: PrismaTransaction) => {
      
      const policy = await tx.escalationPolicy.create({
        data: {
          name,
          userId: user.id, 
          enabled: true,
        },
      });

      
      const createdLevels = await Promise.all(
        levels.map((level: EscalationLevelInput, index: number) =>
          tx.escalationLevel.create({
            data: {
              escalationId: policy.id,
              levelOrder: index + 1, 
              waitMinutes: level.waitTimeMinutes,
              contacts: [level.target], 
              channel: level.method.toUpperCase() as "EMAIL" | "SLACK" | "WEBHOOK",
              slackChannels: level.slackChannels ? JSON.stringify(level.slackChannels) : undefined,
            },
          })
        )
      );

      return {
        ...policy,
        levels: createdLevels,
      };
    });

    
    const transformedPolicy = {
      id: escalationPolicy.id,
      name: escalationPolicy.name,
      userId: user.id,
      levels: escalationPolicy.levels.map((level) => ({
        id: level.id,
        order: level.levelOrder,
        method: level.channel.toUpperCase(),
        target: level.contacts[0] || "",
        slackChannels: level.slackChannels ? JSON.parse(level.slackChannels as string) : [],
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

    
    const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
      
      await tx.escalationLog.deleteMany({
        where: {
          escalationLevel: {
            escalationId: { in: ids },
          },
        },
      });

      
      await tx.escalationLevel.deleteMany({
        where: {
          escalationId: { in: ids },
        },
      });

      
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
