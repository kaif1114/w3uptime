


export interface ApiError extends Error {
  message: string;
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}


export interface EscalationPolicyError extends ApiError {
  policiesInUse?: Array<{
    id: string;
    name: string;
  }>;
}


export interface AuthError extends ApiError {
  authenticated?: boolean;
  redirectUrl?: string;
}


export interface ValidationError extends ApiError {
  fields?: Record<string, string[]>;
}


export interface NetworkError extends ApiError {
  timeout?: boolean;
  offline?: boolean;
}


export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'statusCode' in error;
}


export function isEscalationPolicyError(error: unknown): error is EscalationPolicyError {
  return isApiError(error) && 'policiesInUse' in error;
}