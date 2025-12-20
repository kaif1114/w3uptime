import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { RawTimeSeriesPoint, TransformedTimeSeriesPoint } from "@/types/analytics";

const timeseriesQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).default('day'),
});


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ monitorId: string }> }
) {
  try {
    const { monitorId } = await params;
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

    
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
      },
      include: {
        statusPageSections: {
          include: {
            statusPage: true,
          },
        },
      },
    });

    if (!monitor || !monitor.statusPageSections.length) {
      return NextResponse.json(
        { error: "Monitor not found or not public" },
        { status: 404 }
      );
    }

    
    const timeseriesData = await prisma.$queryRawUnsafe(
      `SELECT * FROM get_monitor_timeseries($1::UUID, $2::TEXT)`, 
      monitorId, 
      period
    );

    
    const transformTimeSeriesData = (rawData: RawTimeSeriesPoint[]): TransformedTimeSeriesPoint[] => {
      return rawData.map(point => ({
        time_bucket: point.timestamp_bucket instanceof Date ? point.timestamp_bucket.toISOString() : point.timestamp_bucket,
        avg_latency: Number(point.avg_latency) || 0,
        uptime_percentage: Number(point.success_rate) || 0, 
        total_checks: Number(point.total_ticks) || 0, 
      }));
    };

    return NextResponse.json({
      monitorId,
      period,
      data: transformTimeSeriesData(timeseriesData as RawTimeSeriesPoint[]) || [],
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching public monitor timeseries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}