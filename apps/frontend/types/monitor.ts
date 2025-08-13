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