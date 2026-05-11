import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/settings/alerts - Obtener configuración de alertas
export async function GET() {
  try {
    const alerts = await prisma.configuracion_alertas.findFirst({
      orderBy: {
        created_at: 'desc'
      }
    })

    if (!alerts) {
      // Si no hay configuración, crear una configuración por defecto
      const defaultAlerts = await prisma.configuracion_alertas.create({
        data: {
          umbral_potencia: 300,
          umbral_factor_potencia: 0.8,
          umbral_energia: 2000,
          email_notificaciones: true,
          hora_inicio_minutos: 450, // 7:30 AM por defecto
          hora_fin_minutos: 1170 // 7:30 PM por defecto
        }
      })
      return NextResponse.json(defaultAlerts)
    }

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts config:', error)
    return NextResponse.json(
      { error: 'Error al obtener la configuración de alertas' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/alerts - Actualizar configuración de alertas
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      umbral_potencia, 
      umbral_factor_potencia, 
      umbral_energia, 
      email_notificaciones,
      hora_inicio_minutos,
      hora_fin_minutos
    } = body

    // Obtener el registro más reciente
    const existingConfig = await prisma.configuracion_alertas.findFirst({
      orderBy: {
        created_at: 'desc'
      }
    })

    let updatedConfig

    const updateData: any = {
      umbral_potencia,
      umbral_factor_potencia,
      umbral_energia,
      email_notificaciones,
      updated_at: new Date()
    }

    // Solo incluir campos de horario si se proporcionan
    if (hora_inicio_minutos !== undefined) {
      updateData.hora_inicio_minutos = hora_inicio_minutos
    }
    if (hora_fin_minutos !== undefined) {
      updateData.hora_fin_minutos = hora_fin_minutos
    }

    if (existingConfig) {
      // Actualizar el registro existente
      updatedConfig = await prisma.configuracion_alertas.update({
        where: { id: existingConfig.id },
        data: updateData
      })
    } else {
      // Crear un nuevo registro
      updatedConfig = await prisma.configuracion_alertas.create({
        data: {
          ...updateData,
          hora_inicio_minutos: hora_inicio_minutos ?? 450,
          hora_fin_minutos: hora_fin_minutos ?? 1170
        }
      })
    }

    return NextResponse.json(updatedConfig)
  } catch (error) {
    console.error('Error updating alerts config:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la configuración de alertas' },
      { status: 500 }
    )
  }
}
