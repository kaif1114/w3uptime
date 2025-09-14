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
 * Transformed timeseries data for frontend (legacy - use EnhancedTimeSeriesPoint for new features)
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
 * Enhanced time period type including custom periods
 */
export type EnhancedTimePeriod = 'day' | 'week' | 'month' | 'custom';

/**
 * Custom time period with start and end dates
 */
export interface CustomTimePeriod {
  type: 'custom';
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

/**
 * Time period selection (standard or custom)
 */
export type TimePeriodSelection = EnhancedTimePeriod | CustomTimePeriod;

/**
 * Analytics response structure
 */
export interface AnalyticsResponse {
  monitorId: string;
  period: AnalyticsPeriod;
  data: TransformedTimeSeriesPoint[] | MonitorStatsData | MonitorAnalyticsData;
  generatedAt: string;
}

// ===== NEW REGIONAL ANALYTICS TYPES =====

/**
 * Available region data from discovery API
 */
export interface AvailableRegion {
  region_id: string;
  region_name: string;
  continent_code?: string; // For countries and cities
  country_code?: string; // For cities
  data_count: number;
}

/**
 * Available regions response
 */
export interface AvailableRegionsResponse {
  regionType: 'continent' | 'country' | 'city';
  monitorId: string | null;
  regions: AvailableRegion[];
  total: number;
  generatedAt: string;
}

/**
 * Available country with performance metrics
 */
export interface AvailableCountry {
  country_code: string;
  country_name: string;
  continent_code: string;
  data_count: number;
  avg_latency: number;
  success_rate: number;
  total_checks: number;
}

/**
 * Available countries response
 */
export interface AvailableCountriesResponse {
  continent: string | null;
  monitorId: string | null;
  countries: AvailableCountry[];
  total: number;
  generatedAt: string;
}

/**
 * Enhanced timeseries data point with additional metrics
 */
export interface EnhancedTimeSeriesPoint {
  time_bucket: string;
  avg_latency: number;
  uptime_percentage: number;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  min_latency: number;
  max_latency: number;
  median_latency: number;
  p95_latency: number;
}

/**
 * Regional timeseries response
 */
export interface RegionalTimeSeriesResponse {
  region: string;
  regionType: 'continent' | 'country' | 'city';
  period: string;
  startTime: string | null;
  endTime: string | null;
  data: EnhancedTimeSeriesPoint[];
  dataPoints: number;
  generatedAt: string;
}

/**
 * Regional statistics
 */
export interface RegionalStatistics {
  country_code?: string;
  region_type: string;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  uptime_percentage: number;
  avg_response_time: number;
  min_response_time: number;
  max_response_time: number;
  p95_response_time: number;
  median_response_time: number;
  performance_score: number;
}

/**
 * Country timeseries and statistics response
 */
export interface CountryAnalyticsResponse {
  country: string;
  period: string;
  startTime: string | null;
  endTime: string | null;
  timeseries: EnhancedTimeSeriesPoint[];
  statistics: RegionalStatistics | null;
  dataPoints: number;
  generatedAt: string;
}

/**
 * Chart data point for visualizations
 */
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  category?: string;
}

/**
 * Chart series for multi-line charts
 */
export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'area' | 'bar';
}

/**
 * Regional comparison data for ranking
 */
export interface RegionalComparisonItem {
  region_id: string;
  region_name: string;
  region_type: string;
  avg_latency: number;
  uptime_percentage: number;
  performance_score: number;
  total_checks: number;
  rank: number;
}

/**
 * Analytics filters for queries
 */
export interface AnalyticsFilters {
  period: EnhancedTimePeriod;
  customPeriod?: CustomTimePeriod;
  selectedRegion?: string;
  selectedCountry?: string;
  regionType?: 'continent' | 'country' | 'city';
  compareRegions?: string[]; // For comparison charts
}

// ===== DATABASE QUERY RESULT TYPES =====

/**
 * Raw database result from region discovery queries (continent/country/city)
 */
export interface RawRegionQueryResult {
  region_id: string;
  region_name: string;
  continent_code?: string;
  country_code?: string;
  data_count: bigint;
}

/**
 * Raw monitor stats query result from database function
 */
export interface RawMonitorStatsResult {
  total_checks: bigint;
  successful_checks: bigint;
  failed_checks: bigint;
  uptime_percentage: number;
  avg_latency: number;
}

/**
 * Raw best/worst performing regions query result
 */
export interface RawPerformingRegionResult {
  region_id: string;
  region_name: string;
  avg_latency: number;
  total_checks: bigint;
  uptime_percentage?: number;
}

/**
 * Raw continental/country/city timeseries query result
 */
export interface RawTimeseriesQueryResult {
  continent_code?: string;
  country_code?: string;
  city?: string;
  avg_latency: number;
  total_ticks: bigint;
  success_rate: number;
  time_bucket?: string;
}

/**
 * Processed continent/country data for aggregation
 */
export interface ProcessedRegionData {
  continent_code?: string;
  country_code?: string;
  avg_latency: number;
  sample_count: number;
  total_latency: number;
  total_samples: number;
}

/**
 * Raw available countries query result from database
 */
export interface RawAvailableCountryResult {
  country_code: string;
  country_name: string;
  continent_code: string;
  data_count: bigint;
  avg_latency: number;
  successful_checks: bigint;
  total_checks: bigint;
}