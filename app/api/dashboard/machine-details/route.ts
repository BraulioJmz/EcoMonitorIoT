import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { db } from "@/lib/db"

const prisma = new PrismaClient()

// Helper function to convert to number
function toNumber(value: any): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || searchParams.get("start")
    const endDate = searchParams.get("endDate") || searchParams.get("end")
    const machineIdsParam = searchParams.get("machineIds")
    const calculationMode = searchParams.get("calculationMode") || "custom_time"

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Fechas requeridas" }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Si el modo es "full_day", forzar las horas a 00:00 - 23:59
    if (calculationMode === "full_day") {
      start.setUTCHours(0, 0, 0, 0)
      end.setUTCHours(23, 59, 59, 999)
    }

    console.log('🔍 machine-details:', { start, end, calculationMode })

    // Obtener máquinas activas
    const machines = await db.maquinas.findMany({
      where: machineIdsParam 
        ? { codigo_branch: { in: machineIdsParam.split(',') } }
        : { estado: true },
      select: { id: true, nombre: true, codigo_branch: true },
      orderBy: { nombre: 'asc' }
    })
    
    console.log(`🔍 Máquinas encontradas: ${machines.length}`)

    // Obtener tarifa pico promedio para calcular costos
    const tarifaRecord = await db.tarifas.findFirst({
      orderBy: { id: 'desc' }
    })
    const tarifaPico = tarifaRecord?.tarifa_pico || 2.5

    // Determinar si es un solo día o varios días
    const startDay = new Date(start)
    startDay.setUTCHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setUTCHours(0, 0, 0, 0)
    const isSingleDay = startDay.getTime() === endDay.getTime()

    const machineDetails = await Promise.all(machines.map(async (machine: any) => {
      const branchId = machine.codigo_branch
      let branchNumber = branchId
      if (branchNumber.includes('-')) {
        const parts = branchNumber.split('-')
        branchNumber = parts[1]
      }
      const branchNum = String(parseInt(branchNumber, 10)).padStart(2, '0')
      
      const columnImported = `kwh_accumulated_br${branchNum}_imported`
      const columnExported = `kwh_accumulated_br${branchNum}_exported`
      
      let totalImported = 0
      let totalExported = 0
      let maxPower = 0

      try {
        if (isSingleDay) {
          // UN SOLO DÍA - Igual que cycle-energy
          if (calculationMode === 'full_day') {
            // Día completo: Última medición del día
            const rows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
              `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported
               FROM branch_kwh_accumulated
               WHERE timestamp::date = $1::date
               ORDER BY timestamp DESC
               LIMIT 1`,
              startDay.toISOString().split('T')[0]
            )
            
            if (rows.length > 0) {
              totalImported = Number(rows[0].kwh_imported) || 0
              totalExported = Number(rows[0].kwh_exported) || 0
            }
          } else {
            // Horario personalizado
            const lastDayMeasurement: Array<{ timestamp: Date }> = await db.$queryRawUnsafe(
              `SELECT timestamp FROM branch_kwh_accumulated
               WHERE timestamp::date = $1::date
               ORDER BY timestamp DESC
               LIMIT 1`,
              startDay.toISOString().split('T')[0]
            )
            
            const endIsWithinData = lastDayMeasurement.length > 0 && end <= new Date(lastDayMeasurement[0].timestamp)
            
            if (!endIsWithinData) {
              // Usar acumulado completo del día
              const lastRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported
                 FROM branch_kwh_accumulated
                 WHERE timestamp::date = $1::date
                 ORDER BY timestamp DESC
                 LIMIT 1`,
                startDay.toISOString().split('T')[0]
              )
              
              if (lastRows.length > 0) {
                totalImported = Number(lastRows[0].kwh_imported) || 0
                totalExported = Number(lastRows[0].kwh_exported) || 0
              }
            } else {
              // Calcular diferencia entre inicio y fin DEL MISMO DÍA
              const initialRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported
                 FROM branch_kwh_accumulated
                 WHERE timestamp >= $1 AND timestamp::date = $2::date
                 ORDER BY timestamp ASC
                 LIMIT 1`,
                start,
                startDay.toISOString().split('T')[0]
              )
              
              const finalRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported
                 FROM branch_kwh_accumulated
                 WHERE timestamp <= $1 AND timestamp::date = $2::date
                 ORDER BY timestamp DESC
                 LIMIT 1`,
                end,
                endDay.toISOString().split('T')[0]
              )
              
              if (initialRows.length > 0 && finalRows.length > 0) {
                const diffImported = Number(finalRows[0].kwh_imported || 0) - Number(initialRows[0].kwh_imported || 0)
                const diffExported = Number(finalRows[0].kwh_exported || 0) - Number(initialRows[0].kwh_exported || 0)
                totalImported = Math.max(0, diffImported)
                totalExported = Math.max(0, diffExported)
              }
            }
          }
        } else {
          // MÚLTIPLES DÍAS - Sumar consumo de cada día
          const rows: Array<{ day: any; kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
            `SELECT 
               DATE(timestamp) as day,
               MAX("${columnImported}") as kwh_imported,
               MAX("${columnExported}") as kwh_exported
             FROM branch_kwh_accumulated
             WHERE timestamp::date >= $1::date AND timestamp::date <= $2::date
             GROUP BY DATE(timestamp)
             ORDER BY day ASC`,
            startDay.toISOString().split('T')[0],
            endDay.toISOString().split('T')[0]
          )

          for (const dayRecord of rows) {
            totalImported += Number(dayRecord.kwh_imported) || 0
            totalExported += Number(dayRecord.kwh_exported) || 0
          }
        }
      } catch (error) {
        console.error(`❌ Error consultando kWh de ${machine.nombre}:`, error)
      }

      // Obtener potencia máxima del periodo
      const tableName = `branch_br${branchNum}_avg5m`
      try {
        const powerData: any[] = await db.$queryRawUnsafe(`
          SELECT MAX(watts) as max_power
          FROM "${tableName}"
          WHERE "timestamp" >= $1::timestamptz AND "timestamp" <= $2::timestamptz
        `, start.toISOString(), end.toISOString())

        if (powerData.length > 0 && powerData[0] && powerData[0].max_power) {
          maxPower = Number(powerData[0].max_power) / 1000
        }
      } catch (error) {
        console.error(`❌ Error obteniendo potencia de ${branchId}:`, error)
      }

      const totalKwh = totalImported
      const cost = totalKwh * tarifaPico

      return {
        id: machine.id,
        name: machine.nombre || 'Máquina sin nombre',
        branchId: machine.codigo_branch,
        totalKwh: totalKwh || 0,
        importedKwh: totalImported || 0,
        exportedKwh: totalExported || 0,
        maxPower: maxPower || 0,
        cost: cost || 0
      }
    }))

    return NextResponse.json({ machines: machineDetails })

  } catch (error) {
    console.error("Error obteniendo detalles de máquinas:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
