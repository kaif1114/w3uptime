// Database model types that correspond to Prisma schema

/**
 * Database StatusPageSection type
 */
export interface DbStatusPageSection {
  id: string;
  name: string;
  description?: string;
  order: number;
  type: string;
  monitorId: string;
  statusPageId: string;
  maintenanceId?: string;
}

/**
 * Database Maintenance type
 */
export interface DbMaintenance {
  id: string;
  title: string;
  description: string;
  from: Date;
  to: Date;
  statusPageId: string;
}

/**
 * Database Update type
 */
export interface DbUpdate {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  statusPageId: string;
}

/**
 * Database StatusPage type with relations
 */
export interface DbStatusPage {
  id: string;
  name: string;
  isPublished: boolean;
  logoUrl?: string | null;
  logo?: string | null;
  supportUrl?: string | null;
  announcement?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  statusPageSections: DbStatusPageSection[];
  maintenances: DbMaintenance[];
  updates: DbUpdate[];
}

/**
 * Database User type
 */
export interface DbUser {
  id: string;
  walletAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database Proposal type
 */
export interface DbProposal {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  tags: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: DbUser;
  votes?: Array<{
    id: string;
    proposalId: string;
    userId: string;
    vote: string;
    createdAt: Date;
  }>;
}