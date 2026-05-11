import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get("machineId")
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    if (!machineId) {
      return NextResponse.json({ error: "machineId es requerido" }, { status: 400 })
    }

    const branchCode = machineId.padStart(2, '0') // "7" -> "07"
    
    console.log(`[branch-energy] machineId: ${machineId}, branchCode: ${branchCode}`)
    
    // Si hay rango de fechas, calcular sumando el último acumulado de cada día
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      
      // Normalizar a medianoche UTC
      start.setUTCHours(0, 0, 0, 0)
      end.setUTCHours(23, 59, 59, 999)
      
      console.log(`[branch-energy] Rango: ${start.toISOString()} - ${end.toISOString()}`)
      
      // Obtener todos los días en el rango
      const days: Date[] = []
      const currentDay = new Date(start)
      while (currentDay <= end) {
        days.push(new Date(currentDay))
        currentDay.setUTCDate(currentDay.getUTCDate() + 1)
      }
      
      console.log(`[branch-energy] Días a procesar: ${days.length}`)
      
      let totalImported = 0
      let totalExported = 0
      
      // Para cada día, obtener el último acumulado
      for (const day of days) {
        const dayStart = new Date(day)
        dayStart.setUTCHours(0, 0, 0, 0)
        const dayEnd = new Date(day)
        dayEnd.setUTCHours(23, 59, 59, 999)
        
        if (machineId === "7") {
          const rows: Array<{ kwh_imported: number | null; kwh_exported: number | null }> = await db.$queryRawUnsafe(
            `SELECT kwh_accumulated_br${branchCode}_imported as kwh_imported, kwh_accumulated_br${branchCode}_exported as kwh_exported 
             FROM branch_kwh_accumulated 
             WHERE "timestamp" >= $1::timestamp AND "timestamp" <= $2::timestamp 
             ORDER BY "timestamp" DESC 
             LIMIT 1`,
            dayStart.toISOString(),
            dayEnd.toISOString()
          )
          
          console.log(`[branch-energy] Día ${dayStart.toISOString().split('T')[0]}: rows=`, rows.length, rows[0])
          
          if (rows && rows.length > 0) {
            totalImported += rows[0].kwh_imported ? Number(rows[0].kwh_imported) : 0
            totalExported += rows[0].kwh_exported ? Number(rows[0].kwh_exported) : 0
          }
        } else {
          const rows: Array<{ kwh_imported: number | null }> = await db.$queryRawUnsafe(
            `SELECT kwh_accumulated_br${branchCode}_imported as kwh_imported 
             FROM branch_kwh_accumulated 
             WHERE "timestamp" >= $1::timestamp AND "timestamp" <= $2::timestamp 
             ORDER BY "timestamp" DESC 
             LIMIT 1`,
            dayStart.toISOString(),
            dayEnd.toISOString()
          )
          
          console.log(`[branch-energy] Día ${dayStart.toISOString().split('T')[0]}: rows=`, rows.length, rows[0])
          
          if (rows && rows.length > 0) {
            totalImported += rows[0].kwh_imported ? Number(rows[0].kwh_imported) : 0
          }
        }
      }
      
      console.log(`[branch-energy] Total importado: ${totalImported}, Total exportado: ${totalExported}`)
      
      if (machineId === "7") {
        return NextResponse.json({
          data: {
            kwh: totalImported,
            imported: totalImported,
            exported: totalExported,
          },
          kwh: totalImported,
          imported: totalImported,
          exported: totalExported,
        })
      } else {
        return NextResponse.json({
          data: {
            kwh: totalImported,
          },
          kwh: totalImported,
        })
      }
    }

    // Sin rango: devolver el último acumulado del último día disponible
    if (machineId === "7") {
      const rows: Array<{ timestamp: Date; kwh_imported: number | null; kwh_exported: number | null }> = await db.$queryRawUnsafe(
        `SELECT "timestamp", kwh_accumulated_br${branchCode}_imported as kwh_imported, kwh_accumulated_br${branchCode}_exported as kwh_exported FROM branch_kwh_accumulated ORDER BY "timestamp" DESC LIMIT 1`
      )

      if (!rows || rows.length === 0) {
        return NextResponse.json({ 
          data: { 
            timestamp: null, 
            kwh: 0,
            imported: 0,
            exported: 0
          }, 
          kwh: 0,
          imported: 0,
          exported: 0,
          message: "Sin datos" 
        })
      }

      const latest = rows[0]
      const imported = latest.kwh_imported ? Number(latest.kwh_imported) : 0
      const exported = latest.kwh_exported ? Number(latest.kwh_exported) : 0

      return NextResponse.json({
        data: {
          timestamp: latest.timestamp?.toISOString?.() ?? null,
          kwh: imported,
          imported,
          exported,
        },
        kwh: imported,
        imported,
        exported,
      })
    }

    // Para otras máquinas, comportamiento original
    const rows: Array<{ timestamp: Date; kwh: number | null }> = await db.$queryRawUnsafe(
      `SELECT "timestamp", kwh_accumulated_br${branchCode}_imported as kwh FROM branch_kwh_accumulated ORDER BY "timestamp" DESC LIMIT 1`
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: null, kwh: 0, message: "Sin datos" })
    }

    const latest = rows[0]
    const kwh = latest.kwh ? Number(latest.kwh) : 0

    return NextResponse.json({
      data: {
        timestamp: latest.timestamp?.toISOString?.() ?? null,
        kwh,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Error interno" }, { status: 500 })
  }
}

