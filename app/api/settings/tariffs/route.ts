import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/settings/tariffs - Obtener configuración de tarifas
export async function GET() {
  try {
    const tariffs = await prisma.tarifas.findFirst({
      orderBy: {
        created_at: 'desc'
      }
    })

    if (!tariffs) {
      // Si no hay tarifas, crear una configuración por defecto
      const defaultTariffs = await prisma.tarifas.create({
        data: {
          tarifa_pico: 0.15,
          tarifa_valle: 0.08,
          factor_co2: 0.444
        }
      })
      return NextResponse.json(defaultTariffs)
    }

    return NextResponse.json(tariffs)
  } catch (error) {
    console.error('Error fetching tariffs:', error)
    return NextResponse.json(
      { error: 'Error al obtener las tarifas' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/tariffs - Actualizar configuración de tarifas
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { tarifa_pico, tarifa_valle, factor_co2 } = body as {
      tarifa_pico?: number
      tarifa_valle?: number
      factor_co2?: number
    }

    // Obtener el registro más reciente
    const existingTariff = await prisma.tarifas.findFirst({
      orderBy: {
        created_at: 'desc'
      }
    })

    let updatedTariff

    const picoValue =
      typeof tarifa_pico === 'number'
        ? tarifa_pico
        : existingTariff?.tarifa_pico ?? 0.15
    const valleValue =
      typeof tarifa_valle === 'number'
        ? tarifa_valle
        : existingTariff?.tarifa_valle ?? 0.08
    const factorValue =
      typeof factor_co2 === 'number'
        ? factor_co2
        : existingTariff?.factor_co2 ?? 0.444

    if (existingTariff) {
      // Actualizar el registro existente
      updatedTariff = await prisma.tarifas.update({
        where: { id: existingTariff.id },
        data: {
          tarifa_pico: picoValue,
          tarifa_valle: valleValue,
          factor_co2: factorValue,
          updated_at: new Date()
        }
      })
    } else {
      // Crear un nuevo registro
      updatedTariff = await prisma.tarifas.create({
        data: {
          tarifa_pico: picoValue,
          tarifa_valle: valleValue,
          factor_co2: factorValue
        }
      })
    }

    return NextResponse.json(updatedTariff)
  } catch (error) {
    console.error('Error updating tariffs:', error)
    return NextResponse.json(
      { error: 'Error al actualizar las tarifas' },
      { status: 500 }
    )
  }
}
