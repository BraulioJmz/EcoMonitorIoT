import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { getChartTimeRange } from '@/lib/chart-time-range'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const machineId = searchParams.get('machineId')
    const machineIdsParam = searchParams.get('machineIds')

    // Obtener IDs de máquinas seleccionadas
    const selectedMachineIds = machineIdsParam ? machineIdsParam.split(',') : []

    let start: Date
    let end: Date

    // Si no hay fechas, usar el último día disponible
    if (!startDate || !endDate) {
      const lastMeasurement = await prisma.voltage_measurements.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true }
      })

      if (!lastMeasurement) {
        return NextResponse.json(
          { data: [], error: 'No hay mediciones de voltaje disponibles' },
          { status: 200 }
        )
      }

      end = new Date(lastMeasurement.timestamp)
      end.setUTCHours(23, 59, 59, 999)
      start = new Date(lastMeasurement.timestamp)
      start.setUTCHours(0, 0, 0, 0)
      
      console.log('📅 Voltaje - Rango de fechas para último día:', { start, end })
    } else {
      start = new Date(startDate)
      end = new Date(endDate)
      
      console.log('📅 Voltaje - Rango del calendario:', { start, end })
    }

    // Obtener todas las mediciones en el rango
    let allMeasurements: Array<{ voltage: any; timestamp: Date }>

    if (selectedMachineIds.length > 0) {
      // Si hay máquinas seleccionadas, obtener de cada tabla branch_brXX_avg5m y promediar
      console.log(`🔍 Voltaje - Consultando ${selectedMachineIds.length} tablas branch_brXX_avg5m...`)
      
      // Construir un mapa de timestamps con promedio de voltajes
      const timestampMap = new Map<string, number[]>()
      
      // Obtener información de las máquinas seleccionadas por codigo_branch
      const machines = await prisma.maquinas.findMany({
        where: {
          codigo_branch: { in: selectedMachineIds }
        },
        select: {
          id: true,
          codigo_branch: true
        }
      })
      
      // Iterar sobre cada máquina y obtener sus datos
      for (const machine of machines) {
        let branchNumber = machine.codigo_branch
        if (branchNumber.includes('-')) {
          const parts = branchNumber.split('-')
          branchNumber = parts[1]
        }
        const paddedBranchNumber = String(parseInt(branchNumber)).padStart(2, '0')
        const tableName = `branch_br${paddedBranchNumber}_avg5m`
        
        try {
          // Consultar la tabla específica del branch
          const branchData: Array<{ timestamp: Date; equivalent_voltage: any }> = await db.$queryRawUnsafe(
            `SELECT timestamp, equivalent_voltage FROM ${tableName} 
             WHERE timestamp >= $1 AND timestamp <= $2 
             ORDER BY timestamp ASC`,
            start,
            end
          )
          
          console.log(`  📈 ${tableName}: ${branchData.length} mediciones de voltaje`)
          
          // Acumular voltajes por timestamp para promediar
          branchData.forEach(row => {
            const ts = new Date(row.timestamp).toISOString()
            if (!timestampMap.has(ts)) {
              timestampMap.set(ts, [])
            }
            const voltage = row.equivalent_voltage ? Number(row.equivalent_voltage) : 0
            timestampMap.get(ts)!.push(voltage)
          })
        } catch (error) {
          console.error(`❌ Error fetching voltage data for branch ${paddedBranchNumber}:`, error)
        }
      }
      
      console.log(`✅ Total de timestamps únicos: ${timestampMap.size}`)
      
      // Convertir el mapa a array y calcular promedio por timestamp
      allMeasurements = Array.from(timestampMap.entries())
        .map(([timestamp, voltages]) => {
          const avgVoltage = voltages.reduce((sum, v) => sum + v, 0) / voltages.length
          return {
            timestamp: new Date(timestamp),
            voltage: avgVoltage
          }
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        
    } else if (machineId) {
      // Compatibilidad con machineId único (legacy)
      const two = String(parseInt(machineId, 10)).padStart(2, '0')
      const branchModel = (prisma as any)[`branch_br${two}_avg5m`]
      if (!branchModel?.findMany) {
        return NextResponse.json({ data: [], error: `Modelo branch_br${two}_avg5m no encontrado` }, { status: 200 })
      }
      const rows = await branchModel.findMany({
        where: { timestamp: { gte: start, lte: end } },
        orderBy: { timestamp: 'asc' },
        select: { equivalent_voltage: true, timestamp: true }
      })
      allMeasurements = rows.map((r: any) => ({ voltage: r.equivalent_voltage, timestamp: r.timestamp }))
    } else {
      // Sin máquinas seleccionadas, usar voltage_measurements (voltaje general)
      const rows = await prisma.voltage_measurements.findMany({
        where: {
          timestamp: { gte: start, lte: end }
        },
        orderBy: { timestamp: 'asc' },
        select: { voltage_v: true, timestamp: true }
      })
      allMeasurements = rows.map((r: any) => ({ voltage: r.voltage_v, timestamp: r.timestamp }))
    }

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
        timestamp: new Date(m.timestamp).toISOString(),
        voltage: Number(m.voltage) || 0
      }))
      return NextResponse.json({ data })
    }

    // Bucketing uniforme por tiempo similar a potencia
    const timeRange = end.getTime() - start.getTime()
    const bucketSize = timeRange / targetPoints

    const buckets: { [key: number]: { values: number[]; timestamp: Date } } = {}

    measurements.forEach(measurement => {
      const t = new Date(measurement.timestamp).getTime()
      const rel = t - start.getTime()
      const bucketIndex = Math.floor(rel / bucketSize)
      const key = Math.min(Math.max(0, bucketIndex), targetPoints - 1)
      if (!buckets[key]) {
        buckets[key] = { values: [], timestamp: new Date(measurement.timestamp) }
      }
      buckets[key].values.push(Number(measurement.voltage) || 0)
      const bucketStartTime = start.getTime() + key * bucketSize
      const bucketCenterTime = bucketStartTime + bucketSize / 2
      if (Math.abs(t - bucketCenterTime) < Math.abs(buckets[key].timestamp.getTime() - bucketCenterTime)) {
        buckets[key].timestamp = new Date(measurement.timestamp)
      }
    })

    const data = Object.keys(buckets)
      .map(Number)
      .sort((a, b) => a - b)
      .map(bucketIndex => {
        const b = buckets[bucketIndex]
        if (b && b.values.length > 0) {
          const avg = b.values.reduce((s, v) => s + v, 0) / b.values.length
          return { timestamp: b.timestamp.toISOString(), voltage: avg, bucketIndex }
        }
        return null
      })
      .filter((i): i is { timestamp: string; voltage: number; bucketIndex: number } => i !== null)

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
  } catch (error) {
    console.error('Error fetching voltage data:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de voltaje' },
      { status: 500 }
    )
  }
}


