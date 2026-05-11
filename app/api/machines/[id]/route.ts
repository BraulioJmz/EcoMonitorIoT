import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/machines/[id] - Obtener máquina específica
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const machineId = parseInt(id)
    const machine = await prisma.maquinas.findUnique({ where: { id: machineId } })
    if (!machine) {
      return NextResponse.json({ error: 'Máquina no encontrada' }, { status: 404 })
    }
    return NextResponse.json(machine)
  } catch (error) {
    console.error('Error fetching machine:', error)
    return NextResponse.json(
      { error: 'Error al obtener la máquina' },
      { status: 500 }
    )
  }
}

// PATCH /api/machines/[id] - Actualizar campo específico de máquina (ej: favorita)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const machineId = parseInt(id)
    const body = await request.json()
    const { favorita } = body

    const updatedMachine = await prisma.maquinas.update({
      where: { id: machineId },
      data: {
        favorita,
        updated_at: new Date(),
      },
    })

    return NextResponse.json(updatedMachine)
  } catch (error) {
    console.error('Error updating machine favorite:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el estado de favorita' },
      { status: 500 }
    )
  }
}

// PUT /api/machines/[id] - Actualizar máquina específica
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const machineId = parseInt(id)
    const body = await request.json()
    const { nombre, codigo_branch, ct_ratio, potencia_maxima, estado } = body

    const updatedMachine = await prisma.maquinas.update({
      where: { id: machineId },
      data: {
        nombre,
        codigo_branch,
        ct_ratio,
        potencia_maxima,
        estado,
        updated_at: new Date(),
      },
    })

    return NextResponse.json(updatedMachine)
  } catch (error) {
    console.error('Error updating machine:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la máquina' },
      { status: 500 }
    )
  }
}

// DELETE /api/machines/[id] - Eliminar máquina específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const machineId = parseInt(id)

    await prisma.maquinas.delete({
      where: { id: machineId },
    })

    return NextResponse.json({ message: 'Máquina eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting machine:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la máquina' },
      { status: 500 }
    )
  }
}
