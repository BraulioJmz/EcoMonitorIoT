import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const calculationMode = searchParams.get('calculationMode') || 'custom_time' // 'custom_time' o 'full_day'

    let whereClause: any = {}

    // Si hay rango de fechas, filtrar por ese rango
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      
      // Si el modo es "full_day", forzar las horas a 00:00 - 23:59
      if (calculationMode === 'full_day') {
        start.setUTCHours(0, 0, 0, 0)
        end.setUTCHours(23, 59, 59, 999)
      }
      
      whereClause.timestamp = {
        gte: start,
        lte: end
      }
    }

    // Obtener el promedio del factor de potencia
    // Si hay rango de fechas, calcular promedio del periodo
    // Si no hay rango, obtener la última medición
    if (startDateParam && endDateParam) {
      const measurements = await prisma.power_factor_measurements.findMany({
        where: whereClause,
        select: {
          power_factor: true,
        },
        orderBy: {
          timestamp: 'desc'
        }
      })

      if (!measurements || measurements.length === 0) {
        return NextResponse.json({
          power_factor: 0,
          timestamp: null,
          device_id: null
        })
      }

      // Calcular el promedio del factor de potencia (valor absoluto)
      const validMeasurements = measurements
        .map(m => {
          if (m.power_factor === null) return null
          const numericValue = Number(m.power_factor)
          return Number.isFinite(numericValue) ? Math.abs(numericValue) : null
        })
        .filter((value): value is number => value !== null)

      const sum = validMeasurements.reduce((acc, value) => acc + value, 0)
      const average = validMeasurements.length > 0 ? sum / validMeasurements.length : 0

      return NextResponse.json({
        power_factor: average,
        timestamp: null,
        device_id: null
      })
    }

    // Sin rango de fechas, obtener la última medición
    const latestMeasurement = await prisma.power_factor_measurements.findFirst({
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        power_factor: true,
        timestamp: true,
        device_id: true
      }
    })

    if (!latestMeasurement) {
      return NextResponse.json(
        { 
          power_factor: 0, 
          timestamp: null, 
          device_id: null 
        },
        { status: 200 }
      )
    }

    const dayStart = new Date(latestMeasurement.timestamp)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(latestMeasurement.timestamp)
    dayEnd.setUTCHours(23, 59, 59, 999)

    const dayMeasurements = await prisma.power_factor_measurements.findMany({
      where: {
        timestamp: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      select: {
        power_factor: true
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    const validDayMeasurements = dayMeasurements
      .map(m => {
        if (m.power_factor === null) return null
        const numericValue = Number(m.power_factor)
        return Number.isFinite(numericValue) ? Math.abs(numericValue) : null
      })
      .filter((value): value is number => value !== null)

    const daySum = validDayMeasurements.reduce((acc, value) => acc + value, 0)
    const dayAverage = validDayMeasurements.length > 0 ? daySum / validDayMeasurements.length : 0

    return NextResponse.json({
      power_factor: dayAverage,
      timestamp: latestMeasurement.timestamp,
      device_id: latestMeasurement.device_id
    })
  } catch (error) {
    console.error('Error fetching power factor:', error)
    return NextResponse.json(
      { error: 'Error al obtener factor de potencia' },
      { status: 500 }
    )
  }
}

