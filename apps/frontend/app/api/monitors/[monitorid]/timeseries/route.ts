import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const timeseriesQuerySchema = z.object({
  period: z.enum(["hour", "day", "week", "month"]).default("day"),
});

// GET /api/monitors/[monitorid]/timeseries - Get time series data for charts
export const GET = withAuth(
  async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ monitorid: string }> }
  ) => {
    try {
      const { monitorid } = await params;
      const { searchParams } = new URL(req.url);

      const validation = timeseriesQuerySchema.safeParse({
        period: searchParams.get("period") || "day",
      });

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }

      const { period } = validation.data;

      // Verify monitor ownership
      const monitor = await prisma.monitor.findFirst({
        where: {
          id: monitorid,
          userId: user.id,
        },
      });

      if (!monitor) {
        return NextResponse.json(
          { error: "Monitor not found" },
          { status: 404 }
        );
      }

      // Get time series data directly from materialized views to avoid dependency on DB function
      const periodConfig: Record<string, { view: string; interval: string }> = {
        hour: { view: "monitor_tick_5min", interval: "1 hour" },
        day: { view: "monitor_tick_5min", interval: "24 hours" },
        week: { view: "monitor_tick_30min", interval: "7 days" },
        month: { view: "monitor_tick_2hour", interval: "30 days" },
      } as const;

      const { view, interval } = periodConfig[period];

      const query = `
      SELECT 
        time_bucket::timestamptz AS timestamp_bucket,
        ROUND(avg_latency::numeric, 2) AS avg_latency,
        ROUND(min_latency::numeric, 2) AS min_latency,
        ROUND(max_latency::numeric, 2) AS max_latency,
        ROUND(median_latency::numeric, 2) AS median_latency,
        ROUND(p95_latency::numeric, 2) AS p95_latency,
        total_ticks,
        successful_ticks,
        CASE 
          WHEN total_ticks > 0 
            THEN ROUND((successful_ticks::numeric / total_ticks::numeric) * 100, 2)
          ELSE 0
        END AS success_rate
      FROM ${view}
      WHERE "monitorId"::text = $1::text
        AND time_bucket >= NOW() - INTERVAL '${interval}'
        AND time_bucket <= NOW()
      ORDER BY time_bucket ASC
    `;

      const timeseriesData = await prisma.$queryRawUnsafe(query, monitorid);

      // Transform TimescaleDB data to match frontend types
      const transformTimeSeriesData = (rawData: any[]): any[] => {
        return rawData.map((point) => ({
          time_bucket:
            point.timestamp_bucket instanceof Date
              ? point.timestamp_bucket.toISOString()
              : point.timestamp_bucket,
          avg_latency: Number(point.avg_latency) || 0,
          uptime_percentage: Number(point.success_rate) || 0, // Map success_rate to uptime_percentage
          total_checks: Number(point.total_ticks) || 0, // Map total_ticks to total_checks
        }));
      };

      return NextResponse.json(
        {
          monitorId: monitorid,
          period,
          data: transformTimeSeriesData(timeseriesData as any[]) || [],
          generatedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error fetching monitor timeseries:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
