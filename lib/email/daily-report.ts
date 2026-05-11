import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const DEFAULT_FROM = process.env.DAILY_REPORT_EMAIL_FROM ?? "EcoMonitor IoT <alerts@ecomonitor.io>"

let transporter: Transporter | null = null

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })
}

export interface DailyReportData {
  fecha: string
  dmg: {
    kwhImportados: number
    kwhExportados: number
    costoEstimado: number
    huellaCarbono: number
  }
  branches: {
    kwhImportados: number
    kwhExportados: number
    costoEstimado: number
    huellaCarbono: number
  }
  maximos: {
    potencia: number
    corriente: number
  }
  maquinas: Array<{
    nombre: string
    codigo: string
    consumo: number
  }>
}

function buildDailyReportHtml(data: DailyReportData): string {
  const formatNumber = (num: number) => num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const formatCurrency = (num: number) => `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;">
    <table style="width:100%;max-width:640px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;padding:24px;">
      <!-- Header -->
      <tr>
        <td style="background:#0f172a;padding:28px;border-radius:16px 16px 0 0;text-align:center;">
          <h1 style="color:#f8fafc;font-size:24px;margin:0;font-weight:600;">EcoMonitor IoT</h1>
          <p style="color:#cbd5e1;font-size:16px;margin:12px 0 0;font-weight:500;">Reporte Diario de Consumo</p>
          <p style="color:#94a3b8;font-size:14px;margin:8px 0 0;">${data.fecha}</p>
        </td>
      </tr>
      
      <!-- Contenido Principal -->
      <tr>
        <td style="background:#ffffff;padding:32px 28px;border-radius:0 0 16px 16px;box-shadow:0 20px 25px -15px rgba(15,23,42,0.25);">
          
          <!-- Resumen DMG -->
          <div style="margin-bottom:32px;">
            <h2 style="color:#0f172a;font-size:18px;margin:0 0 20px;font-weight:600;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
              📊 Resumen General (Consumo Total)
            </h2>
            
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#f8fafc;">
                <td style="padding:16px;border-radius:8px 0 0 8px;">
                  <div style="text-align:center;">
                    <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Importados</p>
                    <p style="margin:8px 0 0;font-size:28px;color:#0f172a;font-weight:700;">${formatNumber(data.dmg.kwhImportados)}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#64748b;">kWh</p>
                  </div>
                </td>
                <td style="padding:16px;border-left:2px solid #e2e8f0;">
                  <div style="text-align:center;">
                    <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Exportados</p>
                    <p style="margin:8px 0 0;font-size:28px;color:#0f172a;font-weight:700;">${formatNumber(data.dmg.kwhExportados)}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#64748b;">kWh</p>
                  </div>
                </td>
              </tr>
            </table>
            
            <table style="width:100%;border-collapse:collapse;margin-top:12px;">
              <tr style="background:#f8fafc;">
                <td style="padding:16px;border-radius:8px 0 0 8px;">
                  <div style="text-align:center;">
                    <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Costo Estimado</p>
                    <p style="margin:8px 0 0;font-size:24px;color:#16a34a;font-weight:700;">${formatCurrency(data.dmg.costoEstimado)}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#64748b;">MXN</p>
                  </div>
                </td>
                <td style="padding:16px;border-left:2px solid #e2e8f0;border-radius:0 8px 8px 0;">
                  <div style="text-align:center;">
                    <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Huella de Carbono</p>
                    <p style="margin:8px 0 0;font-size:24px;color:#ea580c;font-weight:700;">${formatNumber(data.dmg.huellaCarbono)}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#64748b;">kg CO₂</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Resumen Branches -->
          <div style="margin-bottom:32px;">
            <h2 style="color:#0f172a;font-size:18px;margin:0 0 20px;font-weight:600;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
              📊 Resumen General (Máquinas Medidas)
            </h2>
            
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#f8fafc;">
                <td style="padding:16px;border-radius:8px 0 0 8px;">
                  <div style="text-align:center;">
                    <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Importados</p>
                    <p style="margin:8px 0 0;font-size:28px;color:#0f172a;font-weight:700;">${formatNumber(data.branches.kwhImportados)}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#64748b;">kWh</p>
                  </div>
                </td>
                <td style="padding:16px;border-left:2px solid #e2e8f0;">
                  <div style="text-align:center;">
                    <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Exportados</p>
                    <p style="margin:8px 0 0;font-size:28px;color:#0f172a;font-weight:700;">${formatNumber(data.branches.kwhExportados)}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#64748b;">kWh</p>
                  </div>
                </td>
              </tr>
            </table>
            
            <table style="width:100%;border-collapse:collapse;margin-top:12px;">
              <tr style="background:#f8fafc;">
                <td style="padding:16px;border-radius:8px 0 0 8px;">
                  <div style="text-align:center;">
                    <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Costo Estimado</p>
                    <p style="margin:8px 0 0;font-size:24px;color:#16a34a;font-weight:700;">${formatCurrency(data.branches.costoEstimado)}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#64748b;">MXN</p>
                  </div>
                </td>
                <td style="padding:16px;border-left:2px solid #e2e8f0;border-radius:0 8px 8px 0;">
                  <div style="text-align:center;">
                    <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Huella de Carbono</p>
                    <p style="margin:8px 0 0;font-size:24px;color:#ea580c;font-weight:700;">${formatNumber(data.branches.huellaCarbono)}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#64748b;">kg CO₂</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Valores Máximos -->
          <div style="margin-bottom:32px;">
            <h2 style="color:#0f172a;font-size:18px;margin:0 0 20px;font-weight:600;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
              ⚡ Valores Máximos Registrados
            </h2>
            
            <div style="background:#fef3c7;padding:20px;border-radius:8px;border-left:4px solid #f59e0b;margin-bottom:12px;">
              <table style="width:100%;">
                <tr>
                  <td style="width:50%;">
                    <p style="margin:0;font-size:13px;color:#78350f;text-transform:uppercase;letter-spacing:0.05em;">Potencia Máxima</p>
                  </td>
                  <td style="text-align:right;">
                    <p style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">${formatNumber(data.maximos.potencia)} kW</p>
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="background:#dbeafe;padding:20px;border-radius:8px;border-left:4px solid #3b82f6;">
              <table style="width:100%;">
                <tr>
                  <td style="width:50%;">
                    <p style="margin:0;font-size:13px;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em;">Corriente Máxima</p>
                  </td>
                  <td style="text-align:right;">
                    <p style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">${formatNumber(data.maximos.corriente)} A</p>
                  </td>
                </tr>
              </table>
            </div>
          </div>
          
          <!-- Listado de Máquinas -->
          <div>
            <h2 style="color:#0f172a;font-size:18px;margin:0 0 20px;font-weight:600;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
              🔧 Consumo por Equipo
            </h2>
            
            ${data.maquinas.map((maquina, index) => {
              // Alternar colores para mejor legibilidad
              const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff'
              const borderColor = '#3b82f6'
              return `
              <div style="background:${bgColor};padding:14px 20px;border-radius:8px;margin-bottom:8px;border-left:3px solid ${borderColor};">
                <table style="width:100%;">
                  <tr>
                    <td style="width:50px;">
                      <span style="font-size:18px;color:#64748b;font-weight:600;">#${index + 1}</span>
                    </td>
                    <td>
                      <p style="margin:0;font-size:15px;color:#0f172a;font-weight:600;">${maquina.nombre}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${maquina.codigo}</p>
                    </td>
                    <td style="text-align:right;">
                      <p style="margin:0;font-size:18px;color:#0f172a;font-weight:700;">${formatNumber(maquina.consumo)}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">kWh</p>
                    </td>
                  </tr>
                </table>
              </div>
              `
            }).join('')}
          </div>
          
          <!-- Footer informativo -->
          <div style="margin-top:32px;padding:16px;border-radius:8px;background:#f1f5f9;border-left:3px solid #3b82f6;">
            <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">
              Este reporte fue generado automáticamente por <strong>EcoMonitor IoT</strong>. 
              Para más detalles, accede al panel de control del dashboard.
            </p>
          </div>
        </td>
      </tr>
      
      <!-- Footer final -->
      <tr>
        <td style="padding-top:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            © ${new Date().getFullYear()} EcoMonitor IoT · SmartFactory Energy Hub · Reporte Diario
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
`
}

export async function sendDailyReport(params: {
  data: DailyReportData
  recipients: string[]
}): Promise<void> {
  if (!transporter) {
    console.warn("[DailyReport] Transporter SMTP no inicializado; reporte omitido.")
    return
  }

  if (!params.recipients.length) {
    console.warn("[DailyReport] No hay destinatarios configurados; reporte omitido.")
    return
  }

  console.log("[DailyReport] Enviando reporte diario a:", params.recipients)

  try {
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: params.recipients.join(", "),
      subject: `📊 Reporte Diario - ${params.data.fecha}`,
      html: buildDailyReportHtml(params.data),
    })
    
    console.log("[DailyReport] Reporte enviado exitosamente. Message ID:", info.messageId)
  } catch (error) {
    console.error("[DailyReport] Error enviando reporte con SMTP:", error)
    throw error
  }
}
