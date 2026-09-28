import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const appKey = process.env.SINRIC_APP_KEY
    const appSecret = process.env.SINRIC_APP_SECRET
    const deviceId = process.env.SINRIC_DEVICE_ID

    if (!appKey || !appSecret || !deviceId) {
      return NextResponse.json(
        { success: false, error: 'Faltan credenciales de Sinric Pro en Vercel' },
        { status: 400 }
      )
    }

    // 1. Envía el comando ON a Sinric Pro (dispara el evento en Google Home)
    const response = await fetch(`https://api.sinric.pro/api/v1/devices/${deviceId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sinric-app-key': appKey,
        'x-sinric-app-secret': appSecret,
      },
      body: JSON.stringify({
        action: 'setPowerState',
        value: {
          state: 'On',
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, error: errorData.message || 'Sinric Pro rechazó la orden' },
        { status: response.status }
      )
    }

    // 2. Resetea el dispositivo a OFF después de 500ms para dejarlo listo para el siguiente pulso
    setTimeout(async () => {
      await fetch(`https://api.sinric.pro/api/v1/devices/${deviceId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sinric-app-key': appKey,
          'x-sinric-app-secret': appSecret,
        },
        body: JSON.stringify({
          action: 'setPowerState',
          value: {
            state: 'Off',
          },
        }),
      }).catch(() => {})
    }, 500)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}