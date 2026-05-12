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
      const lastMeasurement = await prisma.current_measurements.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true }
      })

      if (!lastMeasurement) {
        return NextResponse.json(
          { data: [], error: 'No hay mediciones de corriente disponibles' },
          { status: 200 }
        )
      }

      end = new Date(lastMeasurement.timestamp)
      end.setUTCHours(23, 59, 59, 999)
      start = new Date(lastMeasurement.timestamp)
      start.setUTCHours(0, 0, 0, 0)
      
      console.log('📅 Corriente - Rango de fechas para último día:', { start, end })
    } else {
      start = new Date(startDate)
      end = new Date(endDate)
      
      console.log('📅 Corriente - Rango del calendario:', { start, end })
    }

    type Measurement = {
      timestamp: Date
      current: any
      line1?: any
      line2?: any
      line3?: any
    }

    let allMeasurements: Measurement[]
    // Incluir datos de líneas si hay machineId único O si no hay máquinas seleccionadas (todas las máquinas)
    const includeLineData = Boolean(machineId) || selectedMachineIds.length === 0

    if (selectedMachineIds.length > 0) {
      // Si hay múltiples máquinas seleccionadas, obtener de cada tabla branch_brXX_avg5m y sumar
      console.log(`🔍 Corriente - Consultando ${selectedMachineIds.length} tablas branch_brXX_avg5m...`)
      
      // Construir un mapa de timestamps con suma de corrientes
      const timestampMap = new Map<string, number>()
      
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
          const branchData: Array<{ timestamp: Date; equivalent_current: any }> = await db.$queryRawUnsafe(
            `SELECT timestamp, equivalent_current FROM ${tableName} 
             WHERE timestamp >= $1 AND timestamp <= $2 
             ORDER BY timestamp ASC`,
            start,
            end
          )
          
          console.log(`  📈 ${tableName}: ${branchData.length} mediciones de corriente`)
          
          // Sumar corrientes por timestamp
          branchData.forEach(row => {
            const ts = new Date(row.timestamp).toISOString()
            const current = row.equivalent_current ? Number(row.equivalent_current) : 0
            const currentSum = timestampMap.get(ts) || 0
            timestampMap.set(ts, currentSum + current)
          })
        } catch (error) {
          console.error(`❌ Error fetching current data for branch ${paddedBranchNumber}:`, error)
        }
      }
      
      console.log(`✅ Total de timestamps únicos: ${timestampMap.size}`)
      
      // Convertir el mapa a array con la suma total por timestamp
      allMeasurements = Array.from(timestampMap.entries())
        .map(([timestamp, totalCurrent]) => ({
          timestamp: new Date(timestamp),
          current: totalCurrent
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        
    } else if (machineId) {
      // Si hay machineId único, obtener corrientes por línea de line_current_matrix
      const paddedBranchNumber = String(parseInt(machineId, 10)).padStart(2, '0')
      
      console.log(`🔍 Corriente - Consultando line_current_matrix para br${paddedBranchNumber}...`)
      
      // Construir las columnas dinámicamente
      const columnL1 = `br${paddedBranchNumber}_current_l1`
      const columnL2 = `br${paddedBranchNumber}_current_l2`
      const columnL3 = `br${paddedBranchNumber}_current_l3`
      
      const rows: Array<{ timestamp: Date; [key: string]: any }> = await db.$queryRawUnsafe(
        `SELECT timestamp, "${columnL1}" as line1, "${columnL2}" as line2, "${columnL3}" as line3
         FROM line_current_matrix
         WHERE timestamp >= $1::timestamp AND timestamp <= $2::timestamp
         ORDER BY timestamp ASC`,
        start.toISOString(),
        end.toISOString()
      )
      
      console.log(`  📈 line_current_matrix br${paddedBranchNumber}: ${rows.length} mediciones`)
      
      allMeasurements = rows.map(r => {
        const l1 = Number(r.line1) || 0
        const l2 = Number(r.line2) || 0
        const l3 = Number(r.line3) || 0
        const average = (l1 + l2 + l3) / 3
        return {
          current: average, // Promedio de las 3 líneas
          line1: r.line1,
          line2: r.line2,
          line3: r.line3,
          timestamp: r.timestamp
        }
      })
    } else {
      // Sin máquinas seleccionadas (todas las máquinas), usar line_current_matrix sumando br01+br02+br03
      console.log('🔍 Corriente - Consultando line_current_matrix para todas las máquinas...')
      const rows = await prisma.line_current_matrix.findMany({
        where: { timestamp: { gte: start, lte: end } },
        orderBy: { timestamp: 'asc' },
        select: { 
          br01_current_l1: true,
          br01_current_l2: true,
          br01_current_l3: true,
          br02_current_l1: true,
          br02_current_l2: true,
          br02_current_l3: true,
          br03_current_l1: true,
          br03_current_l2: true,
          br03_current_l3: true,
          timestamp: true 
        }
      })
      console.log(`  📈 line_current_matrix: ${rows.length} mediciones`)
      allMeasurements = rows.map(r => {
        // Sumar las 3 máquinas por línea
        const l1 = (Number(r.br01_current_l1) || 0) + (Number(r.br02_current_l1) || 0) + (Number(r.br03_current_l1) || 0)
        const l2 = (Number(r.br01_current_l2) || 0) + (Number(r.br02_current_l2) || 0) + (Number(r.br03_current_l2) || 0)
        const l3 = (Number(r.br01_current_l3) || 0) + (Number(r.br02_current_l3) || 0) + (Number(r.br03_current_l3) || 0)
        const average = (l1 + l2 + l3) / 3
        return { 
          current: average,
          line1: l1,
          line2: l2,
          line3: l3,
          timestamp: r.timestamp 
        }
      })
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

    const targetPoints = 144
    const totalMeasurements = measurements.length

    if (totalMeasurements <= targetPoints) {
      const data = measurements.map(m => ({
        timestamp: new Date(m.timestamp).toISOString(),
        current: Number(m.current) || 0,
        line1: includeLineData ? toNumberOrNull(m.line1) : undefined,
        line2: includeLineData ? toNumberOrNull(m.line2) : undefined,
        line3: includeLineData ? toNumberOrNull(m.line3) : undefined
      }))
      return NextResponse.json({ data })
    }

    // Bucketing uniforme
    const timeRange = end.getTime() - start.getTime()
    const bucketSize = timeRange / targetPoints

    const buckets: {
      [key: number]: {
        values: number[]
        line1: number[]
        line2: number[]
        line3: number[]
        timestamp: Date
      }
    } = {}

    measurements.forEach(measurement => {
      const t = new Date(measurement.timestamp).getTime()
      const rel = t - start.getTime()
      const bucketIndex = Math.floor(rel / bucketSize)
      const key = Math.min(Math.max(0, bucketIndex), targetPoints - 1)
      if (!buckets[key]) {
        buckets[key] = {
          values: [],
          line1: [],
          line2: [],
          line3: [],
          timestamp: new Date(measurement.timestamp)
        }
      }
      buckets[key].values.push(Number(measurement.current) || 0)
      if (includeLineData) {
        const val1 = toNumberOrNull(measurement.line1)
        const val2 = toNumberOrNull(measurement.line2)
        const val3 = toNumberOrNull(measurement.line3)
        if (val1 !== null) buckets[key].line1.push(val1)
        if (val2 !== null) buckets[key].line2.push(val2)
        if (val3 !== null) buckets[key].line3.push(val3)
      }
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
          const avgLine1 = b.line1.length > 0 ? b.line1.reduce((s, v) => s + v, 0) / b.line1.length : null
          const avgLine2 = b.line2.length > 0 ? b.line2.reduce((s, v) => s + v, 0) / b.line2.length : null
          const avgLine3 = b.line3.length > 0 ? b.line3.reduce((s, v) => s + v, 0) / b.line3.length : null
          return {
            timestamp: b.timestamp.toISOString(),
            current: avg,
            line1: includeLineData ? avgLine1 : undefined,
            line2: includeLineData ? avgLine2 : undefined,
            line3: includeLineData ? avgLine3 : undefined,
            bucketIndex
          }
        }
        return null
      })
      .filter((i): i is {
        timestamp: string
        current: number
        line1?: number | null
        line2?: number | null
        line3?: number | null
        bucketIndex: number
      } => i !== null)

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

    return NextResponse.json({
      data: finalData.map(({ bucketIndex, ...rest }) => rest)
    })
  } catch (error) {
    console.error('Error fetching current data:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de corriente' },
      { status: 500 }
    )
  }
}

function toNumberOrNull(value: any): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}


