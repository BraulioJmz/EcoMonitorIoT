import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PATCH /api/notifications/[id]/read - Marcar alerta como leída
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const alertaId = parseInt(id)

    const alerta = await prisma.alertas.update({
      where: { id: alertaId },
      data: { leida: true },
      include: {
        maquinas: {
          select: {
            id: true,
            nombre: true,
            codigo_branch: true
          }
        }
      }
    })

    return NextResponse.json(alerta)
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Error al marcar la notificación como leída' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Eliminar alerta (marcar como eliminada)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const alertaId = parseInt(id)

    const alerta = await prisma.alertas.update({
      where: { id: alertaId },
      data: { eliminada: true },
      include: {
        maquinas: {
          select: {
            id: true,
            nombre: true,
            codigo_branch: true
          }
        }
      }
    })

    return NextResponse.json(alerta)
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la notificación' },
      { status: 500 }
    )
  }
}
