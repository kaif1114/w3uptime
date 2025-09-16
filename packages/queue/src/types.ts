export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface AlertJobData {
  alertId: string;
  incidentId?: string;
  monitorId: string;
  monitorName: string;
  monitorUrl: string;
  escalationLevelId: string;
  levelOrder: number;
  channel: 'EMAIL' | 'SLACK' | 'WEBHOOK';
  contacts: string[];
  message?: string;
  incidentTitle: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
}

export interface EscalationJobData extends AlertJobData {
  waitMinutes: number;
  remainingLevels: EscalationLevelInfo[];
}

export interface EscalationLevelInfo {
  id: string;
  levelOrder: number;
  waitMinutes: number;
  contacts: string[];
  channel: 'EMAIL' | 'SLACK' | 'WEBHOOK';
  name?: string;
  message?: string;
}

export interface RecoveryJobData {
  monitorId: string;
  monitorName: string;
  monitorUrl: string;
  recoveryTime: Date;
  notifiedContacts: string[];
}

export interface EmailConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from?: string;
}

export interface SlackConfig {
  token: string;
  defaultChannel?: string;
}

export interface NotificationResult {
  success: boolean;
  sentTo: string[];
  errors: string[];
}

export type QueueName = 
  | 'alert-immediate'
  | 'alert-delayed' 
  | 'email-notifications'
  | 'slack-notifications'
  | 'webhook-notifications'
  | 'recovery-notifications';

export interface QueueConfig {
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    backoff: {
      type: 'exponential';
      delay: number;
    };
  };
}
