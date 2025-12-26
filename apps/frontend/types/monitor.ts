export type MonitorStatus = "ACTIVE" | "PAUSED" | "DOWN" | "RECOVERING";

export interface Monitor {
  id: string;
  name: string;
  url: string;
  status: MonitorStatus;
  timeout: number;
  checkInterval: number;
  expectedStatusCodes: number[];
  escalationPolicyId?: string | null;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string | null;
  lastIncidentResolvedAt?: string | null;
  hasOngoingIncident?: boolean;
  ongoingIncidentStartedAt?: string | null;
}

export interface CreateMonitorData {
  name: string;
  url: string;
  timeout?: number;
  checkInterval?: number;
  expectedStatusCodes?: number[];
  status?: MonitorStatus;
  escalationPolicyId?: string | null;
  
  escalationPolicy?: {
    name: string;
    levels: Array<{
      method: "EMAIL" | "SLACK" | "WEBHOOK";
      target: string;
      waitTimeMinutes: number;
    }>;
  };
}

export interface UpdateMonitorData {
  name: string;
  url: string;
  timeout: number;
  checkInterval: number;
  expectedStatusCodes: number[];
  status: MonitorStatus;
  escalationPolicyId: string;
}

export interface MonitorApiResponse {
  monitors: Monitor[];
}

export interface CreateMonitorResponse {
  message: string;
  monitor: Monitor;
}

export interface UpdateMonitorResponse {
  message: string;
  monitor: Monitor;
}

export interface DeleteMonitorResponse {
  message: string;
}


export interface MonitorStats {
  currentlyUpFor: string;
  lastCheckedAt: string;
  incidentsCount: number;
  uptime: {
    today: number;
    last7Days: number;
    last30Days: number;
    last365Days: number;
    allTime: number;
  };
  downtime: {
    today: string;
    last7Days: string;
    last30Days: string;
    last365Days: string;
    allTime: string;
  };
  incidents: {
    today: number;
    last7Days: number;
    last30Days: number;
    last365Days: number;
    allTime: number;
  };
  longestIncident: string;
  avgIncident: string;
}

export interface ResponseTimeData {
  timestamp: string;
  responseTime: number;
  status: "success" | "failure";
}

export interface MonitorDetailsResponse {
  monitor: Monitor;
  stats: MonitorStats;
  responseTimeData: ResponseTimeData[];
}


export interface UptimeData {
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  uptime_percentage: number;
  availability_sla: number;
}

export interface LatencyData {
  avg_latency: number;
  min_latency: number;
  max_latency: number;
  sample_count: number;
}

export interface DowntimeData {
  total_downtime_duration: string; 
  downtime_incidents: number;
  avg_incident_duration: string;
  longest_incident: string;
  mttr: string; 
}

export interface BestRegion {
  region_type: "Country" | "Continent" | "City";
  region_name: string;
  avg_latency: number;
  sample_count: number;
}

export interface WorstRegion {
  region_type: "Country" | "Continent" | "City";
  region_name: string;
  avg_latency: number;
  sample_count: number;
}

export interface SampleCountData {
  country_code: string;
  sample_count: number;
  avg_latency: number;
}

export interface RegionalLatency {
  country_code?: string;
  continent_code?: string;
  city?: string;
  avg_latency: number;
  sample_count: number;
}

export interface MonitorAnalyticsResponse {
  monitorId: string;
  period: string;
  uptime: UptimeData | null;
  latency: LatencyData | null;
  bestRegion: BestRegion | null;
  worstRegion: WorstRegion | null;
  regional: {
    byCountry: RegionalLatency[];
    byContinent: RegionalLatency[];
    byCity: RegionalLatency[];
  };
  worldMap: {
    byCountry: SampleCountData[];
  };
  
  hourlyPatterns?: Array<{
    hour_of_day: number;
    avg_latency: number;
    total_checks: number;
    successful_checks: number;
    success_rate: number;
    check_frequency: number;
  }>;
  weeklyComparison?: Array<{
    metric_name: string;
    current_week: number;
    previous_week: number;
    change_percentage: number;
    trend_direction: 'up' | 'down' | 'stable';
  }>;
  performanceInsights?: Array<{
    insight_type: 'health_score' | 'uptime' | 'latency' | 'patterns';
    insight_title: string;
    insight_message: string;
    severity: 'success' | 'warning' | 'error' | 'info';
    recommendation: string;
    health_score: string;
  }>;
  healthScore?: {
    grade: string;
    score: number;
    color: 'green' | 'yellow' | 'orange' | 'red';
    description: string;
  };
  generatedAt: string;
}

export interface TimeSeriesDataPoint {
  time_bucket: string;
  avg_latency: number;
  uptime_percentage: number;
  total_checks: number;
}

export interface MonitorTimeSeriesResponse {
  monitorId: string;
  period: string;
  data: TimeSeriesDataPoint[];
  generatedAt: string;
}
