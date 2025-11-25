// Database transaction and operation types

/**
 * Prisma transaction type
 */
export type PrismaTransaction = Parameters<Parameters<typeof import('db/client').prisma.$transaction>[0]>[0];

/**
 * Generic where clause for Prisma queries
 */
export interface WhereClause {
  [key: string]: unknown;
}

/**
 * Generic order by clause for Prisma queries
 */
export interface OrderByClause {
  [key: string]: 'asc' | 'desc' | OrderByClause;
}

/**
 * Database escalation policy with levels
 */
export interface DbEscalationPolicyWithLevels {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  levels: Array<{
    id: string;
    escalationPolicyId: string;
    order: number;
    method: string;
    target: string;
    waitTimeMinutes: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  _count?: {
    monitors: number;
  };
}

/**
 * Database escalation level
 */
export interface DbEscalationLevel {
  id: string;
  escalationPolicyId: string;
  order: number;
  method: string;
  target: string;
  waitTimeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}