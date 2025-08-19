export type StatusHistoryRange = "7d" | "30d" | "90d";

export interface StatusPageResourceMonitor {
  type: "monitor";
  monitorId: string;
}

export type StatusPageResource = StatusPageResourceMonitor; // Future: add groups/services

export interface StatusPageSection {
  id: string;
  name: string;
  resources: StatusPageResource[];
}

export interface StatusPageMaintenance {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  status: "scheduled" | "in_progress" | "completed";
}

export interface StatusPageUpdate {
  id: string;
  title: string;
  body?: string;
  createdAt: string; // ISO
}

export interface StatusPage {
  id: string;
  userId: string;
  name: string;
  isPublished: boolean;
  logoUrl?: string | null;
  logoHrefUrl?: string | null;
  contactUrl?: string | null;
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
  logoHrefUrl?: string | null;
  contactUrl?: string | null;
  historyRange?: StatusHistoryRange;
  sections?: StatusPageSection[];
}

export interface UpdateStatusPageData {
  name?: string;
  isPublished?: boolean;
  logoUrl?: string | null;
  logoHrefUrl?: string | null;
  contactUrl?: string | null;
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
