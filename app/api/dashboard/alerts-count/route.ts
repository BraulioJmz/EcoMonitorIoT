import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    let whereClause: any = {}

    // Si hay rango de fechas, filtrar por ese rango
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      
      whereClause.fecha = {
        gte: start,
        lte: end
      }
    }

    // Contar alertas
    const alertsCount = await prisma.alertas.count({
      where: whereClause
    })

    return NextResponse.json({
      count: alertsCount
    })
  } catch (error) {
    console.error('Error fetching alerts count:', error)
    return NextResponse.json(
      { error: 'Error al obtener el conteo de alertas' },
      { status: 500 }
    )
  }
}
