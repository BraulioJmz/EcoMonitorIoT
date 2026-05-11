import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/machines - Obtener todas las máquinas
export async function GET() {
  try {
    const machines = await prisma.maquinas.findMany({
      orderBy: {
        created_at: 'desc'
      }
    })
    return NextResponse.json(machines)
  } catch (error) {
    console.error('Error fetching machines:', error)
    return NextResponse.json(
      { error: 'Error al obtener las máquinas' },
      { status: 500 }
    )
  }
}

// POST /api/machines - Crear nueva máquina
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, codigo_branch, ct_ratio, potencia_maxima, estado } = body

    const newMachine = await prisma.maquinas.create({
      data: {
        nombre,
        codigo_branch,
        ct_ratio,
        potencia_maxima,
        estado,
        created_at: new Date(),
        updated_at: new Date(),
      },
    })

    return NextResponse.json(newMachine)
  } catch (error) {
    console.error('Error creating machine:', error)
    return NextResponse.json(
      { error: 'Error al crear la máquina' },
      { status: 500 }
    )
  }
}
