import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get("machineId")

    if (!machineId) {
      return NextResponse.json({ error: "machineId es requerido" }, { status: 400 })
    }

    // Construcción d el nombre de tabla dinámico: branch_br0[i]_avg5m (i con 2 dígitos)
    const idPadded = String(machineId).padStart(1, "0")
    const tableName = `branch_br0${idPadded}_avg5m`

    // Traer la última medición por timestamp
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
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Error interno" }, { status: 500 })
  }
}


