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

    // Obtener todas las máquinas activas
    const machines = await prisma.maquinas.findMany({
      where: {
        estado: true
      },
      select: {
        id: true,
        nombre: true,
        codigo_branch: true
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    if (!machines || machines.length === 0) {
      return NextResponse.json({ data: [], machines: [] }, { status: 200 })
    }

    let start: Date
    let end: Date
    let lastMeasurementDate: Date | null = null

    // Si hay fechas proporcionadas, usarlas
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
      // Usar la fecha de inicio para mostrar en la etiqueta
      lastMeasurementDate = new Date(startDate)
    } else {
      // Si no hay fechas, obtener el último día disponible
      for (const machine of machines) {
        try {
          let branchNumber = machine.codigo_branch
          if (branchNumber.includes('-')) {
            const parts = branchNumber.split('-')
            branchNumber = parts[1]
          }
          const paddedBranchNumber = String(parseInt(branchNumber)).padStart(2, '0')
          const tableName = `branch_br${paddedBranchNumber}_avg5m`
          
          const lastMeasurement: Array<{ timestamp: Date }> = await db.$queryRawUnsafe(
            `SELECT "timestamp" FROM ${tableName} ORDER BY "timestamp" DESC LIMIT 1`
          )
          
          if (lastMeasurement && lastMeasurement.length > 0) {
            const candidateDate = new Date(lastMeasurement[0].timestamp)
            if (!lastMeasurementDate || candidateDate > lastMeasurementDate) {
              lastMeasurementDate = candidateDate
            }
          }
        } catch (error) {
          continue
        }
      }

      if (!lastMeasurementDate) {
        return NextResponse.json({ 
          data: [], 
          machines: machines.map(m => ({ id: m.codigo_branch, name: m.nombre })),
          date: null
        }, { status: 200 })
      }

      // Usar el último día disponible (de 00:00 a 23:59:59 del último día con datos)
      start = new Date(lastMeasurementDate)
      start.setUTCHours(0, 0, 0, 0)
      
      end = new Date(lastMeasurementDate)
      end.setUTCHours(23, 59, 59, 999)
    }

    // Obtener datos de todas las máquinas
    const allMachineData: { [machineId: string]: { timestamp: Date; watts: number }[] } = {}

    for (const machine of machines) {
      try {
        // Extraer el número del codigo_branch (ej: "LA-001" -> "01", "LA-007" -> "07")
        let branchNumber = machine.codigo_branch

        // Extraer solo el número después del guion
        if (branchNumber.includes('-')) {
          const parts = branchNumber.split('-')
          branchNumber = parts[1]
        }

        // Convertir a número para quitar ceros a la izquierda, y luego rellenar a 2 dígitos
        const paddedBranchNumber = String(parseInt(branchNumber)).padStart(2, '0')

        // Construir el nombre de tabla: branch_br01_avg5m, branch_br02_avg5m, etc.
        const tableName = `branch_br${paddedBranchNumber}_avg5m`
        
        // Obtener todas las mediciones del día
        const rows: Array<{ watts: any; timestamp: Date }> = await db.$queryRawUnsafe(
          `SELECT watts, "timestamp" FROM ${tableName} 
           WHERE "timestamp" >= $1::timestamptz AND "timestamp" <= $2::timestamptz 
           ORDER BY "timestamp" ASC`,
          start.toISOString(),
          end.toISOString()
        )

        const allMeasurements = rows.map(r => ({
          watts: Number(r.watts) || 0,
          timestamp: new Date(r.timestamp)
        }))

        // Obtener horario configurado desde la BD
        const timeRange = await getChartTimeRange()
        
        // Filtrar mediciones según el horario configurado
        const measurements = allMeasurements.filter(m => {
          const date = new Date(m.timestamp)
          const hour = date.getUTCHours()
          const minute = date.getUTCMinutes()
          const timeInMinutes = hour * 60 + minute
          return timeInMinutes >= timeRange.startMinutes && timeInMinutes < timeRange.endMinutes
        })

        if (measurements.length > 0) {
          allMachineData[machine.codigo_branch] = measurements
        } else {
        }
      } catch (error) {
        // Si una tabla no existe o hay error, continuar con las demás
        console.error(`Error fetching data for machine ${machine.codigo_branch}:`, error)
        continue
      }
    }

    // Si no hay datos de ninguna máquina, retornar vacío pero con las máquinas disponibles y la fecha
    if (Object.keys(allMachineData).length === 0) {
      return NextResponse.json({ 
        data: [], 
        machines: machines.map(m => ({ id: m.codigo_branch, name: m.nombre })),
        date: lastMeasurementDate ? lastMeasurementDate.toISOString() : null
      }, { status: 200 })
    }

    // Combinar datos por timestamp
    // Crear un mapa de todos los timestamps únicos
    const allTimestamps = new Set<number>()
    Object.values(allMachineData).forEach(measurements => {
      measurements.forEach(m => allTimestamps.add(m.timestamp.getTime()))
    })

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)
    
    // Calcular número de días en el rango
    const daysInRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    // Usar 144 puntos fijos (12 horas * 12 mediciones por hora = 144 puntos)
    const targetPoints = Math.min(daysInRange * 144, 500) // Máximo 500 puntos para evitar sobrecarga

    // Si hay más timestamps que puntos objetivo, seleccionar uniformemente
    let selectedTimestamps: number[]
    if (sortedTimestamps.length <= targetPoints) {
      selectedTimestamps = sortedTimestamps
    } else {
      const step = sortedTimestamps.length / targetPoints
      selectedTimestamps = []
      for (let i = 0; i < targetPoints; i++) {
        const index = Math.floor(i * step)
        if (index < sortedTimestamps.length) {
          selectedTimestamps.push(sortedTimestamps[index])
        }
      }
      // Asegurar que el último timestamp esté incluido
      if (selectedTimestamps.length > 0 && sortedTimestamps.length > 0) {
        const lastTimestamp = sortedTimestamps[sortedTimestamps.length - 1]
        const lastSelected = selectedTimestamps[selectedTimestamps.length - 1]
        if (lastSelected !== lastTimestamp) {
          selectedTimestamps[selectedTimestamps.length - 1] = lastTimestamp
        }
      }
    }

    // Para cada timestamp seleccionado, obtener el valor de cada máquina
    const combinedData = selectedTimestamps.map((timestamp) => {
      // Usar el mismo formato que las otras gráficas: devolver timestamp ISO
      const dataPoint: any = {
        timestamp: new Date(timestamp).toISOString()
      }

      machines.forEach(machine => {
        const machineData = allMachineData[machine.codigo_branch]
        if (!machineData || machineData.length === 0) {
          dataPoint[`power_${machine.codigo_branch}`] = 0
          return
        }

        // Encontrar el valor más cercano al timestamp
        let closestMeasurement = machineData[0]
        let minDiff = Math.abs(machineData[0].timestamp.getTime() - timestamp)

        for (const measurement of machineData) {
          const diff = Math.abs(measurement.timestamp.getTime() - timestamp)
          if (diff < minDiff) {
            minDiff = diff
            closestMeasurement = measurement
          }
        }

        // Solo usar el valor si está dentro de 5 minutos (300000 ms)
        if (minDiff <= 5 * 60 * 1000) {
          dataPoint[`power_${machine.codigo_branch}`] = (closestMeasurement.watts / 1000) // Convertir a kW
        } else {
          dataPoint[`power_${machine.codigo_branch}`] = 0
        }
      })

      return dataPoint
    })

    
    return NextResponse.json({
      data: combinedData,
      machines: machines.map(m => ({ 
        id: m.codigo_branch, 
        name: m.nombre 
      })),
      date: lastMeasurementDate ? lastMeasurementDate.toISOString() : null
    })
  } catch (error: any) {
    console.error('Error fetching realtime power data:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Error al obtener datos de tiempo real' },
      { status: 500 }
    )
  }
}

