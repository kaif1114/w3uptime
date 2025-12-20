import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { EnhancedTimeSeriesPoint, RegionalTimeSeriesResponse } from "@/types/analytics";

const querySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'custom']).default('day'),
  regionType: z.enum(['continent', 'country']),
  regionCode: z.string().min(1),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
}).refine((data) => {
  if (data.period !== 'custom') return true;
  return !!data.start && !!data.end;
}, { message: 'Custom period requires start and end query params' });


export const GET = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ monitorid: string }> }
) => {
  try {
    const { monitorid } = await params;
    const { searchParams } = new URL(req.url);

    const validation = querySchema.safeParse({
      period: searchParams.get('period') || 'day',
      regionType: searchParams.get('regionType'),
      regionCode: searchParams.get('regionCode'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { period, regionType, regionCode, start, end } = validation.data;

    
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

    const rows = period === 'custom'
      ? await prisma.$queryRawUnsafe(
          `SELECT * FROM get_monitor_regional_timeseries_range($1::UUID, $2::TEXT, $3::TEXT, $4::TIMESTAMPTZ, $5::TIMESTAMPTZ)`,
          monitorid,
          regionType,
          regionCode,
          start as string,
          end as string,
        )
      : await prisma.$queryRawUnsafe(
          `SELECT * FROM get_monitor_regional_timeseries($1::UUID, $2::TEXT, $3::TEXT, $4::TEXT)`,
          monitorid,
          regionType,
          regionCode,
          period
        );

    type RawRow = {
      timestamp_bucket: Date | string;
      avg_latency: number | string;
      min_latency: number | string;
      max_latency: number | string;
      median_latency: number | string;
      p95_latency: number | string;
      total_ticks: bigint | number | string;
      successful_ticks: bigint | number | string;
      success_rate: number | string;
    };

    const data: EnhancedTimeSeriesPoint[] = (rows as RawRow[]).map((r) => {
      const total = Number(r.total_ticks || 0);
      const successful = Number(r.successful_ticks || 0);
      const failed = Math.max(total - successful, 0);
      return {
        time_bucket: (r.timestamp_bucket instanceof Date
          ? r.timestamp_bucket.toISOString()
          : new Date(r.timestamp_bucket).toISOString()),
        avg_latency: Number(Number(r.avg_latency || 0).toFixed(2)),
        uptime_percentage: Number(Number(r.success_rate || 0).toFixed(2)),
        total_checks: total,
        successful_checks: successful,
        failed_checks: failed,
        min_latency: Number(Number(r.min_latency || 0).toFixed(2)),
        max_latency: Number(Number(r.max_latency || 0).toFixed(2)),
        median_latency: Number(Number(r.median_latency || 0).toFixed(2)),
        p95_latency: Number(Number(r.p95_latency || 0).toFixed(2)),
      };
    });

    const startTime = data.length > 0 ? data[0].time_bucket : (start ?? null);
    const endTime = data.length > 0 ? data[data.length - 1].time_bucket : (end ?? null);

    const response: RegionalTimeSeriesResponse = {
      region: regionCode,
      regionType,
      period,
      startTime,
      endTime,
      data,
      dataPoints: data.length,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching regional timeseries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});


