import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const countryTimeseriesQuerySchema = z.object({
  country: z.string(), // Country code
  period: z.enum(['day', 'week', 'month']).default('day'),
  startTime: z.string().optional(), // ISO string for custom periods
  endTime: z.string().optional(), // ISO string for custom periods
  includeStats: z.boolean().default(true), // Include aggregated statistics
});

// GET /api/analytics/country-timeseries - Get country-specific timeseries and statistics
export const GET = withAuth(async (
  req: NextRequest,
  user,
  session
) => {
  try {
    const { searchParams } = new URL(req.url);
    
    const validation = countryTimeseriesQuerySchema.safeParse({
      country: searchParams.get('country'),
      period: searchParams.get('period') || 'day',
      startTime: searchParams.get('startTime') || undefined,
      endTime: searchParams.get('endTime') || undefined,
      includeStats: searchParams.get('includeStats') === 'false' ? false : true,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { country, period, startTime, endTime, includeStats } = validation.data;

    let timeseriesData: any[] = [];
    let statsData: any[] = [];

    try {
      // Get country timeseries data
      timeseriesData = await prisma.$queryRawUnsafe(
        `SELECT * FROM get_country_timeseries($1::TEXT, $2::TEXT, $3::TIMESTAMPTZ, $4::TIMESTAMPTZ)`, 
        country, 
        period,
        startTime ? new Date(startTime).toISOString() : null,
        endTime ? new Date(endTime).toISOString() : null
      );

      // Get country statistics if requested
      if (includeStats) {
        statsData = await prisma.$queryRawUnsafe(
          `SELECT * FROM get_regional_stats($1::TEXT, $2::TEXT, $3::TEXT, $4::TIMESTAMPTZ, $5::TIMESTAMPTZ)`, 
          'country',
          country, 
          period,
          startTime ? new Date(startTime).toISOString() : null,
          endTime ? new Date(endTime).toISOString() : null
        );
      }
    } catch (dbError) {
      console.error("Database query error:", dbError);
      // Return empty data if query fails rather than erroring out
      timeseriesData = [];
      statsData = [];
    }

    // Helper function to convert BigInt to Number
    const convertBigIntToNumber = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return Number(obj);
      if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
      if (typeof obj === 'object') {
        const converted: Record<string, unknown> = {};
        for (const key in obj) {
          converted[key] = convertBigIntToNumber((obj as Record<string, unknown>)[key]);
        }
        return converted;
      }
      return obj;
    };

    // Transform timeseries data
    const transformedTimeseries = (timeseriesData as any[]).map(point => ({
      time_bucket: point.timestamp_bucket instanceof Date 
        ? point.timestamp_bucket.toISOString() 
        : point.timestamp_bucket,
      avg_latency: Number(point.avg_latency || 0),
      uptime_percentage: point.total_ticks > 0 
        ? Number(((Number(point.successful_ticks || 0) / Number(point.total_ticks || 1)) * 100).toFixed(2))
        : 0,
      total_checks: Number(point.total_ticks || 0),
      successful_checks: Number(point.successful_ticks || 0),
      failed_checks: Number((point.total_ticks || 0) - (point.successful_ticks || 0)),
      min_latency: Number(point.min_latency || 0),
      max_latency: Number(point.max_latency || 0),
      median_latency: Number(point.median_latency || 0),
      p95_latency: Number(point.p95_latency || 0),
    }));

    // Transform statistics data
    const stats = (statsData as any[])[0];
    const transformedStats = stats ? {
      country_code: country,
      region_type: 'country',
      total_checks: Number(stats.total_checks || 0),
      successful_checks: Number(stats.successful_checks || 0),
      failed_checks: Number(stats.failed_checks || 0),
      uptime_percentage: Number(stats.uptime_percentage || 0),
      avg_response_time: Number(stats.avg_response_time || 0),
      min_response_time: Number(stats.min_response_time || 0),
      max_response_time: Number(stats.max_response_time || 0),
      p95_response_time: Number(stats.p95_response_time || 0),
      median_response_time: Number(stats.median_response_time || 0),
      performance_score: Number(stats.performance_score || 0),
    } : null;

    // Calculate summary metrics from timeseries if no stats available
    if (!transformedStats && transformedTimeseries.length > 0) {
      const totalChecks = transformedTimeseries.reduce((sum, point) => sum + point.total_checks, 0);
      const totalSuccessful = transformedTimeseries.reduce((sum, point) => sum + point.successful_checks, 0);
      const avgLatency = transformedTimeseries.reduce((sum, point, _, arr) => 
        sum + (point.avg_latency / arr.length), 0);

      return NextResponse.json({
        country,
        period,
        startTime: startTime || null,
        endTime: endTime || null,
        timeseries: transformedTimeseries,
        statistics: {
          country_code: country,
          region_type: 'country',
          total_checks: totalChecks,
          successful_checks: totalSuccessful,
          failed_checks: totalChecks - totalSuccessful,
          uptime_percentage: totalChecks > 0 ? Number(((totalSuccessful / totalChecks) * 100).toFixed(2)) : 0,
          avg_response_time: Number(avgLatency.toFixed(2)),
          performance_score: totalChecks > 0 ? Number((((totalSuccessful / totalChecks) * 100 * 0.6) + ((100 - Math.min(avgLatency / 10, 100)) * 0.4)).toFixed(2)) : 0,
        },
        dataPoints: transformedTimeseries.length,
        generatedAt: new Date().toISOString(),
      }, { status: 200 });
    }

    return NextResponse.json({
      country,
      period,
      startTime: startTime || null,
      endTime: endTime || null,
      timeseries: transformedTimeseries,
      statistics: transformedStats,
      dataPoints: transformedTimeseries.length,
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching country timeseries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});