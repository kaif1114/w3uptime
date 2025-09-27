export type EscalationMethod = "EMAIL" | "SLACK" | "WEBHOOK";

export interface EscalationLevel {
  id: string;
  order: number;
  method: EscalationMethod;
  target: string; // email address, webhook URL, or automatically uses authorized Slack channels
  waitTimeMinutes: number;
}



export interface EscalationPolicy {
  id: string;
  name: string;
  userId: string;
  levels: EscalationLevel[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEscalationPolicyRequest {
  name: string;
  levels: Omit<EscalationLevel, "id" | "order">[];
}

export interface CreateEscalationPolicyResponse {
  message: string;
  escalationPolicy: EscalationPolicy;
}

export interface EscalationPolicyFormData {
  name: string;
  levels: Array<{
    method: EscalationMethod;
    target: string;
    waitTimeMinutes: number;
  }>;
}
