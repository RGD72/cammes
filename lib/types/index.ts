export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'EXTERNAL_API_ERROR'
  | 'BUDGET_CONFIRMATION_REQUIRED'
  | 'INTERNAL'

export interface ApiError {
  code: ApiErrorCode
  message: string
  details?: Record<string, unknown>
  timestamp: string
  requestId: string
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export type UserRole = 'admin' | 'customer'

export interface UserProfile {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthSession {
  user_id: string
  role: UserRole
  email: string
}
