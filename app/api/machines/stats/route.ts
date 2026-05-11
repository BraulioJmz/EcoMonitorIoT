import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Obtener todas las máquinas
    const machines = await prisma.maquinas.findMany({
      select: {
        id: true,
        codigo_branch: true,
      },
    })

    const machinesStats = await Promise.all(
      machines.map(async (machine) => {
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

          // Obtener la última medición de watts y equivalent_current
          const latestMeasurement: Array<{ watts: number | null; equivalent_current: number | null; timestamp: Date }> = await db.$queryRawUnsafe(
            `SELECT watts, equivalent_current, "timestamp" FROM ${tableName} ORDER BY "timestamp" DESC LIMIT 1`
          )

          // Obtener la energía acumulada del día (formato: kwh_accumulated_br01, br02, etc.)
          const columnName = `kwh_accumulated_br${paddedBranchNumber}`
          const energyRow: Array<{ timestamp: Date; kwh: number | null }> = await db.$queryRawUnsafe(
            `SELECT "timestamp", "${columnName}" as kwh FROM branch_kwh_accumulated ORDER BY "timestamp" DESC LIMIT 1`
          )

          const watts = latestMeasurement && latestMeasurement.length > 0 ? Number(latestMeasurement[0].watts) || 0 : 0
          const equivalentCurrent = latestMeasurement && latestMeasurement.length > 0 ? Number(latestMeasurement[0].equivalent_current) || 0 : 0
          const energyToday = energyRow && energyRow.length > 0 ? Number(energyRow[0].kwh) || 0 : 0

          return {
            machineId: machine.id,
            codigo_branch: machine.codigo_branch,
            watts: watts / 1000, // Convertir a kW
            equivalentCurrent,
            energyToday,
            status: equivalentCurrent > 0.5 ? 'running' : 'idle',
          }
        } catch (error) {
          console.error(`Error fetching stats for machine ${machine.id}:`, error)
          // Retornar valores por defecto en caso de error
          return {
            machineId: machine.id,
            codigo_branch: machine.codigo_branch,
            watts: 0,
            equivalentCurrent: 0,
            energyToday: 0,
            status: 'idle',
          }
        }
      })
    )

    return NextResponse.json({ machinesStats })
  } catch (error: any) {
    console.error('Error fetching machines stats:', error)
    return NextResponse.json({ error: error?.message ?? "Error interno" }, { status: 500 })
  }
}

