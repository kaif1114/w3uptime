import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { RawTimeSeriesPoint, TransformedTimeSeriesPoint } from "@/types/analytics";

const timeseriesQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).default('day'),
});

// GET /api/monitors/[monitorid]/timeseries - Get time series data for charts
export const GET = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ monitorid: string }> }
) => {
  try {
    const { monitorid } = await params;
    const { searchParams } = new URL(req.url);
    
    const validation = timeseriesQuerySchema.safeParse({
      period: searchParams.get('period') || 'day',
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

    // Get time series data with explicit type casting
    const timeseriesData = await prisma.$queryRawUnsafe(
      `SELECT * FROM get_monitor_timeseries($1::UUID, $2::TEXT)`, 
      monitorid, 
      period
    );

    // Transform TimescaleDB data to match frontend types
    const transformTimeSeriesData = (rawData: RawTimeSeriesPoint[]): TransformedTimeSeriesPoint[] => {
      return rawData.map(point => ({
        time_bucket: point.timestamp_bucket instanceof Date ? point.timestamp_bucket.toISOString() : point.timestamp_bucket,
        avg_latency: Number(point.avg_latency) || 0,
        uptime_percentage: Number(point.success_rate) || 0, // Map success_rate to uptime_percentage
        total_checks: Number(point.total_ticks) || 0, // Map total_ticks to total_checks
      }));
    };

    return NextResponse.json({
      monitorId: monitorid,
      period,
      data: transformTimeSeriesData(timeseriesData as RawTimeSeriesPoint[]) || [],
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching monitor timeseries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});