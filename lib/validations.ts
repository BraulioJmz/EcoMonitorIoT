import { z } from 'zod'

/**
 * Esquema de validación para login
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido')
    .max(255, 'El email es demasiado largo'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña es demasiado larga'),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Valida y parsea los datos de login
 */
export function validateLogin(data: unknown): { success: true; data: LoginInput } | { success: false; error: string } {
  try {
    const result = loginSchema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Datos inválidos',
      }
    }
    return { success: false, error: 'Error de validación' }
  }
}

