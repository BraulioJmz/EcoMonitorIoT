import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getChartTimeRange } from '@/lib/chart-time-range'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const machineId = searchParams.get('machineId')

    if (!machineId) {
      return NextResponse.json({ error: 'machineId es requerido' }, { status: 400 })
    }

    // Construcción del nombre de tabla dinámico: branch_br0[i]_avg5m
    const tableName = `branch_br0${machineId}_avg5m`

    let start: Date
    let end: Date

    // Si no hay fechas, usar el último día disponible
    if (!startDate || !endDate) {
      const lastMeasurement: Array<{ timestamp: Date }> = await db.$queryRawUnsafe(
        `SELECT "timestamp" FROM ${tableName} ORDER BY "timestamp" DESC LIMIT 1`
      )

      if (!lastMeasurement || lastMeasurement.length === 0) {
        return NextResponse.json({ data: [], error: 'No hay mediciones disponibles' }, { status: 200 })
      }

      end = new Date(lastMeasurement[0].timestamp)
      end.setUTCHours(23, 59, 59, 999)
      start = new Date(lastMeasurement[0].timestamp)
      start.setUTCHours(0, 0, 0, 0)
    } else {
      start = new Date(startDate)
      end = new Date(endDate)
    }

    // Obtener todas las mediciones en el rango
    const rows: Array<{ watts: any; timestamp: Date }> = await db.$queryRawUnsafe(
      `SELECT watts, "timestamp" FROM ${tableName} 
       WHERE "timestamp" >= $1::timestamptz AND "timestamp" <= $2::timestamptz 
       ORDER BY "timestamp" ASC`,
      start.toISOString(),
      end.toISOString()
    )

    const allMeasurements = rows.map(r => ({ 
      watts: r.watts, 
      timestamp: new Date(r.timestamp) 
    }))

    // Obtener horario configurado desde la BD
    const chartTimeRange = await getChartTimeRange()
    
    // Filtrar mediciones según el horario configurado
    const measurements = allMeasurements.filter(m => {
      const date = new Date(m.timestamp)
      const hour = date.getUTCHours()
      const minute = date.getUTCMinutes()
      const timeInMinutes = hour * 60 + minute
      return timeInMinutes >= chartTimeRange.startMinutes && timeInMinutes < chartTimeRange.endMinutes
    })

    if (!measurements || measurements.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    // Actualizar start y end basándose en los datos filtrados
    if (measurements.length > 0) {
      start = new Date(measurements[0].timestamp)
      end = new Date(measurements[measurements.length - 1].timestamp)
    }

    // Parámetros de reducción
    const targetPoints = 144
    const totalMeasurements = measurements.length

    if (totalMeasurements <= targetPoints) {
      const data = measurements.map(m => ({
        timestamp: m.timestamp.toISOString(),
        power: (Number(m.watts) || 0) / 1000 // Convertir a kW
      }))
      return NextResponse.json({ data })
    }

    // Bucketing uniforme por tiempo
    const timeRange = end.getTime() - start.getTime()
    const bucketSize = timeRange / targetPoints

    const buckets: { [key: number]: { values: number[]; timestamp: Date } } = {}

    measurements.forEach(measurement => {
      const t = measurement.timestamp.getTime()
      const rel = t - start.getTime()
      const bucketIndex = Math.floor(rel / bucketSize)
      const key = Math.min(Math.max(0, bucketIndex), targetPoints - 1)
      if (!buckets[key]) {
        buckets[key] = { values: [], timestamp: measurement.timestamp }
      }
      buckets[key].values.push((Number(measurement.watts) || 0) / 1000) // Convertir a kW
      const bucketStartTime = start.getTime() + key * bucketSize
      const bucketCenterTime = bucketStartTime + bucketSize / 2
      if (Math.abs(t - bucketCenterTime) < Math.abs(buckets[key].timestamp.getTime() - bucketCenterTime)) {
        buckets[key].timestamp = measurement.timestamp
      }
    })

    const data = Object.keys(buckets)
      .map(Number)
      .sort((a, b) => a - b)
      .map(bucketIndex => {
        const b = buckets[bucketIndex]
        if (b && b.values.length > 0) {
          const avg = b.values.reduce((s, v) => s + v, 0) / b.values.length
          return { timestamp: b.timestamp.toISOString(), power: avg, bucketIndex }
        }
        return null
      })
      .filter((i): i is { timestamp: string; power: number; bucketIndex: number } => i !== null)

    const finalData = data.length > targetPoints
      ? (() => {
          const step = data.length / targetPoints
          const selected: typeof data = []
          for (let i = 0; i < targetPoints; i++) {
            const index = Math.floor(i * step)
            if (index < data.length) selected.push(data[index])
          }
          if (selected.length > 0 && data.length > 0) {
            const lastData = data[data.length - 1]
            const lastSelected = selected[selected.length - 1]
            if (lastSelected && lastData && lastSelected.bucketIndex !== lastData.bucketIndex) {
              selected[selected.length - 1] = lastData
            }
          }
          return selected
        })()
      : data

    finalData.sort((a, b) => (a?.bucketIndex ?? 0) - (b?.bucketIndex ?? 0))

    return NextResponse.json({ data: finalData.map(({ bucketIndex, ...rest }) => rest) })
  } catch (error: any) {
    console.error('Error fetching branch power data:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Error al obtener datos de potencia' },
      { status: 500 }
    )
  }
}

