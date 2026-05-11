import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas que requieren autenticación
  const protectedRoutes = ['/dashboard', '/machines', '/reports', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Si no es una ruta protegida, permitir acceso
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Obtener token de la cookie de Neon Auth / Better Auth
  const hasAuthCookie = request.cookies.getAll().some(c => 
    c.name.includes('session_token') || c.name === 'auth_token'
  )

  if (!hasAuthCookie) {
    // Redirigir a login si no hay sesión
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Solo verificar que existe la cookie
  // La validación completa del token se hace en las API routes que sí soportan crypto
  return NextResponse.next()
}

// Configurar qué rutas ejecutan el middleware
export const config = {
  matcher: [
    // Excluye SOLO la ruta del cron job
    '/((?!api/reports/send-daily).*)',

    // Excluye rutas internas de Next.js
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}
