// Analytics and monitoring data types

/**
 * Raw timeseries data from database
 */
export interface RawTimeSeriesPoint {
  timestamp_bucket: Date | string;
  avg_latency: number | string;
  success_rate: number | string;
  total_ticks: number | string;
}

/**
 * Transformed timeseries data for frontend
 */
export interface TransformedTimeSeriesPoint {
  time_bucket: string;
  avg_latency: number;
  uptime_percentage: number;
  total_checks: number;
}

/**
 * Monitor stats data
 */
export interface MonitorStatsData {
  avg_latency: number | string;
  success_rate: number | string;
  total_ticks: number | string;
  incident_count?: number | string;
}

/**
 * Monitor analytics data
 */
export interface MonitorAnalyticsData {
  avg_response_time: number | string;
  success_rate: number | string;
  total_requests: number | string;
  uptime_percentage: number | string;
  downtime_minutes: number | string;
  incident_count: number | string;
  avg_incident_duration: number | string;
  sla_compliance: number | string;
  availability_percentage: number | string;
  performance_score: number | string;
  reliability_score: number | string;
}

/**
 * Time period for analytics queries
 */
export type AnalyticsPeriod = '1h' | '24h' | '7d' | '30d' | '90d';

/**
 * Analytics response structure
 */
export interface AnalyticsResponse {
  monitorId: string;
  period: AnalyticsPeriod;
  data: TransformedTimeSeriesPoint[] | MonitorStatsData | MonitorAnalyticsData;
  generatedAt: string;
}