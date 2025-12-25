


export type PrismaTransaction = Parameters<Parameters<typeof import('db/client').prisma.$transaction>[0]>[0];


export interface WhereClause {
  [key: string]: unknown;
}


export interface OrderByClause {
  [key: string]: 'asc' | 'desc' | OrderByClause;
}


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