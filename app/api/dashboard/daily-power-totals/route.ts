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
    const machineId = searchParams.get('machineId')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { data: [], error: 'Se requiere un rango de fechas' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Ajustar a inicio de dia y final del día del rango para cubrir completos
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(23, 59, 59, 999)

    console.log(`🔍 [PERF-FIX] Fechas recibidas: start=${start.toISOString()}, end=${end.toISOString()}`)

    const chartTimeRangeConfig = await prisma.configuracion_alertas.findFirst({
      select: { hora_inicio_minutos: true, hora_fin_minutos: true }
    })
    const startMinutes = chartTimeRangeConfig?.hora_inicio_minutos ?? 450
    const endMinutes = chartTimeRangeConfig?.hora_fin_minutos ?? 1170
    
    // Convertir todo a HH:MM:SS para el filtrado en SQL
    const formatTime = (totalMinutes: number) => {
      const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
      const m = (totalMinutes % 60).toString().padStart(2, '0')
      return `${h}:${m}:00`
    }
    const sqlStartTime = formatTime(startMinutes)
    const sqlEndTime = formatTime(endMinutes)

    let machinesToProcess: string[] = []
    
    if (machineId) {
      const machine = await prisma.maquinas.findUnique({
        where: { id: parseInt(machineId) },
        select: { codigo_branch: true }
      })
      if (machine) {
        machinesToProcess = [machine.codigo_branch]
      }
    } else if (machineIdsParam) {
      machinesToProcess = machineIdsParam.split(',')
    } else {
      const allMachines = await prisma.maquinas.findMany({ select: { codigo_branch: true } })
      machinesToProcess = allMachines.map(m => m.codigo_branch)
    }

    if (machinesToProcess.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    // Inicializar totales diarios en 0 para todos los días del rango
    const dailyTotals: Record<string, { imported: number; exported: number }> = {}
    const currentDay = new Date(start)
    while (currentDay.getTime() <= end.getTime()) {
      dailyTotals[currentDay.toISOString().split('T')[0]] = { imported: 0, exported: 0 }
      currentDay.setUTCDate(currentDay.getUTCDate() + 1)
    }

    console.log(`📊 [PERF-FIX] Procesando ${machinesToProcess.length} máquinas, construyendo consulta SQL macro`)

    // Mapear cada formato de branch para las columnas sql
    for (const codigo_branch of machinesToProcess) {
      let branchNumber = codigo_branch.includes('-') ? codigo_branch.split('-')[1] : codigo_branch
      const paddedNum = String(parseInt(branchNumber)).padStart(2, '0')
      
      const colImp = `kwh_accumulated_br${paddedNum}_imported`
      const colExp = `kwh_accumulated_br${paddedNum}_exported`

      // 1 SOLA QUERY por máquina cubriendo todos los días del rango (en vez de 1 query x día x máquina)
      const sqlQuery = `
        SELECT DISTINCT ON (date_trunc('day', timestamp AT TIME ZONE 'UTC'))
          date_trunc('day', timestamp AT TIME ZONE 'UTC') AS day_date,
          "${colImp}" AS kwh_imported,
          "${colExp}" AS kwh_exported
        FROM branch_kwh_accumulated
        WHERE timestamp >= $1::timestamptz 
          AND timestamp <= $2::timestamptz
          AND timestamp::time >= $3::time
          AND timestamp::time <= $4::time
        ORDER BY date_trunc('day', timestamp AT TIME ZONE 'UTC'), timestamp DESC
      `
      
      const branchDays: any[] = await db.$queryRawUnsafe(sqlQuery, start, end, sqlStartTime, sqlEndTime)

      // Procesar e integrar a la suma global agrupada en JS (O(N))
      for (const row of branchDays) {
        // row.day_date es un objeto Date
        const dayStr = row.day_date.toISOString().split('T')[0]
        if (dailyTotals[dayStr]) {
           dailyTotals[dayStr].imported += Number(row.kwh_imported || 0)
           dailyTotals[dayStr].exported += Number(row.kwh_exported || 0)
        }
      }
    }

    const chartData = Object.keys(dailyTotals)
      .sort()
      .map(dayKey => ({
        day: dayKey,
        imported: Number(dailyTotals[dayKey].imported.toFixed(2)),
        exported: Number(dailyTotals[dayKey].exported.toFixed(2)),
        total_kwh: Number(dailyTotals[dayKey].imported.toFixed(2)) // Compatibilidad Frontend
      }))

    console.log(`✅ [PERF-FIX] Retornando ${chartData.length} dias agregados con éxito`)

    return NextResponse.json({ data: chartData }, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching daily power totals (PERF-FIX):', error)
    return NextResponse.json(
      { error: error?.message ?? 'Error al obtener totales diarios de potencia' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

