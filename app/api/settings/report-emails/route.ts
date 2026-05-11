import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings/report-emails - Obtener todos los correos configurados
export async function GET() {
  try {
    const emails = await db.$queryRaw`
      SELECT id, email, nombre, activo, created_at, updated_at
      FROM reporte_emails
      ORDER BY created_at DESC
    `

    return NextResponse.json(emails)
  } catch (error) {
    console.error('Error fetching report emails:', error)
    return NextResponse.json(
      { error: 'Error al obtener los correos' },
      { status: 500 }
    )
  }
}

// POST /api/settings/report-emails - Agregar nuevo correo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, nombre } = body

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'El correo es requerido' },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de correo inválido' },
        { status: 400 }
      )
    }

    // Verificar si ya existe
    const existing: any[] = await db.$queryRaw`
      SELECT id FROM reporte_emails WHERE email = ${email}
    `

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Este correo ya está registrado' },
        { status: 400 }
      )
    }

    await db.$executeRaw`
      INSERT INTO reporte_emails (email, nombre, activo)
      VALUES (${email}, ${nombre || null}, true)
    `

    const newEmail: any[] = await db.$queryRaw`
      SELECT id, email, nombre, activo, created_at, updated_at
      FROM reporte_emails
      WHERE email = ${email}
    `

    return NextResponse.json(newEmail[0], { status: 201 })
  } catch (error) {
    console.error('Error creating report email:', error)
    return NextResponse.json(
      { error: 'Error al agregar el correo' },
      { status: 500 }
    )
  }
}
