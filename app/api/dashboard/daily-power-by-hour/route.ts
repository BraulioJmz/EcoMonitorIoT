import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { data: [], error: 'Se requiere un rango de fechas' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Obtener configuración de horario laboral
    const chartTimeRangeConfig = await prisma.configuracion_alertas.findFirst({
      select: { hora_inicio_minutos: true, hora_fin_minutos: true }
    })
    const startMinutes = chartTimeRangeConfig?.hora_inicio_minutos ?? 450 // Default 7:30 AM
    const endMinutes = chartTimeRangeConfig?.hora_fin_minutos ?? 1170 // Default 7:30 PM
    
    const startHours = Math.floor(startMinutes / 60)
    const startMins = startMinutes % 60
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60

    console.log(`⏰ Potencia por hora: Usando horario laboral ${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`)

    // Obtener todas las mediciones en el rango
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

    if (!measurements || measurements.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    // Agrupar por día y hora (redondeada a 5 minutos), filtrando por horario laboral
    const groupedByDay: { [day: string]: { [hour: string]: number[] } } = {}

    measurements.forEach(m => {
      const date = new Date(m.timestamp)
      
      // Filtrar solo mediciones dentro del horario laboral
      const timeInMinutes = date.getUTCHours() * 60 + date.getUTCMinutes()
      if (timeInMinutes < startMinutes || timeInMinutes > endMinutes) {
        return // Saltar esta medición
      }
      
      const dayKey = date.toISOString().split('T')[0] // YYYY-MM-DD
      
      // Redondear a intervalos de 5 minutos
      const minutes = date.getUTCMinutes()
      const roundedMinutes = Math.floor(minutes / 5) * 5
      const hourKey = `${String(date.getUTCHours()).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`
      
      if (!groupedByDay[dayKey]) {
        groupedByDay[dayKey] = {}
      }
      if (!groupedByDay[dayKey][hourKey]) {
        groupedByDay[dayKey][hourKey] = []
      }
      groupedByDay[dayKey][hourKey].push(Number(m.watts) / 1000) // Convertir a kW
    })

    // Obtener todas las horas únicas
    const allHours = new Set<string>()
    Object.values(groupedByDay).forEach(dayData => {
      Object.keys(dayData).forEach(hour => allHours.add(hour))
    })
    const sortedHours = Array.from(allHours).sort()

    // Crear estructura de datos para la gráfica
    // Cada fila representa una hora, cada columna representa un día
    const chartData = sortedHours.map(hour => {
      const row: any = { time: hour }
      
      Object.keys(groupedByDay).sort().forEach(day => {
        const dayData = groupedByDay[day]
        const hourData = dayData[hour]
        if (hourData && hourData.length > 0) {
          // Calcular promedio para esa hora
          const avg = hourData.reduce((sum, val) => sum + val, 0) / hourData.length
          row[day] = Number(avg.toFixed(2))
        } else {
          row[day] = null
        }
      })
      
      return row
    })

    return NextResponse.json({ 
      data: chartData,
      days: Object.keys(groupedByDay).sort()
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching daily power by hour:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Error al obtener datos de potencia por día' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
