import { NextResponse, NextRequest } from "next/server"
import { db } from "@/lib/db"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const machineId = searchParams.get("machineId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!machineId) {
      return NextResponse.json({ error: "machineId es requerido" }, { status: 400 })
    }

    // Obtener la máquina para obtener su codigo_branch
    const machine = await prisma.maquinas.findUnique({
      where: { id: parseInt(machineId) },
      select: { codigo_branch: true },
    })

    if (!machine) {
      return NextResponse.json({ error: "Máquina no encontrada" }, { status: 404 })
    }

    // Extraer el número del codigo_branch (ej: "LA-001" -> "01")
    let branchNumber = machine.codigo_branch
    if (branchNumber.includes('-')) {
      const parts = branchNumber.split('-')
      branchNumber = parts[1]
    }
    const paddedBranchNumber = String(parseInt(branchNumber)).padStart(2, '0')
    const tableName = `branch_br${paddedBranchNumber}_avg5m`

    // Si hay fechas, calcular promedio del rango (sin filtrar por horario)
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Calcular el promedio de watts en el rango completo (sin filtrar por horario)
      const result: Array<{ avg_watts: number | null; count: number }> = await db.$queryRawUnsafe(
        `SELECT AVG(watts) as avg_watts, COUNT(*)::int as count 
         FROM ${tableName} 
         WHERE "timestamp" >= $1::timestamptz AND "timestamp" <= $2::timestamptz`,
        start.toISOString(),
        end.toISOString()
      )

      if (!result || result.length === 0 || result[0].count === 0) {
        return NextResponse.json({ data: null, wattsKw: 0, message: "Sin datos en el rango" })
      }

      const avgWatts = result[0].avg_watts ? Number(result[0].avg_watts) : 0
      const avgWattsKw = avgWatts / 1000

      return NextResponse.json({
        data: {
          watts: avgWatts,
          wattsKw: avgWattsKw,
          count: result[0].count,
        },
        wattsKw: avgWattsKw,
      })
    }

    // Si no hay fechas, devolver la última medición (comportamiento por defecto)
    const rows: Array<{ timestamp: Date; watts: number | null }> = await db.$queryRawUnsafe(
      `SELECT "timestamp", watts FROM ${tableName} ORDER BY "timestamp" DESC LIMIT 1`
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: null, wattsKw: 0, message: "Sin datos" })
    }

    const latest = rows[0]
    const watts = latest.watts ?? 0
    const wattsKw = watts / 1000

    return NextResponse.json({
      data: {
        timestamp: latest.timestamp?.toISOString?.() ?? null,
        watts,
        wattsKw,
      },
      wattsKw: wattsKw,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Error interno" }, { status: 500 })
  }
}

