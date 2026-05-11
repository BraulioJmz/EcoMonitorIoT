import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getChartTimeRange } from '@/lib/chart-time-range'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const machineIdsParam = searchParams.get('machineIds')
    const calculationMode = searchParams.get('calculationMode') || 'custom_time' // 'custom_time' o 'full_day'
    
    // Obtener IDs de máquinas seleccionadas
    const selectedMachineIds = machineIdsParam ? machineIdsParam.split(',') : []

    let start: Date
    let end: Date

    // Si no hay fechas, usar el último día disponible
    if (!startDateParam || !endDateParam) {
      const lastMeasurement = await prisma.watts_measurements.findFirst({
        orderBy: {
          timestamp: 'desc'
        },
        select: {
          timestamp: true
        }
      })

      if (!lastMeasurement) {
        console.log('❌ No hay mediciones en watts_measurements')
        return NextResponse.json(
          { data: [], error: 'No hay mediciones disponibles' },
          { status: 200 }
        )
      }

      // Obtener el inicio y fin del último día (usar UTC para evitar problemas de zona horaria)
      end = new Date(lastMeasurement.timestamp)
      end.setUTCHours(23, 59, 59, 999)
      
      start = new Date(lastMeasurement.timestamp)
      start.setUTCHours(0, 0, 0, 0)
      
      console.log('📅 Rango de fechas para último día:', { start, end })
    } else {
      start = new Date(startDateParam)
      end = new Date(endDateParam)
      
      // La gráfica siempre respeta el rango de horas seleccionado (no se ve afectada por calculationMode)
      console.log('📅 Rango del calendario:', { start, end })
    }

    // Obtener mediciones según máquinas seleccionadas
    let allMeasurements: Array<{ watts: number; timestamp: Date }>
    
    if (selectedMachineIds.length > 0) {
      // Verificar si todas las máquinas están seleccionadas
      const totalMachines = await prisma.maquinas.count()
      const allMachinesSelected = selectedMachineIds.length === totalMachines
      
      // Verificar si el rango es del día actual o muy reciente
      const now = new Date()
      const isDayRangeRecent = (end.getTime() - start.getTime()) <= (24 * 60 * 60 * 1000) // Menos de 24 horas
      
      console.log('🔍 Máquinas:', {
        selectedCount: selectedMachineIds.length,
        total: totalMachines,
        allSelected: allMachinesSelected,
        isDayRangeRecent
      })
      
      // Si todas las máquinas están seleccionadas Y el rango NO es reciente, usar watts_measurements
      if (allMachinesSelected && !isDayRangeRecent) {
        // Si todas las máquinas están seleccionadas, usar watts_measurements (más resolución)
        const measurements = await prisma.watts_measurements.findMany({
          where: {
            timestamp: {
              gte: start,
              lte: end
            }
          },
          orderBy: {
            timestamp: 'asc'
          },
          select: {
            watts: true,
            timestamp: true
          }
        })
        
        console.log('📊 Mediciones encontradas en watts_measurements:', measurements.length)
        
        allMeasurements = measurements.map(m => ({
          watts: m.watts ? Number(m.watts) : 0,
          timestamp: m.timestamp
        }))
      } else {
        // Usar tablas branch_brXX_avg5m para más resolución (día actual o selección parcial)
        // Si solo algunas máquinas están seleccionadas, obtener datos de cada branch y sumarlos
        const { db } = await import('@/lib/db')
        
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
        
        // Construir un mapa de timestamps con suma de potencias
        const timestampMap = new Map<string, number>()
        
        console.log(`📊 Consultando ${machines.length} tablas branch_brXX_avg5m...`)
        
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
            const branchData: Array<{ timestamp: Date; watts: any }> = await db.$queryRawUnsafe(
              `SELECT timestamp, watts FROM ${tableName} 
               WHERE timestamp >= $1 AND timestamp <= $2 
               ORDER BY timestamp ASC`,
              start,
              end
            )
            
            console.log(`  📈 ${tableName}: ${branchData.length} mediciones`)
            
            // Sumar las potencias por timestamp
            branchData.forEach(row => {
              const ts = new Date(row.timestamp).toISOString()
              const currentWatts = timestampMap.get(ts) || 0
              const watts = row.watts ? Number(row.watts) : 0
              timestampMap.set(ts, currentWatts + watts)
            })
          } catch (error) {
            console.error(`❌ Error fetching data for branch ${paddedBranchNumber}:`, error)
          }
        }
        
        console.log(`✅ Total de timestamps únicos: ${timestampMap.size}`)
        
        // Convertir el mapa a array y ordenar por timestamp
        allMeasurements = Array.from(timestampMap.entries())
          .map(([timestamp, watts]) => ({
            timestamp: new Date(timestamp),
            watts: watts
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      }
        
    } else {
      // Si no hay máquinas seleccionadas, usar watts_measurements (potencia total)
      const measurements = await prisma.watts_measurements.findMany({
        where: {
          timestamp: {
            gte: start,
            lte: end
          }
        },
        orderBy: {
          timestamp: 'asc'
        },
        select: {
          watts: true,
          timestamp: true
        }
      })
      
      allMeasurements = measurements.map(m => ({
        watts: m.watts ? Number(m.watts) : 0,
        timestamp: m.timestamp
      }))
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

    if (measurements.length > 0) {
      start = new Date(measurements[0].timestamp)
      end = new Date(measurements[measurements.length - 1].timestamp)
    }

    if (!measurements || measurements.length === 0) {
      return NextResponse.json(
        { data: [] },
        { status: 200 }
      )
    }

    // Determinar si es un rango de múltiples días
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const isMultiDay = daysDiff > 1

    // Reducir a 144 puntos usando agrupación por intervalos de tiempo
    const targetPoints = 630
    const totalMeasurements = measurements.length
    
    if (totalMeasurements <= targetPoints) {
      // Si hay menos de los puntos objetivo, retornarlas todas con timestamp real
      const data = measurements.map(m => ({
        timestamp: new Date(m.timestamp).toISOString(),
        power: Number(m.watts) / 1000 // Convertir a kW
      }))
      
      return NextResponse.json({ data })
    }

    // Crear 630 buckets de tiempo basados en el rango completo
    const timeRange = end.getTime() - start.getTime()
    const bucketSize = timeRange / targetPoints
    
    // Agrupar mediciones en buckets y calcular promedio
    const buckets: { [key: number]: { watts: number[], timestamp: Date } } = {}
    
    measurements.forEach(measurement => {
      const timestamp = new Date(measurement.timestamp).getTime()
      const relativeTime = timestamp - start.getTime()
      const bucketIndex = Math.floor(relativeTime / bucketSize)
      const bucketKey = Math.min(Math.max(0, bucketIndex), targetPoints - 1)
      
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { watts: [], timestamp: new Date(measurement.timestamp) }
      }
      
      buckets[bucketKey].watts.push(Number(measurement.watts))
      // Mantener el timestamp más representativo del bucket (promedio temporal)
      const bucketStartTime = start.getTime() + (bucketKey * bucketSize)
      const bucketCenterTime = bucketStartTime + (bucketSize / 2)
      if (Math.abs(timestamp - bucketCenterTime) < Math.abs(buckets[bucketKey].timestamp.getTime() - bucketCenterTime)) {
        buckets[bucketKey].timestamp = new Date(measurement.timestamp)
      }
    })

    // Convertir buckets a datos de gráfica - solo incluir buckets con datos
    const data = Object.keys(buckets)
      .map(Number)
      .sort((a, b) => a - b) // Ordenar por índice del bucket
      .map(bucketIndex => {
        const bucket = buckets[bucketIndex]
        if (bucket && bucket.watts.length > 0) {
          const avgWatts = bucket.watts.reduce((sum, w) => sum + w, 0) / bucket.watts.length
          return {
            timestamp: bucket.timestamp.toISOString(),
            power: avgWatts / 1000, // Convertir a kW
            bucketIndex // Mantener para ordenamiento si es necesario
          }
        }
        return null
      })
      .filter((item): item is { timestamp: string; power: number; bucketIndex: number } => item !== null)

    // Si hay más de 144 buckets con datos, distribuir uniformemente
    const finalData = data.length > targetPoints 
      ? (() => {
          const step = data.length / targetPoints
          const selected: typeof data = []
          for (let i = 0; i < targetPoints; i++) {
            const index = Math.floor(i * step)
            if (index < data.length) {
              selected.push(data[index])
            }
          }
          // Asegurar que el último punto siempre esté incluido
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

    // Ordenar por bucketIndex para asegurar orden cronológico
    finalData.sort((a, b) => (a?.bucketIndex ?? 0) - (b?.bucketIndex ?? 0))

    return NextResponse.json({ data: finalData.map(({ bucketIndex, ...rest }) => rest) })
  } catch (error) {
    console.error('Error fetching power data:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de potencia' },
      { status: 500 }
    )
  }
}

// Ya no formateamos fechas en el backend; enviamos ISO y el frontend formatea
