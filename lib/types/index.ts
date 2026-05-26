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

export type OrderStatus = 'received' | 'viewed'

export interface Order {
  id: string
  order_number: string
  brand_id: string
  customer_user_id: string
  customer_name: string
  total_brl: number
  status: OrderStatus
  client_idempotency_key: string
  submitted_at: string
  viewed_at: string | null
  pdf_path: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  reference: string
  description: string
  color: string | null
  size: string | null
  quantity: number
  customer_name: string
  unit_price_brl: number
  total_brl: number
  display_order: number
}

export interface AdminNotification {
  id: string
  admin_user_id: string
  type: string
  order_id: string | null
  brand_id: string | null
  read: boolean
  created_at: string
}

export type UserRole = 'admin' | 'customer'

export interface UserProfile {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  terms_accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface AuthSession {
  user_id: string
  role: UserRole
  email: string
}
