import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";
import { z } from "zod";
import { PrismaTransaction } from "@/types/DatabaseOperation";
import { EscalationMethod } from "@/types/EscalationPolicy";

interface SlackChannelConfig {
  teamId: string;
  teamName: string;
  defaultChannelId: string;
  defaultChannelName: string;
}

interface EscalationLevelUpdateInput {
  id?: string;
  method: EscalationMethod;
  target: string;
  slackChannels?: SlackChannelConfig[];
  waitTimeMinutes: number;
}


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
          userId: user.id, 
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

      
      const existingPolicy = await prisma.escalationPolicy.findFirst({
        where: {
          id,
          userId: user.id, 
        },
        include: {
          levels: true, 
        },
      });

      if (!existingPolicy) {
        return NextResponse.json(
          { error: "Escalation policy not found" },
          { status: 404 }
        );
      }

      
      

      
      const updatedPolicy = await prisma.$transaction(async (tx: PrismaTransaction) => {
        
        const policy = await tx.escalationPolicy.update({
          where: { id },
          data: {
            name,
            updatedAt: new Date(),
          },
        });

        const existingLevelIds = existingPolicy.levels.map(level => level.id);
        const incomingLevelIds = levels.filter(level => level.id).map(level => level.id);
        
        
        const levelsToDelete = existingLevelIds.filter(existingId => 
          !incomingLevelIds.includes(existingId)
        );
        
        if (levelsToDelete.length > 0) {
          
          await tx.escalationLog.deleteMany({
            where: { escalationLevelId: { in: levelsToDelete } },
          });
          
          
          await tx.escalationLevel.deleteMany({
            where: { id: { in: levelsToDelete } },
          });
        }

        
        const processedLevels = await Promise.all(
          levels.map(async (level: EscalationLevelUpdateInput, index: number) => {
            const levelData = {
              levelOrder: index + 1,
              waitMinutes: level.waitTimeMinutes,
              contacts: [level.target],
              channel: level.method,
              slackChannels: level.slackChannels ? JSON.stringify(level.slackChannels) : undefined,
            };

            if (level.id && existingLevelIds.includes(level.id)) {
              
              return await tx.escalationLevel.update({
                where: { id: level.id },
                data: levelData,
              });
            } else {
              
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

      
      const existingPolicy = await prisma.escalationPolicy.findFirst({
        where: {
          id,
          userId: user.id, 
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

      
      await prisma.$transaction(async (tx: PrismaTransaction) => {
        
        await tx.escalationLevel.deleteMany({
          where: {
            escalationId: id,
          },
        });

        
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
