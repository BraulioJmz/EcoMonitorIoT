import { NextResponse, NextRequest } from "next/server"
import { db } from "@/lib/db"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const machineId = parseInt(id)

    // Obtener la máquina para obtener su codigo_branch
    const machine = await prisma.maquinas.findUnique({
      where: { id: machineId },
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

    // Convertir a número para quitar ceros a la izquierda, y luego rellenar a 2 dígitos
    const paddedBranchNumber = String(parseInt(branchNumber)).padStart(2, '0')

    // Construir el nombre de tabla: branch_br01_avg5m, branch_br02_avg5m, etc.
    const tableName = `branch_br${paddedBranchNumber}_avg5m`

    // Obtener las últimas 24 horas de datos
    const end = new Date()
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000) // 24 horas atrás

    // Obtener todas las mediciones de las últimas 24 horas
    const rows: Array<{ watts: number | null; timestamp: Date }> = await db.$queryRawUnsafe(
      `SELECT watts, "timestamp" FROM ${tableName} 
       WHERE "timestamp" >= $1::timestamptz AND "timestamp" <= $2::timestamptz 
       ORDER BY "timestamp" ASC`,
      start.toISOString(),
      end.toISOString()
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    // Convertir a formato para la gráfica: timestamp y potencia en kW
    const data = rows.map((r) => ({
      timestamp: new Date(r.timestamp).toISOString(),
      power: (Number(r.watts) || 0) / 1000, // Convertir a kW
      hour: new Date(r.timestamp).getUTCHours(),
    }))

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error fetching machine history:', error)
    return NextResponse.json({ error: error?.message ?? "Error interno" }, { status: 500 })
  }
}

