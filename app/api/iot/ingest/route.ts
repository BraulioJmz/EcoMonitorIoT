import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Clave secreta para autenticar el ESP32
const IOT_SECRET = process.env.IOT_SECRET ?? 'ecomonitor-iot-secret'

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('x-iot-secret')
    if (authHeader !== IOT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { machines, seconds_ago } = body

    // Reconstruir timestamp histórico si viene del buffer offline del ESP32
    // seconds_ago = 0 → ahora mismo
    // seconds_ago = 90 → esta lectura se capturó hace 90 segundos
    const secsAgo = typeof seconds_ago === 'number' && seconds_ago > 0 ? seconds_ago : 0
    const now = new Date(Date.now() - secsAgo * 1000)

    if (!machines || !Array.isArray(machines) || machines.length === 0) {
      return NextResponse.json({ error: 'Se requiere el campo "machines" como array' }, { status: 400 })
    }

    const results: string[] = []

    for (const machine of machines) {
      const { branch_id, power_kw, voltage_v, current_a, power_factor } = machine

      if (!branch_id) {
        results.push(`Skipped: missing branch_id`)
        continue
      }

      // Extraer número de branch (br01 -> 01)
      const branchNum = branch_id.replace(/\D/g, '').padStart(2, '0')
      const tableName = `branch_br${branchNum}_avg5m`

      // 1. Insertar en la tabla branch_brXX_avg5m
      // Convertir kW a Watts para la columna 'watts'
      const watts = (power_kw || 0) * 1000

      try {
        await db.$executeRawUnsafe(
          `INSERT INTO ${tableName} 
           (timestamp, equivalent_voltage, equivalent_current, watts, equivalent_active_power,
            active_power_l1, active_power_l2, active_power_l3,
            voltage_l1_l2, voltage_l2_l3, voltage_l3_l1, samples_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (timestamp) DO UPDATE SET
             equivalent_voltage = $2, equivalent_current = $3, watts = $4,
             equivalent_active_power = $5, samples_count = $12`,
          now,
          voltage_v || 120,           // equivalent_voltage
          current_a || 0,             // equivalent_current
          watts,                       // watts (en W)
          power_kw || 0,              // equivalent_active_power (en kW)
          (power_kw || 0) / 3,        // active_power_l1 (distribuir en 3 fases)
          (power_kw || 0) / 3,        // active_power_l2
          (power_kw || 0) / 3,        // active_power_l3
          voltage_v || 120,           // voltage_l1_l2
          voltage_v || 120,           // voltage_l2_l3
          voltage_v || 120,           // voltage_l3_l1
          1                            // samples_count
        )
        results.push(`${branch_id}: branch OK`)
      } catch (err: any) {
        results.push(`${branch_id}: branch ERROR - ${err.message}`)
      }

      // 2. Insertar en watts_measurements (potencia total)
      try {
        await db.watts_measurements.create({
          data: {
            timestamp: now,
            device_id: branch_id,
            watts: watts
          }
        })
      } catch (err) {
        // Ignorar si falla (timestamp duplicado etc.)
      }

      // 3. Insertar en voltage_measurements
      try {
        await db.voltage_measurements.create({
          data: {
            timestamp: now,
            device_id: branch_id,
            voltage_v: voltage_v || 120,
            samples_count: 1
          }
        })
      } catch (err) {
        // Ignorar
      }

      // 4. Insertar en current_measurements
      try {
        await db.current_measurements.create({
          data: {
            timestamp: now,
            device_id: branch_id,
            current_a: current_a || 0,
            samples_count: 1
          }
        })
      } catch (err) {
        // Ignorar
      }

      // 5. Insertar en power_factor_measurements
      if (power_factor !== undefined) {
        try {
          await db.power_factor_measurements.create({
            data: {
              timestamp: now,
              device_id: branch_id,
              power_factor: power_factor,
              samples_count: 1
            }
          })
        } catch (err) {
          // Ignorar
        }
      }

      // 6. Insertar en power_measurements (acumulado)
      try {
        await db.power_measurements.create({
          data: {
            timestamp: now,
            device_id: branch_id,
            branch_id: branch_id,
            power_kw: power_kw || 0,
            accumulated_kwh: 0,
            accumulated_kwh_imported: 0,
            accumulated_kwh_exported: 0
          }
        })
      } catch (err) {
        // Ignorar
      }
    }

    // 7. Insertar en line_current_matrix (una fila con corrientes de todas las máquinas)
    try {
      const machineMap: Record<string, any> = {}
      for (const m of machines) {
        machineMap[m.branch_id] = m
      }

      await db.line_current_matrix.create({
        data: {
          timestamp: now,
          br01_current_l1: (machineMap['br01']?.current_a || 0) / 3,
          br01_current_l2: (machineMap['br01']?.current_a || 0) / 3,
          br01_current_l3: (machineMap['br01']?.current_a || 0) / 3,
          br02_current_l1: (machineMap['br02']?.current_a || 0) / 3,
          br02_current_l2: (machineMap['br02']?.current_a || 0) / 3,
          br02_current_l3: (machineMap['br02']?.current_a || 0) / 3,
          br03_current_l1: (machineMap['br03']?.current_a || 0) / 3,
          br03_current_l2: (machineMap['br03']?.current_a || 0) / 3,
          br03_current_l3: (machineMap['br03']?.current_a || 0) / 3,
          samples_count: 1
        }
      })
    } catch (err) {
      // Ignorar si timestamp duplicado
    }

    // 8. Actualizar daily_energy_totals
    const todayStr = now.toISOString().split('T')[0] // "YYYY-MM-DD"
    const today = new Date(todayStr + 'T00:00:00.000Z')

    for (const machine of machines) {
      if (!machine.branch_id) continue
      const energyKwh = ((machine.power_kw || 0) * 0.5) / 60 // energía en ventana de 30 seg (0.5 min)

      try {
        await db.$executeRawUnsafe(
          `INSERT INTO daily_energy_totals (device_id, day, total_kwh, last_sample_ts, updated_at, total_kwh_imported, total_kwh_exported)
           VALUES ($1, $2, $3, $4, NOW(), $3, 0)
           ON CONFLICT (device_id, day) DO UPDATE SET
             total_kwh = daily_energy_totals.total_kwh + $3,
             total_kwh_imported = COALESCE(daily_energy_totals.total_kwh_imported, 0) + $3,
             last_sample_ts = $4,
             updated_at = NOW()`,
          machine.branch_id,
          today,
          energyKwh,
          now
        )
      } catch (err) {
        // Ignorar
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      results
    })
  } catch (error: any) {
    console.error('[IoT Ingest] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET para verificar que el endpoint está activo
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'EcoMonitor IoT Ingest',
    timestamp: new Date().toISOString()
  })
}
