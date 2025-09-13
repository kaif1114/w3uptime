// Generic utility types to replace 'any' usage

/**
 * Generic filter parameters object
 */
export interface FilterParams {
  page?: number;
  pageSize?: number;
  q?: string;
  type?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Generic maintenance item
 */
export interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  affectedServices: string[];
}

/**
 * Generic update/changelog item
 */
export interface UpdateItem {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  version?: string;
  type: 'feature' | 'bugfix' | 'security' | 'improvement';
  changes: string[];
}

/**
 * Generic form field configuration
 */
export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'textarea' | 'number' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Generic pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T = unknown> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Generic error object
 */
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

/**
 * Function type with generic parameters - replaces any[] for function args
 */
export type GenericFunction<T extends readonly unknown[] = unknown[], R = unknown> = (...args: T) => R;

/**
 * Generic object with string keys - safer alternative to any for objects
 */
export type GenericRecord<T = unknown> = Record<string, T>;

/**
 * Utility type for unknown event handlers
 */
export interface EventHandler<T = Event> {
  (event: T): void;
}

/**
 * Generic form data interface
 */
export interface FormData {
  [fieldName: string]: string | number | boolean | string[] | File | FileList | null | undefined;
}