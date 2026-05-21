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
