import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/settings/chart-time-range - Obtener horario configurado para gráficas
export async function GET() {
  try {
    const config = await prisma.configuracion_alertas.findFirst({
      orderBy: {
        created_at: 'desc'
      },
      select: {
        hora_inicio_minutos: true,
        hora_fin_minutos: true
      }
    })

    if (!config) {
      // Valores por defecto: 7:30 AM (450 minutos) a 7:30 PM (1170 minutos)
      return NextResponse.json({
        hora_inicio_minutos: 450,
        hora_fin_minutos: 1170
      })
    }

    return NextResponse.json({
      hora_inicio_minutos: config.hora_inicio_minutos ?? 450,
      hora_fin_minutos: config.hora_fin_minutos ?? 1170
    })
  } catch (error) {
    console.error('Error fetching chart time range:', error)
    // En caso de error, devolver valores por defecto
    return NextResponse.json({
      hora_inicio_minutos: 450,
      hora_fin_minutos: 1170
    })
  }
}

