import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";

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

// GET /api/escalation-policies/[id] - Get single escalation policy
export const GET = withAuth(
  async (
    req: NextRequest,
    user,
    session,
    { params }: { params: { id: string } }
  ) => {
    try {
      const { id } = params;

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
          method: mapChannelToMethod(level.channel),
          target: level.contacts[0] || "",
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
    session,
    { params }: { params: { id: string } }
  ) => {
    try {
      const { id } = params;

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
      });

      if (!existingPolicy) {
        return NextResponse.json(
          { error: "Escalation policy not found" },
          { status: 404 }
        );
      }

      // For now, return method not implemented
      // This would require more complex logic to handle level updates
      return NextResponse.json(
        { error: "Update functionality not yet implemented" },
        { status: 501 }
      );
    } catch (error) {
      console.error("Error updating escalation policy:", error);
      return NextResponse.json(
        { error: "Failed to update escalation policy" },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/escalation-policies/[id] - Delete escalation policy
export const DELETE = withAuth(
  async (
    req: NextRequest,
    user,
    session,
    { params }: { params: { id: string } }
  ) => {
    try {
      const { id } = params;

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
      await prisma.$transaction(async (tx: any) => {
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
