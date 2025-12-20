import { withAuth } from "@/lib/auth";
import {
  MonitorBestWorstRegionsResult,
  MonitorContinentDataResult,
  MonitorCountryDataResult,
  ProcessedMonitorRegionalData,
  RawMonitorStatsResult,
  RawHourlyPatternResult,
  RawWeeklyComparisonResult,
  RawPerformanceInsightResult,
  HourlyPattern,
  WeeklyComparison,
  PerformanceInsight,
  HealthScore
} from "@/types/analytics";
import { prisma } from "db/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const analyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).default('day'),
});


export const GET = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ monitorid: string }> }
) => {
  try {
    const { monitorid } = await params;
    const { searchParams } = new URL(req.url);
    
    const validation = analyticsQuerySchema.safeParse({
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

    
    const [
      monitorStats,
      bestRegions,
      worstRegions,
      continentData,
      countryData,
      hourlyPatterns,
      weeklyComparison,
      performanceInsights,
    ] = await Promise.all([
      
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_stats($1::UUID, $2::TEXT)`, monitorid, period),
      
      
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_best_worst_regions($1::UUID, $2::TEXT, $3::TEXT, $4::TEXT) LIMIT 1`, monitorid, period, 'country', 'best'),
      
      
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_best_worst_regions($1::UUID, $2::TEXT, $3::TEXT, $4::TEXT) ORDER BY performance_score ASC LIMIT 1`, monitorid, period, 'country', 'worst'),
      
      
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_continent_data($1::UUID, $2::TEXT)`, monitorid, period),
      
      
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_country_data($1::UUID, $2::TEXT)`, monitorid, period),
      
      
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_hourly_patterns($1::UUID, $2::TEXT)`, monitorid, period),
      
      
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_weekly_comparison($1::UUID)`, monitorid),
      
      
      prisma.$queryRawUnsafe(`SELECT * FROM get_monitor_performance_insights($1::UUID, $2::TEXT)`, monitorid, period),
    ]);

    
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

    
    const stats = (monitorStats as RawMonitorStatsResult[])[0] || {};
    const bestRegion = (bestRegions as MonitorBestWorstRegionsResult[])[0] || null;
    const worstRegion = (worstRegions as MonitorBestWorstRegionsResult[])[0] || null;

    
    const processedContinentData: ProcessedMonitorRegionalData[] = (continentData as MonitorContinentDataResult[]).map(item => ({
      continent_code: item.continent_code,
      avg_latency: Number(item.avg_latency || 0),
      sample_count: Number(item.total_ticks || 0),
    }));

    const processedCountryData: ProcessedMonitorRegionalData[] = (countryData as MonitorCountryDataResult[]).map(item => ({
      country_code: item.country_code,
      avg_latency: Number(item.avg_latency || 0),
      sample_count: Number(item.total_ticks || 0),
    }));

    
    const processedHourlyPatterns: HourlyPattern[] = (hourlyPatterns as RawHourlyPatternResult[]).map(item => ({
      hour_of_day: Number(item.hour_of_day),
      avg_latency: Number(item.avg_latency || 0),
      total_checks: Number(item.total_checks || 0),
      successful_checks: Number(item.successful_checks || 0),
      success_rate: Number(item.success_rate || 0),
      check_frequency: Number(item.check_frequency || 0),
    }));

    
    const processedWeeklyComparison: WeeklyComparison[] = (weeklyComparison as RawWeeklyComparisonResult[]).map(item => ({
      metric_name: item.metric_name,
      current_week: Number(item.current_week || 0),
      previous_week: Number(item.previous_week || 0),
      change_percentage: Number(item.change_percentage || 0),
      trend_direction: item.trend_direction as 'up' | 'down' | 'stable',
    }));

    
    const processedInsights: PerformanceInsight[] = (performanceInsights as RawPerformanceInsightResult[]).map(item => ({
      insight_type: item.insight_type as 'health_score' | 'uptime' | 'latency' | 'patterns',
      insight_title: item.insight_title,
      insight_message: item.insight_message,
      severity: item.severity as 'success' | 'warning' | 'error' | 'info',
      recommendation: item.recommendation,
      health_score: item.health_score,
    }));

    
    const uptimePercentage = Number(stats.uptime_percentage || 0);
    const avgLatency = Number(stats.avg_latency || 0);
    
    const healthScore: HealthScore = {
      grade: processedInsights.find(i => i.insight_type === 'health_score')?.health_score || 'N/A',
      score: Math.round((uptimePercentage + (100 - Math.min(avgLatency / 50, 100))) / 2), 
      color: (() => {
        const grade = processedInsights.find(i => i.insight_type === 'health_score')?.health_score;
        if (grade === 'A+' || grade === 'A') return 'green';
        if (grade === 'B' || grade === 'C') return 'yellow';
        if (grade === 'D') return 'orange';
        return 'red';
      })(),
      description: processedInsights.find(i => i.insight_type === 'health_score')?.insight_message || 'No data available'
    };

    return NextResponse.json({
      monitorId: monitorid,
      period,
      uptime: {
        total_checks: Number(stats.total_checks || 0),
        successful_checks: Number(stats.successful_checks || 0),
        failed_checks: Number(stats.failed_checks || 0),
        uptime_percentage: Number(stats.uptime_percentage || 0),
        availability_sla: Number(stats.uptime_percentage || 0), 
      },
      bestRegion: bestRegion ? {
        region_type: "Country", 
        region_name: bestRegion.region_name || bestRegion.region_id || 'Unknown',
        avg_latency: Number(bestRegion.avg_latency || 0),
        sample_count: Number(bestRegion.total_checks || 0),
      } : null,
      worstRegion: worstRegion ? {
        region_type: "Country", 
        region_name: worstRegion.region_name || worstRegion.region_id || 'Unknown',
        avg_latency: Number(worstRegion.avg_latency || 0),
        sample_count: Number(worstRegion.total_checks || 0),
      } : null,
      regional: {
        byCountry: processedCountryData.sort((a, b) => a.avg_latency - b.avg_latency), 
        byContinent: processedContinentData.sort((a, b) => a.avg_latency - b.avg_latency), 
        byCity: [], 
      },
      worldMap: {
        byCountry: processedCountryData,
      },
      
      hourlyPatterns: processedHourlyPatterns,
      weeklyComparison: processedWeeklyComparison,
      performanceInsights: processedInsights,
      healthScore: healthScore,
      generatedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching monitor analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});