import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";
import { z } from "zod";
import { PrismaTransaction } from "@/types/database-operations";
import { EscalationMethod } from "@/types/escalation-policy";

// Validation schema for updating escalation policy
const updateEscalationPolicySchema = z.object({
  name: z
    .string()
    .min(1, "Policy name is required")
    .max(100, "Policy name cannot exceed 100 characters"),
  levels: z
    .array(
      z.object({
        id: z.string().optional(),
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

// GET /api/escalation-policies/[id] - Get single escalation policy
export const GET = withAuth(
  async (
    _req: NextRequest,
    user,
    _session,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;

      if (!id) {
        return NextResponse.json(
          { error: "Escalation policy ID is required" },
          { status: 400 }
        );
      }

      const escalationPolicy = await prisma.escalationPolicy.findFirst({
        where: {
          id,
          userId: user.id, // Direct userId lookup
        },
        include: {
          levels: {
            orderBy: {
              levelOrder: "asc",
            },
          },
        },
      });

      if (!escalationPolicy) {
        return NextResponse.json(
          { error: "Escalation policy not found" },
          { status: 404 }
        );
      }

      // Transform the data to match frontend types
      const transformedPolicy = {
        id: escalationPolicy.id,
        name: escalationPolicy.name,
        userId: escalationPolicy.userId,
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

      return NextResponse.json(transformedPolicy);
    } catch (error) {
      console.error("Error fetching escalation policy:", error);
      return NextResponse.json(
        { error: "Failed to fetch escalation policy" },
        { status: 500 }
      );
    }
  }
);

// PUT /api/escalation-policies/[id] - Update escalation policy
export const PUT = withAuth(
  async (
    req: NextRequest,
    user,
    _session,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;

      if (!id) {
        return NextResponse.json(
          { error: "Escalation policy ID is required" },
          { status: 400 }
        );
      }

      // Parse and validate request body
      const body = await req.json();
      const validation = updateEscalationPolicySchema.safeParse(body);

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

      // Check if policy exists and user has access
      const existingPolicy = await prisma.escalationPolicy.findFirst({
        where: {
          id,
          userId: user.id, // Direct userId lookup
        },
        include: {
          levels: true, // Include existing levels for comparison
        },
      });

      if (!existingPolicy) {
        return NextResponse.json(
          { error: "Escalation policy not found" },
          { status: 404 }
        );
      }

      // Allow updates even when policy is in use by monitors
      // Removed restriction to enable escalation policy updates

      // Update policy and levels in a transaction
      const updatedPolicy = await prisma.$transaction(async (tx: PrismaTransaction) => {
        // Update the escalation policy
        const policy = await tx.escalationPolicy.update({
          where: { id },
          data: {
            name,
            updatedAt: new Date(),
          },
        });

        const existingLevelIds = existingPolicy.levels.map(level => level.id);
        const incomingLevelIds = levels.filter(level => level.id).map(level => level.id);
        
        // Delete levels that are no longer present
        const levelsToDelete = existingLevelIds.filter(existingId => 
          !incomingLevelIds.includes(existingId)
        );
        
        if (levelsToDelete.length > 0) {
          // First delete associated escalation logs to avoid foreign key constraint violation
          await tx.escalationLog.deleteMany({
            where: { escalationLevelId: { in: levelsToDelete } },
          });
          
          // Then delete the escalation levels
          await tx.escalationLevel.deleteMany({
            where: { id: { in: levelsToDelete } },
          });
        }

        // Process each level (update existing or create new)
        const processedLevels = await Promise.all(
          levels.map(async (level: { id?: string; method: EscalationMethod; target: string; slackChannels?: any[]; waitTimeMinutes: number }, index: number) => {
            const levelData = {
              levelOrder: index + 1,
              waitMinutes: level.waitTimeMinutes,
              contacts: [level.target],
              channel: level.method,
              slackChannels: level.slackChannels ? JSON.stringify(level.slackChannels) : undefined,
              name: `Level ${index + 1}`,
              message: `Escalation level ${index + 1} for ${name}`,
            };

            if (level.id && existingLevelIds.includes(level.id)) {
              // Update existing level
              return await tx.escalationLevel.update({
                where: { id: level.id },
                data: levelData,
              });
            } else {
              // Create new level
              return await tx.escalationLevel.create({
                data: {
                  escalationId: id,
                  ...levelData,
                },
              });
            }
          })
        );

        return {
          ...policy,
          levels: processedLevels,
        };
      });

      // Transform response to match frontend types
      const transformedPolicy = {
        id: updatedPolicy.id,
        name: updatedPolicy.name,
        userId: updatedPolicy.userId,
        levels: updatedPolicy.levels.map((level) => ({
          id: level.id,
          order: level.levelOrder,
          method: level.channel.toUpperCase(),
          target: level.contacts[0] || "",
          slackChannels: level.slackChannels ? JSON.parse(level.slackChannels as string) : [],
          waitTimeMinutes: level.waitMinutes,
        })),
        createdAt: updatedPolicy.createdAt,
        updatedAt: updatedPolicy.updatedAt,
      };

      return NextResponse.json({
        message: "Escalation policy updated successfully",
        escalationPolicy: transformedPolicy,
      });
    } catch (error) {
      console.error("Error updating escalation policy:", error);

      if (error instanceof Error) {
        return NextResponse.json(
          {
            error: "Failed to update escalation policy",
            details: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/escalation-policies/[id] - Delete escalation policy
export const DELETE = withAuth(
  async (
    _req: NextRequest,
    user,
    _session,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;

      if (!id) {
        return NextResponse.json(
          { error: "Escalation policy ID is required" },
          { status: 400 }
        );
      }

      // Check if policy exists and user has access
      const existingPolicy = await prisma.escalationPolicy.findFirst({
        where: {
          id,
          userId: user.id, // Direct userId lookup
        },
        include: {
          monitors: true,
        },
      });

      if (!existingPolicy) {
        return NextResponse.json(
          { error: "Escalation policy not found" },
          { status: 404 }
        );
      }

      // Check if policy is in use by any monitors
      if (existingPolicy.monitors.length > 0) {
        return NextResponse.json(
          {
            error: "Cannot delete escalation policy that is in use by monitors",
            monitors: existingPolicy.monitors.map((m) => ({
              id: m.id,
              name: m.name,
            })),
          },
          { status: 400 }
        );
      }

      // Delete policy and its levels in a transaction
      await prisma.$transaction(async (tx: PrismaTransaction) => {
        // Delete levels first
        await tx.escalationLevel.deleteMany({
          where: {
            escalationId: id,
          },
        });

        // Delete policy
        await tx.escalationPolicy.delete({
          where: {
            id,
          },
        });
      });

      return NextResponse.json({
        message: "Escalation policy deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting escalation policy:", error);
      return NextResponse.json(
        { error: "Failed to delete escalation policy" },
        { status: 500 }
      );
    }
  }
);
