// Error handling types

/**
 * Standard API error structure
 */
export interface ApiError extends Error {
  message: string;
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Escalation policy error with specific fields
 */
export interface EscalationPolicyError extends ApiError {
  policiesInUse?: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Authentication error
 */
export interface AuthError extends ApiError {
  authenticated?: boolean;
  redirectUrl?: string;
}

/**
 * Validation error with field-specific errors
 */
export interface ValidationError extends ApiError {
  fields?: Record<string, string[]>;
}

/**
 * Network error
 */
export interface NetworkError extends ApiError {
  timeout?: boolean;
  offline?: boolean;
}

/**
 * Generic error handler utility
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'statusCode' in error;
}

/**
 * Type guard for escalation policy errors
 */
export function isEscalationPolicyError(error: unknown): error is EscalationPolicyError {
  return isApiError(error) && 'policiesInUse' in error;
}