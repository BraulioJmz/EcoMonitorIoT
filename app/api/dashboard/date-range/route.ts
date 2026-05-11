import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Obtener la primera medición
    const firstMeasurement = await prisma.watts_measurements.findFirst({
      orderBy: {
        timestamp: 'asc'
      },
      select: {
        timestamp: true
      }
    })

    // Obtener la última medición
    const lastMeasurement = await prisma.watts_measurements.findFirst({
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        timestamp: true
      }
    })

    if (!firstMeasurement || !lastMeasurement) {
      return NextResponse.json(
        { 
          startDate: null, 
          endDate: null,
          error: 'No hay mediciones disponibles'
        },
        { status: 200 }
      )
    }

    // Mantener exactamente los timestamps tal como vienen de la BD
    const startDate = firstMeasurement.timestamp
    const endDate = lastMeasurement.timestamp
    
    // Log para debugging (manteniendo horas originales)
    console.log('Rango de fechas (horas originales BD):', {
      primeraMedicion: firstMeasurement.timestamp,
      ultimaMedicion: lastMeasurement.timestamp,
      startDate: startDate,
      endDate: endDate
    })
    
    return NextResponse.json({
      startDate: startDate,
      endDate: endDate
    })
  } catch (error) {
    console.error('Error fetching date range:', error)
    return NextResponse.json(
      { error: 'Error al obtener rango de fechas' },
      { status: 500 }
    )
  }
}

