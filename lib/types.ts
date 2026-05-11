/**
 * Tipos compartidos para el sistema de autenticación
 */

export interface User {
  id: number
  username: string
  email: string
  role: string
  created_at?: Date
  updated_at?: Date
}

export interface LoginResponse {
  message: string
  user: {
    id: number
    username: string
    role: string
  }
}

export interface ErrorResponse {
  error: string
}

export type UserRole = 'admin' | 'user' | 'viewer'

/**
 * Configuración de seguridad
 */
export interface SecurityConfig {
  jwtSecret: string
  tokenExpiresIn: string
  rateLimit: {
    maxAttempts: number
    windowMs: number
  }
  cookie: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'strict' | 'lax' | 'none'
    maxAge: number
  }
}

/**
 * Log de auditoría
 */
export interface AuditLog {
  id?: number
  user_id: number
  action: string
  resource: string
  ip_address?: string
  user_agent?: string
  created_at: Date
}

