import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const path = formData.get('path') as string
    const name = formData.get('name') as string
    const period_start = formData.get('period_start') as string
    const period_end = formData.get('period_end') as string

    if (!file || !path) {
      return NextResponse.json(
        { error: "Archivo y ruta son requeridos" },
        { status: 400 }
      )
    }

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('reports')
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Error subiendo a Supabase:', uploadError)
      return NextResponse.json(
        { error: `Error al subir archivo: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('reports')
      .getPublicUrl(path)

    const publicUrl = urlData.publicUrl

    // Calcular tamaño en MB
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)

    // Las fechas ya vienen en formato YYYY-MM-DD desde el cliente
    // Crear registro en la tabla reports de Supabase
    const { data: reportData, error: insertError } = await supabaseAdmin
      .from('reports')
      .insert({
        report_name: name || 'Reporte de Consumo',
        start_date: period_start || null,
        end_date: period_end || null,
        size_mb: parseFloat(sizeMB),
        file_url: publicUrl
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error insertando en tabla reports:', insertError)
      // Intentar eliminar el archivo si falla la inserción
      await supabaseAdmin.storage.from('reports').remove([path])
      
      return NextResponse.json(
        { error: `Error al guardar registro: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      url: publicUrl
    })
  } catch (error) {
    console.error("Error en upload:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
