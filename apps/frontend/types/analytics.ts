


export interface RawTimeSeriesPoint {
  timestamp_bucket: Date | string;
  avg_latency: number | string;
  success_rate: number | string;
  total_ticks: number | string;
}


export interface TransformedTimeSeriesPoint {
  time_bucket: string;
  avg_latency: number;
  uptime_percentage: number;
  total_checks: number;
}


export interface MonitorStatsData {
  avg_latency: number | string;
  success_rate: number | string;
  total_ticks: number | string;
  incident_count?: number | string;
}


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


export type AnalyticsPeriod = '1h' | '24h' | '7d' | '30d' | '90d';


export type EnhancedTimePeriod = 'day' | 'week' | 'month' | 'custom';


export interface CustomTimePeriod {
  type: 'custom';
  startDate: string; 
  endDate: string; 
}


export type TimePeriodSelection = EnhancedTimePeriod | CustomTimePeriod;


export interface AnalyticsResponse {
  monitorId: string;
  period: AnalyticsPeriod;
  data: TransformedTimeSeriesPoint[] | MonitorStatsData | MonitorAnalyticsData;
  generatedAt: string;
}




export interface AvailableRegion {
  region_id: string;
  region_name: string;
  continent_code?: string; 
  country_code?: string; 
  data_count: number;
}


export interface AvailableRegionsResponse {
  regionType: 'continent' | 'country' | 'city';
  monitorId: string | null;
  regions: AvailableRegion[];
  total: number;
  generatedAt: string;
}


export interface AvailableCountry {
  country_code: string;
  country_name: string;
  continent_code: string;
  data_count: number;
  avg_latency: number;
  success_rate: number;
  total_checks: number;
}


export interface AvailableCountriesResponse {
  continent: string | null;
  monitorId: string | null;
  countries: AvailableCountry[];
  total: number;
  generatedAt: string;
}


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


export interface RawRegionalTimeSeriesPoint {
  timestamp_bucket: Date | string;
  avg_latency: number | string;
  min_latency: number | string;
  max_latency: number | string;
  median_latency: number | string;
  p95_latency: number | string;
  total_ticks: bigint | number | string;
  successful_ticks: bigint | number | string;
  success_rate: number | string;
}


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


export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  category?: string;
}


export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'area' | 'bar';
}


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


export interface AnalyticsFilters {
  period: EnhancedTimePeriod;
  customPeriod?: CustomTimePeriod;
  selectedRegion?: string;
  selectedCountry?: string;
  regionType?: 'continent' | 'country' | 'city';
  compareRegions?: string[]; 
}




export interface RawRegionQueryResult {
  region_id: string;
  region_name: string;
  continent_code?: string;
  country_code?: string;
  data_count: bigint;
}


export interface RawMonitorStatsResult {
  total_checks: bigint;
  successful_checks: bigint;
  failed_checks: bigint;
  uptime_percentage: number;
  avg_latency: number;
}


export interface RawPerformingRegionResult {
  region_id: string;
  region_name: string;
  avg_latency: number;
  total_checks: bigint;
  uptime_percentage?: number;
}


export interface RawTimeseriesQueryResult {
  continent_code?: string;
  country_code?: string;
  city?: string;
  avg_latency: number;
  total_ticks: bigint;
  success_rate: number;
  time_bucket?: string;
}


export interface ProcessedRegionData {
  continent_code?: string;
  country_code?: string;
  avg_latency: number;
  sample_count: number;
  total_latency: number;
  total_samples: number;
}


export interface RawAvailableCountryResult {
  country_code: string;
  country_name: string;
  continent_code: string;
  data_count: bigint;
  avg_latency: number;
  successful_checks: bigint;
  total_checks: bigint;
}




export interface MonitorCountryDataResult {
  country_code: string;
  avg_latency: number;
  total_ticks: bigint;
  successful_ticks: bigint;
  success_rate: number;
}


export interface MonitorContinentDataResult {
  continent_code: string;
  avg_latency: number;
  total_ticks: bigint;
  successful_ticks: bigint;
  success_rate: number;
}


export interface MonitorBestWorstRegionsResult {
  region_id: string;
  region_name: string;
  avg_latency: number;
  success_rate: number;
  total_checks: bigint;
  performance_score: number;
  rank_position: bigint;
}


export interface ProcessedMonitorRegionalData {
  country_code?: string;
  continent_code?: string;
  avg_latency: number;
  sample_count: number;
}




export interface HourlyPattern {
  hour_of_day: number;
  avg_latency: number;
  total_checks: number;
  successful_checks: number;
  success_rate: number;
  check_frequency: number;
}


export interface WeeklyComparison {
  metric_name: string;
  current_week: number;
  previous_week: number;
  change_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
}


export interface PerformanceInsight {
  insight_type: 'health_score' | 'uptime' | 'latency' | 'patterns';
  insight_title: string;
  insight_message: string;
  severity: 'success' | 'warning' | 'error' | 'info';
  recommendation: string;
  health_score: string;
}


export interface HealthScore {
  grade: string;
  score: number;
  color: 'green' | 'yellow' | 'orange' | 'red';
  description: string;
}


export interface RawHourlyPatternResult {
  hour_of_day: number | bigint;
  avg_latency: number | string;
  total_checks: number | bigint | string;
  successful_checks: number | bigint | string;
  success_rate: number | string;
  check_frequency: number | string;
}

export interface RawWeeklyComparisonResult {
  metric_name: string;
  current_week: number | string;
  previous_week: number | string;
  change_percentage: number | string;
  trend_direction: string;
}

export interface RawPerformanceInsightResult {
  insight_type: string;
  insight_title: string;
  insight_message: string;
  severity: string;
  recommendation: string;
  health_score: string;
}


export interface EnhancedAnalyticsResponse {
  monitorId: string;
  period: string;
  uptime: {
    total_checks: number;
    successful_checks: number;
    failed_checks: number;
    uptime_percentage: number;
    availability_sla: number;
  } | null;
  bestRegion: {
    region_type: string;
    region_name: string;
    avg_latency: number;
    sample_count: number;
  } | null;
  worstRegion: {
    region_type: string;
    region_name: string;
    avg_latency: number;
    sample_count: number;
  } | null;
  regional: {
    byCountry: ProcessedMonitorRegionalData[];
    byContinent: ProcessedMonitorRegionalData[];
    byCity: ProcessedMonitorRegionalData[];
  };
  worldMap: {
    byCountry: ProcessedMonitorRegionalData[];
  };
  
  hourlyPatterns: HourlyPattern[];
  weeklyComparison: WeeklyComparison[];
  performanceInsights: PerformanceInsight[];
  healthScore: HealthScore;
  generatedAt: string;
}