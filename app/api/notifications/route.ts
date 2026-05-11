import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/notifications - Obtener todas las alertas no eliminadas
export async function GET(request: NextRequest) {
  try {
    const alertas = await db.alertas.findMany({
      where: {
        eliminada: false
      },
      include: {
        maquinas: {
          select: {
            id: true,
            nombre: true,
            codigo_branch: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json(alertas)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Error al obtener las notificaciones' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications - Eliminar todas las notificaciones
export async function DELETE(request: NextRequest) {
  try {
    const result = await db.alertas.updateMany({
      where: {
        eliminada: false
      },
      data: {
        eliminada: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      count: result.count,
      message: `${result.count} notificación${result.count !== 1 ? 'es' : ''} eliminada${result.count !== 1 ? 's' : ''}`
    })
  } catch (error) {
    console.error('Error deleting all notifications:', error)
    return NextResponse.json(
      { error: 'Error al eliminar las notificaciones' },
      { status: 500 }
    )
  }
}
