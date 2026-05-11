import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Crear respuesta de logout
    const response = NextResponse.json({
      message: 'Logout exitoso',
    })

    // Eliminar cookie de autenticación
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Cambiado de "strict" a "lax" para consistencia
      maxAge: 0, // Expirar inmediatamente
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error en logout:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
