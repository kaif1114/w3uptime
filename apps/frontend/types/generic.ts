


export interface FilterParams {
  page?: number;
  pageSize?: number;
  q?: string;
  type?: string;
  [key: string]: string | number | boolean | undefined;
}


export interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  affectedServices: string[];
}


export interface UpdateItem {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  version?: string;
  type: 'feature' | 'bugfix' | 'security' | 'improvement';
  changes: string[];
}


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


export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}


export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}


export interface PaginatedResponse<T = unknown> {
  data: T[];
  meta: PaginationMeta;
}


export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}


export type GenericFunction<T extends readonly unknown[] = unknown[], R = unknown> = (...args: T) => R;


export type GenericRecord<T = unknown> = Record<string, T>;


export interface EventHandler<T = Event> {
  (event: T): void;
}


export interface FormData {
  [fieldName: string]: string | number | boolean | string[] | File | FileList | null | undefined;
}