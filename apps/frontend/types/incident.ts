export type IncidentSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "MAINTENANCE";
export type IncidentStatus = "ACKNOWLEDGED" | "ONGOING" | "RESOLVED";

export interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  monitorId: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  downtime?: number;
  escalated: boolean;
  postmortemId?: string;
  Monitor: {
    id: string;
    name: string;
    url: string;
  };
  comments: Comment[];
  postmortem?: Postmortem;
}

export interface Comment {
  id: string;
  description: string;
  incidentId: string;
  userId: string;
  createdAt: Date;
  user: {
    id: string;
  };
}

export interface Postmortem {
  id: string;
  resolutionTime: number;
  rootCause: string;
  resolution: string;
  incidentId: string;
  createdAt: Date;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  monitorId: string;
  escalated?: boolean;
}

export interface UpdateIncidentRequest {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  escalated?: boolean;
  resolvedAt?: Date;
  downtime?: number;
}

export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IncidentFilters {
  monitorId?: string | null;
  status?: string | null;
  sortBy: string;
  sortOrder: string;
}

export interface IncidentsResponse {
  incidents: Incident[];
  pagination?: PaginationMetadata;
  filters?: IncidentFilters;
}

export interface IncidentResponse {
  incident: Incident;
}
