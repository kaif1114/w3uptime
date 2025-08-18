export type MonitorStatus = "ACTIVE" | "PAUSED" | "DISABLED";

export interface Monitor {
  id: string;
  name: string;
  url: string;
  status: MonitorStatus;
  timeout: number;
  checkInterval: number;
  expectedStatusCodes: number[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMonitorData {
  name: string;
  url: string;
  timeout?: number;
  checkInterval?: number;
  expectedStatusCodes?: number[];
  status?: MonitorStatus;
}

export interface UpdateMonitorData {
  name: string;
  url: string;
  timeout: number;
  checkInterval: number;
  expectedStatusCodes: number[];
  status: MonitorStatus;
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

// Monitor metrics and stats
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

// Monitor analytics types for TimescaleDB functions
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
  total_downtime_duration: string; // PostgreSQL INTERVAL type
  downtime_incidents: number;
  avg_incident_duration: string;
  longest_incident: string;
  mttr: string; // Mean Time To Recovery
}

export interface BestRegion {
  region_type: 'Country' | 'Continent' | 'City';
  region_name: string;
  avg_latency: number;
  sample_count: number;
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
  downtime: DowntimeData | null;
  bestRegion: BestRegion | null;
  regional: {
    byCountry: RegionalLatency[];
    byContinent: RegionalLatency[];
    byCity: RegionalLatency[];
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
  bucketSize: string;
  data: TimeSeriesDataPoint[];
  generatedAt: string;
}

export interface MonitorTickLocation {
  longitude: number;
  latitude: number;
  countryCode: string;
  continentCode: string;
  city: string;
}

export interface MonitorTickValidator {
  id: string;
  walletAddress: string;
  type: string;
}

export interface MonitorTick {
  id: string;
  status: 'GOOD' | 'BAD';
  latency: number;
  location: MonitorTickLocation;
  validator: MonitorTickValidator;
  createdAt: string;
}

export interface MonitorTicksResponse {
  monitorId: string;
  ticks: MonitorTick[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  generatedAt: string;
} 