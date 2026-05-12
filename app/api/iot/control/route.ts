import { NextResponse } from 'next/server'

// Estado de los LEDs en memoria (simple para demo)
const ledStates: Record<string, boolean> = {
  br01: false,
  br02: false,
  br03: false,
}

// GET — El ESP32 consulta el estado de los LEDs
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('device_id')

  if (deviceId) {
    // Estado de un LED específico
    return NextResponse.json({
      device_id: deviceId,
      led_on: ledStates[deviceId] ?? false
    })
  }

  // Todos los estados
  return NextResponse.json({ leds: ledStates })
}

// POST — El dashboard (o usuario) cambia el estado de un LED
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, led_on } = body

    if (!device_id) {
      return NextResponse.json({ error: 'device_id requerido' }, { status: 400 })
    }

    ledStates[device_id] = Boolean(led_on)

    return NextResponse.json({
      ok: true,
      device_id,
      led_on: ledStates[device_id]
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? 'Error' },
      { status: 500 }
    )
  }
}
