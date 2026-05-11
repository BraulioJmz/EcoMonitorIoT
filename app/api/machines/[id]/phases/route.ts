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

    // Obtener la última medición con datos de fases
    const latestMeasurement: Array<{
      voltage_l1_l2: number | null
      voltage_l2_l3: number | null
      voltage_l3_l1: number | null
      active_power_l1: number | null
      active_power_l2: number | null
      active_power_l3: number | null
      timestamp: Date
    }> = await db.$queryRawUnsafe(
      `SELECT voltage_l1_l2, voltage_l2_l3, voltage_l3_l1, active_power_l1, active_power_l2, active_power_l3, "timestamp" 
       FROM ${tableName} 
       ORDER BY "timestamp" DESC LIMIT 1`
    )

    if (!latestMeasurement || latestMeasurement.length === 0) {
      return NextResponse.json({
        phases: {
          L1: { voltage: 0, power: 0 },
          L2: { voltage: 0, power: 0 },
          L3: { voltage: 0, power: 0 },
        }
      }, { status: 200 })
    }

    const measurement = latestMeasurement[0]

    // Construir datos por fase según las especificaciones
    const phases = {
      L1: {
        voltage: Number(measurement.voltage_l1_l2) || 0,
        power: Number(measurement.active_power_l1) || 0,
      },
      L2: {
        voltage: Number(measurement.voltage_l2_l3) || 0,
        power: Number(measurement.active_power_l2) || 0,
      },
      L3: {
        voltage: Number(measurement.voltage_l3_l1) || 0,
        power: Number(measurement.active_power_l3) || 0,
      },
    }

    return NextResponse.json({ phases })
  } catch (error: any) {
    console.error('Error fetching machine phases:', error)
    return NextResponse.json({ error: error?.message ?? "Error interno" }, { status: 500 })
  }
}

