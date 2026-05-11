import { db } from '@/lib/db'

export interface ChartTimeRange {
  startMinutes: number
  endMinutes: number
}

/**
 * Obtiene el horario configurado para las gráficas desde la BD
 * Retorna valores por defecto (7:30 AM a 7:30 PM) si no hay configuración
 */
export async function getChartTimeRange(): Promise<ChartTimeRange> {
  try {
    const config = await db.configuracion_alertas.findFirst({
      orderBy: {
        created_at: 'desc'
      },
      select: {
        hora_inicio_minutos: true,
        hora_fin_minutos: true
      }
    })

    return {
      startMinutes: config?.hora_inicio_minutos ?? 450, // 7:30 AM por defecto
      endMinutes: config?.hora_fin_minutos ?? 1170 // 7:30 PM por defecto
    }
  } catch (error) {
    console.error('Error fetching chart time range:', error)
    // En caso de error, devolver valores por defecto
    return {
      startMinutes: 450,
      endMinutes: 1170
    }
  }
}

/**
 * Filtra mediciones según el horario configurado
 */
export function filterByTimeRange(measurements: Array<{ timestamp: Date }>, timeRange: ChartTimeRange) {
  return measurements.filter(m => {
    const date = new Date(m.timestamp)
    const hour = date.getUTCHours()
    const minute = date.getUTCMinutes()
    const timeInMinutes = hour * 60 + minute
    return timeInMinutes >= timeRange.startMinutes && timeInMinutes < timeRange.endMinutes
  })
}

