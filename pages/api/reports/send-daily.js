import { generateAndSendReport } from '@/lib/daily-report-monitor'

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verificar token enviado por Vercel Cron
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    console.log('[Cron] Ejecutando reporte diario desde Pages Router...')

    await generateAndSendReport()

    return res.status(200).json({
      success: true,
      message: 'Reporte diario enviado correctamente',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Cron] Error:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error al generar el reporte'
    })
  }
}