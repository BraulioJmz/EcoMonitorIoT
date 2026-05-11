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

    // Obtener IDs de máquinas seleccionadas
    const selectedMachineIds = machineIdsParam ? machineIdsParam.split(',') : []

    // Si el modo es 'total_consumption', usar daily_energy_totals
    if (calculationMode === 'total_consumption' && startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      start.setUTCHours(0, 0, 0, 0)
      end.setUTCHours(23, 59, 59, 999)

      console.log('🔍 Calculando kWh desde daily_energy_totals:', { start, end })
      
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
      
      console.log('✅ Total desde daily_energy_totals:', { totalImported, totalExported })
      
      return NextResponse.json({
        accumulated_kwh_imported: totalImported,
        accumulated_kwh_exported: totalExported,
        mode: 'total_consumption'
      }, { status: 200 })
    }

    // Si hay rango de fechas, calcular acumulado
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      
      // Si el modo es "full_day", forzar las horas a 00:00 - 23:59
      if (calculationMode === 'full_day') {
        start.setUTCHours(0, 0, 0, 0)
        end.setUTCHours(23, 59, 59, 999)
      }
      
      console.log('🔍 Calculando kWh:', { start, end, calculationMode, selectedMachines: selectedMachineIds.length })
      
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
        // Si no hay máquinas seleccionadas, obtener todas
        const allMachines = await prisma.maquinas.findMany({
          select: { codigo_branch: true }
        })
        machinesToProcess = allMachines.map(m => m.codigo_branch)
      }

      console.log(`📊 Procesando ${machinesToProcess.length} máquinas`)

      // Procesar cada máquina
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
          console.log(`  ⚡ ${codigo_branch}: Un solo día, modo=${calculationMode}`)
          
          if (calculationMode === 'full_day') {
            // Día completo: Tomar la última medición del día (acumulado completo del día)
            const rows: Array<{ kwh_imported: any; kwh_exported: any; timestamp: Date }> = await db.$queryRawUnsafe(
              `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported, timestamp
               FROM branch_kwh_accumulated
               WHERE timestamp::date = $1::date
               ORDER BY timestamp DESC
               LIMIT 1`,
              startDay.toISOString().split('T')[0]
            )
            
            console.log(`    Última medición del día:`, rows[0])
            
            if (rows.length > 0) {
              totalImported += Number(rows[0].kwh_imported) || 0
              totalExported += Number(rows[0].kwh_exported) || 0
            }
          } else {
            // Horario personalizado: Verificar si el rango final está dentro de los datos disponibles
            console.log(`    Buscando mediciones entre ${start.toISOString()} y ${end.toISOString()}`)
            
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
              console.log(`    ⚠️ Rango final fuera de datos disponibles (datos hasta: ${new Date(lastDayMeasurement[0].timestamp).toISOString()}), usando acumulado completo`)
              
              const lastRows: Array<{ kwh_imported: any; kwh_exported: any; timestamp: Date }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported, timestamp
                 FROM branch_kwh_accumulated
                 WHERE timestamp::date = $1::date
                 ORDER BY timestamp DESC
                 LIMIT 1`,
                startDay.toISOString().split('T')[0]
              )
              
              console.log(`    Última medición del día:`, lastRows[0])
              
              if (lastRows.length > 0) {
                totalImported += Number(lastRows[0].kwh_imported) || 0
                totalExported += Number(lastRows[0].kwh_exported) || 0
              }
            } else {
              // El rango final está dentro de los datos, calcular diferencia
              const initialRows: Array<{ kwh_imported: any; kwh_exported: any; timestamp: Date }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported, timestamp
                 FROM branch_kwh_accumulated
                 WHERE timestamp >= $1
                 ORDER BY timestamp ASC
                 LIMIT 1`,
                start
              )
              
              const finalRows: Array<{ kwh_imported: any; kwh_exported: any; timestamp: Date }> = await db.$queryRawUnsafe(
                `SELECT "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported, timestamp
                 FROM branch_kwh_accumulated
                 WHERE timestamp <= $1
                 ORDER BY timestamp DESC
                 LIMIT 1`,
                end
              )
              
              console.log(`    Medición inicial:`, initialRows[0])
              console.log(`    Medición final:`, finalRows[0])
              
              if (initialRows.length > 0 && finalRows.length > 0) {
                const diffImported = Number(finalRows[0].kwh_imported || 0) - Number(initialRows[0].kwh_imported || 0)
                const diffExported = Number(finalRows[0].kwh_exported || 0) - Number(initialRows[0].kwh_exported || 0)
                console.log(`    Diferencia: ${diffImported} imp, ${diffExported} exp`)
                totalImported += Math.max(0, diffImported)
                totalExported += Math.max(0, diffExported)
              }
            }
          }
        } else {
          // VARIOS DÍAS
          // Generar array de días
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
              // Obtener primera medición del día
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
                console.log(`    ⚠️ Primer día: inicio fuera de datos (datos desde: ${new Date(firstDayMeasurement[0].timestamp).toISOString()}), usando acumulado completo`)
                
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
              // Obtener última medición del día
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
                console.log(`    ⚠️ Último día: final fuera de datos (datos hasta: ${new Date(lastDayMeasurement[0].timestamp).toISOString()}), usando acumulado completo`)
                
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
              // DÍAS INTERMEDIOS: Diferencia entre última y primera medición del día (día completo)
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

      console.log(`✅ Total calculado: ${totalImported} kWh importados, ${totalExported} kWh exportados`)

      return NextResponse.json({
        accumulated_kwh_imported: totalImported,
        accumulated_kwh_exported: totalExported,
        timestamp: end,
        device_id: null,
        calculationMode
      })
    }

    // Si no hay rango de fechas, obtener la última lectura
    // Si hay machineId, usar branch_kwh_accumulated
    if (machineId) {
      const { db } = await import('@/lib/db')
      
      // Obtener el codigo_branch de la máquina para construir el nombre de columna
      const machine = await prisma.maquinas.findUnique({
        where: { id: parseInt(machineId) },
        select: { codigo_branch: true }
      })
      
      if (machine) {
        // Extraer el número del codigo_branch (ej: "LA-001" -> "01")
        let branchNumber = machine.codigo_branch
        if (branchNumber.includes('-')) {
          const parts = branchNumber.split('-')
          branchNumber = parts[1]
        }
        const paddedBranchNumber = String(parseInt(branchNumber)).padStart(2, '0')
        
        // Construir nombres de columnas: kwh_accumulated_br01_imported, etc.
        const columnImported = `kwh_accumulated_br${paddedBranchNumber}_imported`
        const columnExported = `kwh_accumulated_br${paddedBranchNumber}_exported`
        
        const rows: Array<{ timestamp: Date; kwh_imported: number | null; kwh_exported: number | null }> = await db.$queryRawUnsafe(
          `SELECT "timestamp", "${columnImported}" as kwh_imported, "${columnExported}" as kwh_exported FROM branch_kwh_accumulated ORDER BY "timestamp" DESC LIMIT 1`
        )

        if (rows && rows.length > 0) {
          return NextResponse.json({
            accumulated_kwh_imported: Number(rows[0].kwh_imported) || 0,
            accumulated_kwh_exported: Number(rows[0].kwh_exported) || 0,
            timestamp: rows[0].timestamp,
            device_id: null
          })
        }
      }
    }

    // Sin machineId o si no se encontró la máquina, usar power_measurements
    const queryOptions: any = {
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        accumulated_kwh_imported: true,
        accumulated_kwh_exported: true,
        timestamp: true,
        device_id: true
      }
    }

    const latestMeasurement = await prisma.power_measurements.findFirst(queryOptions)

    if (!latestMeasurement) {
      return NextResponse.json(
        { 
          accumulated_kwh_imported: 0, 
          accumulated_kwh_exported: 0, 
          timestamp: null, 
          device_id: null 
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      accumulated_kwh_imported: Number(latestMeasurement.accumulated_kwh_imported) || 0,
      accumulated_kwh_exported: Number(latestMeasurement.accumulated_kwh_exported) || 0,
      timestamp: latestMeasurement.timestamp,
      device_id: latestMeasurement.device_id
    })
  } catch (error) {
    console.error('Error fetching cycle energy:', error)
    return NextResponse.json(
      { error: 'Error al obtener energía del ciclo' },
      { status: 500 }
    )
  }
}
