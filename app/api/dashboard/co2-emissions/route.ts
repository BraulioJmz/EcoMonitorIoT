import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const machineId = searchParams.get('machineId')
    const machineIdsParam = searchParams.get('machineIds')
    const calculationMode = searchParams.get('calculationMode') || 'custom_time' // 'custom_time', 'full_day', o 'total_consumption'

    const parseDecimal = (value: unknown): number | undefined => {
      if (value === null || value === undefined) return undefined
      if (typeof value === 'number') return value
      if (typeof value === 'bigint') return Number(value)
      if (typeof value === 'string') {
        const numeric = Number(value)
        return Number.isNaN(numeric) ? undefined : numeric
      }
      if (typeof value === 'object' && value !== null) {
        const maybeDecimal = value as { toNumber?: () => number }
        if (typeof maybeDecimal.toNumber === 'function') {
          return maybeDecimal.toNumber()
        }
      }
      const numeric = Number(value)
      return Number.isNaN(numeric) ? undefined : numeric
    }

    const tarifa = await prisma.tarifas.findFirst()

    // Factor de emisión de CO2: Leer desde tarifas.factor_co2; fallback a 0.444 kg CO2/kWh si no existe
    const tarifaFactor = parseDecimal((tarifa as { factor_co2?: unknown } | null)?.factor_co2)
    const CO2_EMISSION_FACTOR = tarifaFactor ?? 0.444

    // Si el modo es 'total_consumption', usar daily_energy_totals
    if (calculationMode === 'total_consumption' && startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      start.setUTCHours(0, 0, 0, 0)
      end.setUTCHours(23, 59, 59, 999)

      console.log('🔍 Calculando CO2 desde daily_energy_totals:', { start, end })
      
      const { db } = await import('@/lib/db')
      
      // Consultar daily_energy_totals directamente
      const rows: Array<{ total_kwh_imported: any; total_kwh_exported: any }> = await db.$queryRawUnsafe(
        `SELECT 
          COALESCE(SUM(total_kwh_imported), 0) as total_kwh_imported,
          COALESCE(SUM(total_kwh_exported), 0) as total_kwh_exported
         FROM daily_energy_totals
         WHERE day >= $1::date AND day <= $2::date`,
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      )
      
      const totalImported = Number(rows[0]?.total_kwh_imported) || 0
      const totalExported = Number(rows[0]?.total_kwh_exported) || 0
      const netKwh = totalImported - totalExported
      const co2Kg = Math.max(0, netKwh * CO2_EMISSION_FACTOR)
      
      console.log('✅ CO2 desde daily_energy_totals:', { totalImported, totalExported, netKwh, co2Kg })
      
      return NextResponse.json({
        co2_kg: Number(co2Kg.toFixed(2)),
        kwh: netKwh,
        imported: totalImported,
        exported: totalExported,
        emissionFactor: CO2_EMISSION_FACTOR,
        mode: 'total_consumption'
      }, { status: 200 })
    }

    // LÓGICA SIMPLIFICADA para llamadas desde vista individual de máquina
    // (cuando hay machineId pero NO hay machineIdsParam)
    if (machineId && !machineIdsParam) {
      const { db } = await import('@/lib/db')
      const branchCode = machineId.padStart(2, '0')
      
      // Si hay rango de fechas, sumar el último acumulado de cada día
      if (startDateParam && endDateParam) {
        const start = new Date(startDateParam)
        const end = new Date(endDateParam)
        
        start.setUTCHours(0, 0, 0, 0)
        end.setUTCHours(23, 59, 59, 999)
        
        const days: Date[] = []
        const currentDay = new Date(start)
        while (currentDay <= end) {
          days.push(new Date(currentDay))
          currentDay.setUTCDate(currentDay.getUTCDate() + 1)
        }
        
        let totalImported = 0
        let totalExported = 0
        
        for (const day of days) {
          const dayStart = new Date(day)
          dayStart.setUTCHours(0, 0, 0, 0)
          const dayEnd = new Date(day)
          dayEnd.setUTCHours(23, 59, 59, 999)
          
          if (machineId === "7") {
            const rows: Array<{ kwh_imported: number | null; kwh_exported: number | null }> = await db.$queryRawUnsafe(
              `SELECT kwh_accumulated_br${branchCode}_imported as kwh_imported, kwh_accumulated_br${branchCode}_exported as kwh_exported 
               FROM branch_kwh_accumulated 
               WHERE "timestamp" >= $1::timestamp AND "timestamp" <= $2::timestamp 
               ORDER BY "timestamp" DESC 
               LIMIT 1`,
              dayStart.toISOString(),
              dayEnd.toISOString()
            )
            
            if (rows && rows.length > 0) {
              totalImported += rows[0].kwh_imported ? Number(rows[0].kwh_imported) : 0
              totalExported += rows[0].kwh_exported ? Number(rows[0].kwh_exported) : 0
            }
          } else {
            const rows: Array<{ kwh_imported: number | null }> = await db.$queryRawUnsafe(
              `SELECT kwh_accumulated_br${branchCode}_imported as kwh_imported 
               FROM branch_kwh_accumulated 
               WHERE "timestamp" >= $1::timestamp AND "timestamp" <= $2::timestamp 
               ORDER BY "timestamp" DESC 
               LIMIT 1`,
              dayStart.toISOString(),
              dayEnd.toISOString()
            )
            
            if (rows && rows.length > 0) {
              totalImported += rows[0].kwh_imported ? Number(rows[0].kwh_imported) : 0
            }
          }
        }
        
        // Calcular diferencia: importados - exportados
        // Si es negativo (más exportados que importados), la huella es 0
        const netKwh = totalImported - totalExported
        const co2_kg = Math.max(0, netKwh) * CO2_EMISSION_FACTOR
        
        return NextResponse.json({
          co2_kg: Number(co2_kg.toFixed(2)),
          kwh: netKwh,
          imported: totalImported,
          exported: totalExported
        })
      } else {
        // Sin rango: último acumulado del último día
        if (machineId === "7") {
          const rows: Array<{ kwh_imported: number | null; kwh_exported: number | null }> = await db.$queryRawUnsafe(
            `SELECT kwh_accumulated_br${branchCode}_imported as kwh_imported, kwh_accumulated_br${branchCode}_exported as kwh_exported 
             FROM branch_kwh_accumulated 
             ORDER BY "timestamp" DESC 
             LIMIT 1`
          )
          
          const totalImported = (rows && rows.length > 0 && rows[0].kwh_imported) ? Number(rows[0].kwh_imported) : 0
          const totalExported = (rows && rows.length > 0 && rows[0].kwh_exported) ? Number(rows[0].kwh_exported) : 0
          const netKwh = totalImported - totalExported
          const co2_kg = Math.max(0, netKwh) * CO2_EMISSION_FACTOR
          
          return NextResponse.json({
            co2_kg: Number(co2_kg.toFixed(2)),
            kwh: netKwh,
            imported: totalImported,
            exported: totalExported
          })
        } else {
          const rows: Array<{ kwh_imported: number | null }> = await db.$queryRawUnsafe(
            `SELECT kwh_accumulated_br${branchCode}_imported as kwh_imported 
             FROM branch_kwh_accumulated 
             ORDER BY "timestamp" DESC 
             LIMIT 1`
          )
          
          const totalImported = (rows && rows.length > 0 && rows[0].kwh_imported) ? Number(rows[0].kwh_imported) : 0
          const co2_kg = totalImported * CO2_EMISSION_FACTOR
          
          return NextResponse.json({
            co2_kg: Number(co2_kg.toFixed(2)),
            kwh: totalImported
          })
        }
      }
    }

    // Obtener IDs de máquinas seleccionadas
    const selectedMachineIds = machineIdsParam ? machineIdsParam.split(',') : []

    // LÓGICA COMPLEJA para el dashboard general con filtros de hora
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      
      // Si el modo es "full_day", forzar las horas a 00:00 - 23:59
      if (calculationMode === 'full_day') {
        start.setUTCHours(0, 0, 0, 0)
        end.setUTCHours(23, 59, 59, 999)
      }
      
      const { db } = await import('@/lib/db')
      
      // Determinar si es un solo día o varios días
      const startDay = new Date(start)
      startDay.setUTCHours(0, 0, 0, 0)
      const endDay = new Date(end)
      endDay.setUTCHours(0, 0, 0, 0)
      const isSingleDay = startDay.getTime() === endDay.getTime()
      
      let totalImported = 0
      let totalExported = 0

      // Obtener máquinas a procesar
      let machinesToProcess: string[] = []
      if (machineId) {
        const machine = await prisma.maquinas.findUnique({
          where: { id: parseInt(machineId) },
          select: { codigo_branch: true }
        })
        if (machine) machinesToProcess = [machine.codigo_branch]
      } else if (selectedMachineIds.length > 0) {
        machinesToProcess = selectedMachineIds
      } else {
        // Si no hay máquinas seleccionadas, obtener todas excepto la máquina 7
        const allMachines = await prisma.maquinas.findMany({
          where: {
            codigo_branch: {
              not: '7'
            }
          },
          select: { codigo_branch: true }
        })
        machinesToProcess = allMachines.map((m: { codigo_branch: string }) => m.codigo_branch)
      }

      // Procesar cada máquina (misma lógica que cycle-energy)
      for (const codigo_branch of machinesToProcess) {
        let branchNumber = codigo_branch
        if (branchNumber.includes('-')) {
          const parts = branchNumber.split('-')
          branchNumber = parts[1]
        }
        const paddedBranchNumber = String(parseInt(branchNumber)).padStart(2, '0')
        const columnImported = `kwh_accumulated_br${paddedBranchNumber}_imported`
        const columnExported = `kwh_accumulated_br${paddedBranchNumber}_exported`

        if (isSingleDay) {
          // UN SOLO DÍA
          if (calculationMode === 'full_day') {
            // Día completo: Tomar la última medición del día (acumulado completo del día)
            const rows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
              `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
               FROM branch_kwh_accumulated
               WHERE timestamp::date = $1::date
               ORDER BY timestamp DESC
               LIMIT 1`,
              startDay.toISOString().split('T')[0]
            )
            
            if (rows.length > 0) {
              totalImported += Number(rows[0].kwh_imported) || 0
              totalExported += Number(rows[0].kwh_exported) || 0
            }
          } else {
            // Horario personalizado: Verificar si el rango final está dentro de los datos disponibles
            // Obtener primera y última medición del día (sin filtro de hora)
            const firstDayMeasurement: Array<{ timestamp: Date }> = await db.$queryRawUnsafe(
              `SELECT timestamp FROM branch_kwh_accumulated
               WHERE timestamp::date = $1::date
               ORDER BY timestamp ASC
               LIMIT 1`,
              startDay.toISOString().split('T')[0]
            )
            
            const lastDayMeasurement: Array<{ timestamp: Date }> = await db.$queryRawUnsafe(
              `SELECT timestamp FROM branch_kwh_accumulated
               WHERE timestamp::date = $1::date
               ORDER BY timestamp DESC
               LIMIT 1`,
              startDay.toISOString().split('T')[0]
            )
            
            // Verificar si el rango final está dentro de los datos disponibles
            const endIsWithinData = lastDayMeasurement.length > 0 && end <= new Date(lastDayMeasurement[0].timestamp)
            
            if (!endIsWithinData && firstDayMeasurement.length > 0 && lastDayMeasurement.length > 0) {
              // El rango final excede los datos disponibles, usar acumulado completo
              const lastRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                 FROM branch_kwh_accumulated
                 WHERE timestamp::date = $1::date
                 ORDER BY timestamp DESC
                 LIMIT 1`,
                startDay.toISOString().split('T')[0]
              )
              
              if (lastRows.length > 0) {
                totalImported += Number(lastRows[0].kwh_imported) || 0
                totalExported += Number(lastRows[0].kwh_exported) || 0
              }
            } else {
              // El rango final está dentro de los datos, calcular diferencia
              const initialRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                 FROM branch_kwh_accumulated
                 WHERE timestamp >= $1
                 ORDER BY timestamp ASC
                 LIMIT 1`,
                start
              )
              
              const finalRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                 FROM branch_kwh_accumulated
                 WHERE timestamp <= $1
                 ORDER BY timestamp DESC
                 LIMIT 1`,
                end
              )
              
              if (initialRows.length > 0 && finalRows.length > 0) {
                const diffImported = Number(finalRows[0].kwh_imported || 0) - Number(initialRows[0].kwh_imported || 0)
                const diffExported = Number(finalRows[0].kwh_exported || 0) - Number(initialRows[0].kwh_exported || 0)
                totalImported += Math.max(0, diffImported)
                totalExported += Math.max(0, diffExported)
              }
            }
          }
        } else {
          // VARIOS DÍAS (misma lógica que cycle-energy)
          const days = []
          const current = new Date(startDay)
          while (current <= endDay) {
            days.push(new Date(current))
            current.setDate(current.getDate() + 1)
          }
          
          for (let i = 0; i < days.length; i++) {
            const day = days[i]
            const isFirstDay = i === 0
            const isLastDay = i === days.length - 1
            
            if (isFirstDay) {
              // PRIMER DÍA: Verificar si el inicio está dentro de los datos disponibles
              const firstDayMeasurement: Array<{ timestamp: Date }> = await db.$queryRawUnsafe(
                `SELECT timestamp FROM branch_kwh_accumulated
                 WHERE timestamp::date = $1::date
                 ORDER BY timestamp ASC
                 LIMIT 1`,
                day.toISOString().split('T')[0]
              )
              
              const startIsWithinData = firstDayMeasurement.length > 0 && start >= new Date(firstDayMeasurement[0].timestamp)
              
              if (!startIsWithinData && firstDayMeasurement.length > 0) {
                // El inicio está fuera de los datos, usar acumulado completo del día
                const lastDayRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                  `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                   FROM branch_kwh_accumulated
                   WHERE timestamp::date = $1::date
                   ORDER BY timestamp DESC
                   LIMIT 1`,
                  day.toISOString().split('T')[0]
                )
                
                if (lastDayRows.length > 0) {
                  totalImported += Number(lastDayRows[0].kwh_imported || 0)
                  totalExported += Number(lastDayRows[0].kwh_exported || 0)
                }
              } else {
                // El inicio está dentro de los datos, calcular diferencia
                const initialRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                  `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                   FROM branch_kwh_accumulated
                   WHERE timestamp >= $1
                   ORDER BY timestamp ASC
                   LIMIT 1`,
                  start
                )
                
                const endDayRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                  `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                   FROM branch_kwh_accumulated
                   WHERE timestamp::date = $1::date
                   ORDER BY timestamp DESC
                   LIMIT 1`,
                  day.toISOString().split('T')[0]
                )
                
                if (initialRows.length > 0 && endDayRows.length > 0) {
                  const diffImported = Number(endDayRows[0].kwh_imported || 0) - Number(initialRows[0].kwh_imported || 0)
                  const diffExported = Number(endDayRows[0].kwh_exported || 0) - Number(initialRows[0].kwh_exported || 0)
                  totalImported += Math.max(0, diffImported)
                  totalExported += Math.max(0, diffExported)
                }
              }
            } else if (isLastDay) {
              // ÚLTIMO DÍA: Verificar si el final está dentro de los datos disponibles
              const lastDayMeasurement: Array<{ timestamp: Date }> = await db.$queryRawUnsafe(
                `SELECT timestamp FROM branch_kwh_accumulated
                 WHERE timestamp::date = $1::date
                 ORDER BY timestamp DESC
                 LIMIT 1`,
                day.toISOString().split('T')[0]
              )
              
              const endIsWithinData = lastDayMeasurement.length > 0 && end <= new Date(lastDayMeasurement[0].timestamp)
              
              if (!endIsWithinData && lastDayMeasurement.length > 0) {
                // El final está fuera de los datos, usar acumulado completo del día
                const lastRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                  `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                   FROM branch_kwh_accumulated
                   WHERE timestamp::date = $1::date
                   ORDER BY timestamp DESC
                   LIMIT 1`,
                  day.toISOString().split('T')[0]
                )
                
                if (lastRows.length > 0) {
                  totalImported += Number(lastRows[0].kwh_imported || 0)
                  totalExported += Number(lastRows[0].kwh_exported || 0)
                }
              } else {
                // El final está dentro de los datos, calcular diferencia
                const startDayRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                  `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                   FROM branch_kwh_accumulated
                   WHERE timestamp::date = $1::date
                   ORDER BY timestamp ASC
                   LIMIT 1`,
                  day.toISOString().split('T')[0]
                )
                
                const finalRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                  `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                   FROM branch_kwh_accumulated
                   WHERE timestamp <= $1
                   ORDER BY timestamp DESC
                   LIMIT 1`,
                  end
                )
                
                if (startDayRows.length > 0 && finalRows.length > 0) {
                  const diffImported = Number(finalRows[0].kwh_imported || 0) - Number(startDayRows[0].kwh_imported || 0)
                  const diffExported = Number(finalRows[0].kwh_exported || 0) - Number(startDayRows[0].kwh_exported || 0)
                  totalImported += Math.max(0, diffImported)
                  totalExported += Math.max(0, diffExported)
                }
              }
            } else {
              const startDayRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                 FROM branch_kwh_accumulated
                 WHERE timestamp::date = $1::date
                 ORDER BY timestamp ASC
                 LIMIT 1`,
                day.toISOString().split('T')[0]
              )
              
              const endDayRows: Array<{ kwh_imported: any; kwh_exported: any }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported 
                 FROM branch_kwh_accumulated
                 WHERE timestamp::date = $1::date
                 ORDER BY timestamp DESC
                 LIMIT 1`,
                day.toISOString().split('T')[0]
              )
              
              if (startDayRows.length > 0 && endDayRows.length > 0) {
                const diffImported = Number(endDayRows[0].kwh_imported || 0) - Number(startDayRows[0].kwh_imported || 0)
                const diffExported = Number(endDayRows[0].kwh_exported || 0) - Number(startDayRows[0].kwh_exported || 0)
                totalImported += Math.max(0, diffImported)
                totalExported += Math.max(0, diffExported)
              }
            }
          }
        }
      }

      // Calcular CO2: (imported - exported) * factor
      const netKwh = totalImported - totalExported
      let co2_kg = netKwh * CO2_EMISSION_FACTOR
      // Si la huella de carbono es negativa, dejarla en 0
      if (co2_kg < 0) {
        co2_kg = 0
      }

      return NextResponse.json({
        co2_kg: co2_kg,
        accumulated_kwh: netKwh,
        imported: totalImported,
        exported: totalExported,
        timestamp: end,
        calculationMode
      })
    }

    // Si no hay rango de fechas, obtener la última lectura
    if (machineId) {
      const { db } = await import('@/lib/db')
      
      const machine = await prisma.maquinas.findUnique({
        where: { id: parseInt(machineId) },
        select: { codigo_branch: true }
      })
      
      if (machine) {
        let branchNumber = machine.codigo_branch
        if (branchNumber.includes('-')) {
          const parts = branchNumber.split('-')
          branchNumber = parts[1]
        }
        const paddedBranchNumber = String(parseInt(branchNumber)).padStart(2, '0')
        
        const columnImported = `kwh_accumulated_br${paddedBranchNumber}_imported`
        const columnExported = `kwh_accumulated_br${paddedBranchNumber}_exported`
        
        const rows: Array<{ timestamp: Date; kwh_imported: number | null; kwh_exported: number | null }> = await db.$queryRawUnsafe(
          `SELECT "timestamp", "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported FROM branch_kwh_accumulated ORDER BY "timestamp" DESC LIMIT 1`
        )

        if (rows && rows.length > 0) {
          const imported = Number(rows[0].kwh_imported) || 0
          const exported = Number(rows[0].kwh_exported) || 0
          const accumulated_kwh = imported - exported
          let co2_kg = accumulated_kwh * CO2_EMISSION_FACTOR
          if (co2_kg < 0) co2_kg = 0
          
          return NextResponse.json({
            co2_kg: co2_kg,
            accumulated_kwh: accumulated_kwh,
            imported: imported,
            exported: exported,
            timestamp: rows[0].timestamp
          })
        }
      }
    }

    // Sin machineId, usar power_measurements
    const latestMeasurement = await prisma.power_measurements.findFirst({
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        accumulated_kwh_imported: true,
        accumulated_kwh_exported: true,
        timestamp: true,
        device_id: true
      }
    })

    if (!latestMeasurement) {
      return NextResponse.json(
        { 
          co2_kg: 0, 
          accumulated_kwh: 0,
          imported: 0,
          exported: 0,
          timestamp: null 
        },
        { status: 200 }
      )
    }

    const imported = Number(latestMeasurement.accumulated_kwh_imported) || 0
    const exported = Number(latestMeasurement.accumulated_kwh_exported) || 0
    const accumulated_kwh = imported - exported
    let co2_kg = accumulated_kwh * CO2_EMISSION_FACTOR
    if (co2_kg < 0) co2_kg = 0

    return NextResponse.json({
      co2_kg: co2_kg,
      accumulated_kwh: accumulated_kwh,
      imported: imported,
      exported: exported,
      timestamp: latestMeasurement.timestamp
    })
  } catch (error) {
    console.error('Error fetching CO2 emissions:', error)
    return NextResponse.json(
      { error: 'Error al obtener emisiones de CO2' },
      { status: 500 }
    )
  }
}
