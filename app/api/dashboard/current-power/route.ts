import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const machineIdsParam = searchParams.get('machineIds')
    const machineIds = machineIdsParam
      ? machineIdsParam
          .split(',')
          .map(id => id.trim())
          .filter(Boolean)
      : []

    const parseTableNameFromMachineId = (machineCode: string) => {
      if (!machineCode) return null
      let branchPart = machineCode
      if (machineCode.includes('-')) {
        const pieces = machineCode.split('-')
        branchPart = pieces[pieces.length - 1]
      }
      const numericPart = branchPart.replace(/[^0-9]/g, '')
      if (!numericPart) return null
      const index = Number.parseInt(numericPart, 10)
      if (!Number.isFinite(index)) return null
      const padded = String(index).padStart(2, '0')
      return `branch_br${padded}_avg5m`
    }

    const computeMachineAverageKw = async (tableName: string) => {
      if (!tableName) return null

      if (startDate && endDate) {
        const result: Array<{ avg_watts: number | null }> = await db.$queryRawUnsafe(
          `SELECT AVG(watts) AS avg_watts FROM ${tableName} WHERE "timestamp" >= $1::timestamptz AND "timestamp" <= $2::timestamptz`,
          new Date(startDate).toISOString(),
          new Date(endDate).toISOString()
        )
        if (!result || result.length === 0) return null
        const watts = result[0].avg_watts != null ? Number(result[0].avg_watts) : null
        if (watts == null || Number.isNaN(watts)) return null
        return watts / 1000
      }

      const rows: Array<{ watts: number | null }> = await db.$queryRawUnsafe(
        `SELECT watts FROM ${tableName} ORDER BY "timestamp" DESC LIMIT 1`
      )
      if (!rows || rows.length === 0) return null
      const watts = rows[0].watts != null ? Number(rows[0].watts) : null
      if (watts == null || Number.isNaN(watts)) return null
      return watts / 1000
    }

    if (machineIds.length > 0) {
      const machineAverages: number[] = []

      for (const machineCode of machineIds) {
        try {
          const tableName = parseTableNameFromMachineId(machineCode)
          if (!tableName) continue
          const avgKw = await computeMachineAverageKw(tableName)
          if (avgKw != null) {
            machineAverages.push(avgKw)
          }
        } catch (error) {
          console.error(`Error computing average for machine ${machineCode}:`, error)
          continue
        }
      }

      if (machineAverages.length === 0) {
        return NextResponse.json(
          { watts: 0, timestamp: null, device_id: null },
          { status: 200 }
        )
      }

      const averageKw =
        machineAverages.reduce((sum, value) => sum + value, 0) / machineAverages.length

      return NextResponse.json({
        watts: averageKw,
        timestamp: null,
        device_id: null,
      })
    }

    // Si hay fechas, calcular promedio de todas las mediciones del rango
    if (startDate && endDate) {
      const allMeasurements = await prisma.watts_measurements.findMany({
        where: {
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        select: {
          watts: true
        }
      })

      if (!allMeasurements || allMeasurements.length === 0) {
        return NextResponse.json(
          { watts: 0, timestamp: null, device_id: null },
          { status: 200 }
        )
      }

      // Calcular promedio
      const totalWatts = allMeasurements.reduce((sum, m) => sum + (Number(m.watts) || 0), 0)
      const averageWatts = totalWatts / allMeasurements.length
      const kw = averageWatts / 1000

      return NextResponse.json({
        watts: kw, // Promedio en kW
        timestamp: null,
        device_id: null
      })
    }

    // Sin fechas: obtener el último registro de watts_measurements
    const latestMeasurement = await prisma.watts_measurements.findFirst({
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        watts: true,
        timestamp: true,
        device_id: true
      }
    })

    if (!latestMeasurement) {
      return NextResponse.json(
        { watts: 0, timestamp: null, device_id: null },
        { status: 200 }
      )
    }

    // Convertir watts a kW
    const watts = Number(latestMeasurement.watts) || 0
    const kw = watts / 1000

    return NextResponse.json({
      watts: kw, // Última medición en kW
      timestamp: latestMeasurement.timestamp,
      device_id: latestMeasurement.device_id
    })
  } catch (error) {
    console.error('Error fetching current power:', error)
    return NextResponse.json(
      { error: 'Error al obtener la potencia actual' },
      { status: 500 }
    )
  }
}

