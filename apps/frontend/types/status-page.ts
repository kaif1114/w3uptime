export type StatusHistoryRange = "7d" | "30d" | "90d";

export type WidgetType = "current" | "with_history" | "with_history_chart";

export interface StatusPageResourceMonitor {
  id: string;
  type: "monitor";
  monitorId: string;
}

export type StatusPageResource = StatusPageResourceMonitor; 

export interface StatusPageSection {
  id: string;
  name: string;
  widgetType: WidgetType;
  resources: StatusPageResource[];
}

export interface StatusPageMaintenance {
  id: string;
  title: string;
  description?: string;
  start: string; 
  end: string; 
  status: "scheduled" | "in_progress" | "completed";
  affectedResourceIds?: string[];
}

export interface StatusPageUpdate {
  id: string;
  title: string;
  body?: string;
  createdAt: string; 
}

export interface StatusPage {
  id: string;
  userId: string;
  name: string;
  isPublished: boolean;
  logoUrl?: string | null;
  logoLinkUrl?: string | null;
  supportUrl?: string | null;
  historyRange: StatusHistoryRange;
  sections: StatusPageSection[];
  maintenances: StatusPageMaintenance[];
  updates: StatusPageUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStatusPageData {
  name: string;
  isPublished?: boolean;
  logoUrl?: string | null;
  logoLinkUrl?: string | null;
  supportUrl?: string | null;
  historyRange?: StatusHistoryRange;
  sections?: StatusPageSection[];
}

export interface UpdateStatusPageData {
  name?: string;
  isPublished?: boolean;
  logoUrl?: string | null;
  logoLinkUrl?: string | null;
  supportUrl?: string | null;
  historyRange?: StatusHistoryRange;
  sections?: StatusPageSection[];
  maintenances?: StatusPageMaintenance[];
  updates?: StatusPageUpdate[];
}

export interface StatusPagesListResponse {
  statusPages: Pick<
    StatusPage,
    "id" | "name" | "isPublished" | "historyRange"
  >[];
}

export interface CreateStatusPageResponse {
  message: string;
  statusPage: StatusPage;
}

export interface GetStatusPageResponse extends StatusPage {}

export interface UpdateStatusPageResponse {
  message: string;
  statusPage: StatusPage;
}

export interface DeleteStatusPageResponse {
  message: string;
}
