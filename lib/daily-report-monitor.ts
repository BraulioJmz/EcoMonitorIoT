import { db } from "@/lib/db"
import { sendDailyReport, type DailyReportData } from "@/lib/email/daily-report"

type GlobalWithDailyReportMonitor = typeof globalThis & {
  __dailyReportMonitorStarted?: boolean
  __dailyReportCheckInterval?: ReturnType<typeof setInterval>
  __lastReportDate?: string
}

const globalState = globalThis as GlobalWithDailyReportMonitor

const DAILY_REPORT_ENABLED = process.env.DAILY_REPORT_ENABLED === "true"
const DAILY_REPORT_HOUR = parseInt(process.env.DAILY_REPORT_HOUR || "18", 10) // 18:30 por defecto
const DAILY_REPORT_MINUTE = parseInt(process.env.DAILY_REPORT_MINUTE || "30", 10)

async function getEmailRecipients(): Promise<string[]> {
  try {
    interface EmailRecord {
      email: string
    }
    
    const emailRecords = await db.$queryRaw<EmailRecord[]>`
      SELECT email 
      FROM reporte_emails 
      WHERE activo = true
    `
    
    const emails = emailRecords
      .map((record: EmailRecord) => record.email)
      .filter((email: string) => email && email.trim().length > 0)
    
    console.log(`[DailyReportMonitor] ${emails.length} destinatarios activos encontrados`)
    return emails
  } catch (error) {
    console.error("[DailyReportMonitor] Error obteniendo emails:", error)
    return []
  }
}

function getTodayDateString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0] // YYYY-MM-DD
}

function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

async function getTariffRate(): Promise<number> {
  try {
    const tariff = await db.tarifas.findFirst({
      orderBy: { created_at: 'desc' }
    })
    return tariff?.tarifa_pico || 0.15 // Valor por defecto si no hay tarifa configurada
  } catch (error) {
    console.error("[DailyReportMonitor] Error obteniendo tarifa:", error)
    return 0.15
  }
}

async function getCO2Factor(): Promise<number> {
  try {
    const tariff = await db.tarifas.findFirst({
      orderBy: { created_at: 'desc' }
    })
    return tariff?.factor_co2 || 0.444 // Valor por defecto si no hay factor configurado (México)
  } catch (error) {
    console.error("[DailyReportMonitor] Error obteniendo factor CO2:", error)
    return 0.444
  }
}

async function getDMGData(date: string): Promise<{ imported: number; exported: number }> {
  try {
    // Obtener la medición del DMG para el día especificado
    const lastMeasurement: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
      `SELECT total_kwh_imported as kwh_imported, total_kwh_exported as kwh_exported 
       FROM daily_energy_totals
       WHERE day = $1::date`,
      date
    )
    
    if (lastMeasurement.length > 0) {
      return {
        imported: Number(lastMeasurement[0].kwh_imported) || 0,
        exported: Number(lastMeasurement[0].kwh_exported) || 0
      }
    }
    
    return { imported: 0, exported: 0 }
  } catch (error) {
    console.error("[DailyReportMonitor] Error obteniendo datos DMG:", error)
    return { imported: 0, exported: 0 }
  }
}

async function getBranchesData(date: string): Promise<{ imported: number; exported: number }> {
  try {
    // Obtener la suma de todas las mediciones de branches para el día especificado
    const result: Array<{ total_imported: any; total_exported: any }> = await db.$queryRawUnsafe(
      `SELECT 
        COALESCE(kwh_accumulated_br01_imported, 0) + 
        COALESCE(kwh_accumulated_br02_imported, 0) + 
        COALESCE(kwh_accumulated_br03_imported, 0) + 
        COALESCE(kwh_accumulated_br04_imported, 0) + 
        COALESCE(kwh_accumulated_br05_imported, 0) + 
        COALESCE(kwh_accumulated_br06_imported, 0) + 
        COALESCE(kwh_accumulated_br07_imported, 0) + 
        COALESCE(kwh_accumulated_br08_imported, 0) + 
        COALESCE(kwh_accumulated_br09_imported, 0) as total_imported,
        COALESCE(kwh_accumulated_br01_exported, 0) + 
        COALESCE(kwh_accumulated_br02_exported, 0) + 
        COALESCE(kwh_accumulated_br03_exported, 0) + 
        COALESCE(kwh_accumulated_br04_exported, 0) + 
        COALESCE(kwh_accumulated_br05_exported, 0) + 
        COALESCE(kwh_accumulated_br06_exported, 0) + 
        COALESCE(kwh_accumulated_br07_exported, 0) + 
        COALESCE(kwh_accumulated_br08_exported, 0) + 
        COALESCE(kwh_accumulated_br09_exported, 0) as total_exported
       FROM branch_kwh_accumulated
       WHERE timestamp::date = $1::date
       ORDER BY timestamp DESC
       LIMIT 1`,
      date
    )
    
    if (result.length > 0) {
      return {
        imported: Number(result[0].total_imported) || 0,
        exported: Number(result[0].total_exported) || 0
      }
    }
    
    return { imported: 0, exported: 0 }
  } catch (error) {
    console.error("[DailyReportMonitor] Error obteniendo datos de branches:", error)
    return { imported: 0, exported: 0 }
  }
}

async function getMaxPowerAndCurrent(date: string): Promise<{ maxPower: number; maxCurrent: number }> {
  try {
    // Obtener potencia máxima del día
    const maxPowerResult = await db.watts_measurements.findFirst({
      where: {
        timestamp: {
          gte: new Date(date + 'T00:00:00Z'),
          lte: new Date(date + 'T23:59:59Z')
        }
      },
      orderBy: {
        watts: 'desc'
      },
      select: {
        watts: true
      }
    })
    
    // Obtener corriente máxima del día
    const maxCurrentResult = await db.current_measurements.findFirst({
      where: {
        timestamp: {
          gte: new Date(date + 'T00:00:00Z'),
          lte: new Date(date + 'T23:59:59Z')
        }
      },
      orderBy: {
        current_a: 'desc'
      },
      select: {
        current_a: true
      }
    })
    
    return {
      maxPower: maxPowerResult ? Number(maxPowerResult.watts) / 1000 : 0, // Convertir a kW
      maxCurrent: maxCurrentResult ? Number(maxCurrentResult.current_a) : 0
    }
  } catch (error) {
    console.error("[DailyReportMonitor] Error obteniendo máximos:", error)
    return { maxPower: 0, maxCurrent: 0 }
  }
}

async function getAllMachines(date: string): Promise<Array<{ nombre: string; codigo: string; consumo: number }>> {
  try {
    // Obtener todas las máquinas
    const machines = await db.maquinas.findMany({
      select: {
        nombre: true,
        codigo_branch: true
      }
    })
    
    const machineConsumption: Array<{ nombre: string; codigo: string; consumo: number }> = []
    
    for (const machine of machines) {
      let branchNumber = machine.codigo_branch
      if (branchNumber.includes('-')) {
        const parts = branchNumber.split('-')
        branchNumber = parts[1]
      }
      const paddedBranchNumber = String(parseInt(branchNumber)).padStart(2, '0')
      const columnImported = `kwh_accumulated_br${paddedBranchNumber}_imported`
      
      // Obtener consumo del día para esta máquina
      const consumption: Array<{ kwh: any }> = await db.$queryRawUnsafe(
        `SELECT "${columnImported}" as kwh 
         FROM branch_kwh_accumulated
         WHERE timestamp::date = $1::date
         ORDER BY timestamp DESC
         LIMIT 1`,
        date
      )
      
      if (consumption.length > 0 && consumption[0].kwh) {
        machineConsumption.push({
          nombre: machine.nombre || 'Sin nombre',
          codigo: machine.codigo_branch,
          consumo: Number(consumption[0].kwh)
        })
      }
    }
    
    // Ordenar por consumo descendente (mostrar todas las máquinas)
    return machineConsumption
      .sort((a, b) => b.consumo - a.consumo)
  } catch (error) {
    console.error("[DailyReportMonitor] Error obteniendo máquinas:", error)
    return []
  }
}

async function generateAndSendReport(): Promise<void> {
  console.log("[DailyReportMonitor] Generando reporte diario...")
  
  try {
    const recipients = await getEmailRecipients()
    
    if (!recipients.length) {
      console.warn("[DailyReportMonitor] No hay destinatarios configurados en la base de datos.")
      return
    }
    
    console.log(`[DailyReportMonitor] Enviando reporte a ${recipients.length} destinatario(s)`)
    
    // Obtener fecha del día anterior
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateString = yesterday.toISOString().split('T')[0]
    
    console.log(`[DailyReportMonitor] Recopilando datos para ${dateString}...`)
    
    // Recopilar todos los datos en paralelo
    const [dmgData, branchesData, maxValues, allMachines, tariffRate, co2Factor] = await Promise.all([
      getDMGData(dateString),
      getBranchesData(dateString),
      getMaxPowerAndCurrent(dateString),
      getAllMachines(dateString),
      getTariffRate(),
      getCO2Factor()
    ])
    
    // Calcular costo estimado y huella de carbono para DMG
    const kwhNetoDMG = dmgData.imported - dmgData.exported
    const costoEstimadoDMG = kwhNetoDMG * tariffRate
    const huellaCarbonoMG = Math.max(0, kwhNetoDMG * co2Factor)
    
    // Calcular costo estimado y huella de carbono para Branches
    const kwhNetoBranches = branchesData.imported - branchesData.exported
    const costoEstimadoBranches = kwhNetoBranches * tariffRate
    const huellaCarbonoBranches = Math.max(0, kwhNetoBranches * co2Factor)
    
    const reportData: DailyReportData = {
      fecha: formatDateForDisplay(dateString),
      dmg: {
        kwhImportados: dmgData.imported,
        kwhExportados: dmgData.exported,
        costoEstimado: costoEstimadoDMG,
        huellaCarbono: huellaCarbonoMG
      },
      branches: {
        kwhImportados: branchesData.imported,
        kwhExportados: branchesData.exported,
        costoEstimado: costoEstimadoBranches,
        huellaCarbono: huellaCarbonoBranches
      },
      maximos: {
        potencia: maxValues.maxPower,
        corriente: maxValues.maxCurrent
      },
      maquinas: allMachines.length > 0 ? allMachines : [
        { nombre: 'No hay datos disponibles', codigo: '-', consumo: 0 }
      ]
    }
    
    console.log("[DailyReportMonitor] Datos recopilados:", {
      fecha: reportData.fecha,
      kwhImportados: reportData.dmg.kwhImportados,
      maquinas: reportData.maquinas.length
    })
    
    await sendDailyReport({
      data: reportData,
      recipients: recipients
    })
    
    console.log("[DailyReportMonitor] ✅ Reporte enviado exitosamente")
  } catch (error) {
    console.error("[DailyReportMonitor] Error generando o enviando reporte:", error)
  }
}

function shouldSendReportNow(): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const todayDate = getTodayDateString()
  
  // Verificar si ya se envió el reporte hoy
  if (globalState.__lastReportDate === todayDate) {
    return false
  }
  
  // Verificar si es la hora correcta (con tolerancia de 1 minuto)
  if (currentHour === DAILY_REPORT_HOUR && currentMinute >= DAILY_REPORT_MINUTE && currentMinute < DAILY_REPORT_MINUTE + 2) {
    return true
  }
  
  return false
}

async function checkAndSendReport(): Promise<void> {
  if (!DAILY_REPORT_ENABLED) {
    return
  }
  
  if (shouldSendReportNow()) {
    const todayDate = getTodayDateString()
    globalState.__lastReportDate = todayDate
    
    await generateAndSendReport()
  }
}

async function startMonitor(): Promise<void> {
  if (globalState.__dailyReportMonitorStarted) {
    console.log("[DailyReportMonitor] Monitor ya está ejecutándose")
    return
  }
  
  if (!DAILY_REPORT_ENABLED) {
    console.log("[DailyReportMonitor] Reportes diarios deshabilitados (DAILY_REPORT_ENABLED=false)")
    return
  }
  
  globalState.__dailyReportMonitorStarted = true
  
  console.log(`[DailyReportMonitor] ✅ Monitor iniciado - Reportes programados a las ${String(DAILY_REPORT_HOUR).padStart(2, '0')}:${String(DAILY_REPORT_MINUTE).padStart(2, '0')}`)
  console.log("[DailyReportMonitor] Los destinatarios se obtienen de la tabla 'reporte_emails' de la base de datos")
  
  // Verificar cada minuto si es hora de enviar el reporte
  globalState.__dailyReportCheckInterval = setInterval(() => {
    void checkAndSendReport()
  }, 60000) // 60 segundos
  
  // Verificar inmediatamente al iniciar (útil para pruebas)
  void checkAndSendReport()
}

// Iniciar el monitor automáticamente
void startMonitor()

// Exportar función para pruebas manuales
export { generateAndSendReport }
