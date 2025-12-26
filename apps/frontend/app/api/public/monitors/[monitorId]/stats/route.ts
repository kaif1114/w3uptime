import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ monitorId: string }> }
) => {
  try {
    const { monitorId } = await context.params;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'day';

    // Validate period
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Use: day, week, or month" },
        { status: 400 }
      );
    }

    // Check if monitor exists and is in a published status page
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
      },
      select: {
        id: true,
        lastCheckedAt: true,
        statusPageSections: {
          where: {
            statusPage: {
              isPublished: true,
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!monitor || monitor.statusPageSections.length === 0) {
      return NextResponse.json(
        { error: "Monitor not found or not public" },
        { status: 404 }
      );
    }

    // Call the PostgreSQL function to get real stats
    const stats = await prisma.$queryRaw<Array<{
      total_checks: bigint;
      successful_checks: bigint;
      failed_checks: bigint;
      uptime_percentage: number;
      avg_response_time: number;
      min_response_time: number;
      max_response_time: number;
      p95_response_time: number;
    }>>`
      SELECT * FROM get_monitor_stats(${monitorId}::uuid, ${period}::text)
    `;

    const stat = stats[0];

    if (!stat) {
      // No data available yet - return zeros/nulls
      return NextResponse.json({
        monitorId,
        period,
        uptime: 0,
        responseTime: null,
        lastChecked: monitor.lastCheckedAt?.toISOString() || null,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
      });
    }

    return NextResponse.json({
      monitorId,
      period,
      uptime: Number(stat.uptime_percentage),
      responseTime: Number(stat.avg_response_time),
      lastChecked: monitor.lastCheckedAt?.toISOString() || null,
      totalChecks: Number(stat.total_checks),
      successfulChecks: Number(stat.successful_checks),
      failedChecks: Number(stat.failed_checks),
      minResponseTime: Number(stat.min_response_time),
      maxResponseTime: Number(stat.max_response_time),
      p95ResponseTime: Number(stat.p95_response_time),
    });
  } catch (error) {
    console.error("Error fetching public monitor stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
