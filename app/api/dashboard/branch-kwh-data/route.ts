import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const machineId = searchParams.get('machineId')

    if (!machineId) {
      return NextResponse.json({ error: 'machineId es requerido' }, { status: 400 })
    }

    const machine = await prisma.maquinas.findUnique({
      where: { id: parseInt(machineId, 10) },
      select: { codigo_branch: true }
    })

    if (!machine?.codigo_branch) {
      return NextResponse.json({ error: 'Máquina no encontrada' }, { status: 404 })
    }

    let branchNumber = machine.codigo_branch
    if (branchNumber.includes('-')) {
      const parts = branchNumber.split('-')
      branchNumber = parts[1]
    }

    const paddedBranchNumber = String(parseInt(branchNumber, 10)).padStart(2, '0')
    const columnImported = `kwh_accumulated_br${paddedBranchNumber}_imported`
    const columnExported = `kwh_accumulated_br${paddedBranchNumber}_exported`

    let start: Date
    let end: Date

    if (!startDate || !endDate) {
      const lastRow: Array<{ timestamp: Date }> = await db.$queryRawUnsafe(
        `SELECT "timestamp" FROM branch_kwh_accumulated ORDER BY "timestamp" DESC LIMIT 1`
      )

      if (!lastRow || lastRow.length === 0) {
        return NextResponse.json({ data: [] }, { status: 200 })
      }

      end = new Date(lastRow[0].timestamp)
      end.setUTCHours(23, 59, 59, 999)
      start = new Date(lastRow[0].timestamp)
      start.setUTCHours(0, 0, 0, 0)
    } else {
      start = new Date(startDate)
      end = new Date(endDate)
    }

    const rows: Array<{ timestamp: Date; imported: any; exported: any }> = await db.$queryRawUnsafe(
      `SELECT "timestamp", "${columnImported}" as imported, "${columnExported}" as exported
       FROM branch_kwh_accumulated
       WHERE "timestamp" >= $1::timestamptz AND "timestamp" <= $2::timestamptz
       ORDER BY "timestamp" ASC`,
      start.toISOString(),
      end.toISOString()
    )

    const data = rows.map(row => ({
      timestamp: row.timestamp.toISOString(),
      imported: toNumberOrNull(row.imported) ?? 0,
      exported: toNumberOrNull(row.exported) ?? 0
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching branch kWh data:', error)
    return NextResponse.json({ error: 'Error al obtener datos de energía' }, { status: 500 })
  }
}

function toNumberOrNull(value: any): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}
