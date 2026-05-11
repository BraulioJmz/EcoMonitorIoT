import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// Tipos de seguridad
export interface JWTPayload {
  id: number
  username: string
  email: string
  role: string
  iat?: number
  exp?: number
}

export interface AuthResult {
  valid: boolean
  user?: {
    id: number
    username: string
    email: string
    role: string
  }
  error?: string
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): AuthResult {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('JWT_SECRET no está configurado')
      return { valid: false, error: 'Error de configuración del servidor' }
    }

    const decoded = jwt.verify(token, secret) as JWTPayload
    
    return {
      valid: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
      },
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expirado' }
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Token inválido' }
    }
    return { valid: false, error: 'Error verificando token' }
  }
}

/**
 * Obtiene el usuario autenticado desde una request
 */
export async function getAuthUser(request: NextRequest): Promise<AuthResult> {
  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    return { valid: false, error: 'No hay token de autenticación' }
  }

  return verifyToken(token)
}

/**
 * Middleware helper para verificar autenticación
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ success: true; user: JWTPayload } | { success: false; response: NextResponse }> {
  const authResult = await getAuthUser(request)

  if (!authResult.valid || !authResult.user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: authResult.error || 'No autorizado' },
        { status: 401 }
      ),
    }
  }

  return {
    success: true,
    user: authResult.user,
  }
}

/**
 * Middleware helper para verificar roles específicos
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ success: true; user: JWTPayload } | { success: false; response: NextResponse }> {
  const authCheck = await requireAuth(request)

  if (!authCheck.success) {
    return authCheck
  }

  if (!allowedRoles.includes(authCheck.user.role)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      ),
    }
  }

  return authCheck
}

/**
 * Crea un token JWT
 */
export function createToken(payload: { id: number; username: string; email: string; role: string }): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado')
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.TOKEN_EXPIRES_IN || '8h',
  } as any)
}

/**
 * Rate limiting mejorado con persistencia en base de datos
 * NOTA: Por ahora usa rate limiting en memoria (fallback)
 * En producción implementar con Redis o tabla de base de datos
 */
export async function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 60 * 1000 // 1 hora por defecto
): Promise<{ allowed: boolean; attemptsRemaining: number; resetAt: Date }> {
  // Por ahora siempre permite el acceso
  // El rate limiting real se maneja en memoria en app/api/auth/login/route.ts
  const now = new Date()
  return { 
    allowed: true, 
    attemptsRemaining: maxAttempts, 
    resetAt: new Date(now.getTime() + windowMs) 
  }
}

/**
 * Registra un intento de login
 * NOTA: Por ahora es un no-op (sin operación)
 * En producción implementar con Redis o tabla de base de datos
 */
export async function recordLoginAttempt(
  identifier: string,
  success: boolean
): Promise<void> {
  // Por ahora no hace nada
  // El registro de intentos se maneja en memoria en app/api/auth/login/route.ts
  // En producción, implementar con Redis o tabla de base de datos
}

