import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/settings/report-emails/[id] - Actualizar correo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { email, nombre, activo } = body

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

    // Verificar si otro registro ya usa este email
    const existing: any[] = await db.$queryRaw`
      SELECT id FROM reporte_emails 
      WHERE email = ${email} AND id != ${id}
    `

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Este correo ya está registrado' },
        { status: 400 }
      )
    }

    await db.$executeRaw`
      UPDATE reporte_emails
      SET email = ${email},
          nombre = ${nombre || null},
          activo = ${activo !== undefined ? activo : true},
          updated_at = NOW()
      WHERE id = ${id}
    `

    const updated: any[] = await db.$queryRaw`
      SELECT id, email, nombre, activo, created_at, updated_at
      FROM reporte_emails
      WHERE id = ${id}
    `

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Correo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error('Error updating report email:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el correo' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/report-emails/[id] - Eliminar correo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    await db.$executeRaw`
      DELETE FROM reporte_emails WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting report email:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el correo' },
      { status: 500 }
    )
  }
}
