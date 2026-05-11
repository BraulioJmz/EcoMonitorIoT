import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error obteniendo reportes:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener los reportes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reports: data || []
    })

  } catch (error) {
    console.error('Error en GET /api/reports/list:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
