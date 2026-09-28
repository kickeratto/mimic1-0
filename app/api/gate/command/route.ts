import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const email = process.env.EWELINK_EMAIL
    const password = process.env.EWELINK_PASSWORD
    const region = process.env.EWELINK_REGION || 'us'
    const deviceId = process.env.EWELINK_DEVICE_ID

    if (!email || !password || !deviceId) {
      return NextResponse.json(
        { success: false, error: 'Faltan variables de entorno de eWeLink en Vercel' },
        { status: 400 }
      )
    }

    // 1. Iniciar sesión y obtener token
    const loginRes = await fetch(`https://${region}-api.coolkit.cc:8080/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        version: 8,
        ts: Math.floor(Date.now() / 1000),
        appid: 'oe1243567890abcdef',
        imei: '12345678-1234-1234-1234-123456789012',
        os: 'android',
      }),
    })

    const loginData = await loginRes.json()

    if (loginData.error !== 0 || !loginData.at) {
      return NextResponse.json(
        { success: false, error: 'Error de autenticación eWeLink', details: loginData },
        { status: 401 }
      )
    }

    // 2. Enviar orden directa de encendido a eWeLink Cloud
    const toggleRes = await fetch(`https://${region}-apia.coolkit.cc/v2/device/thing/status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loginData.at}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 1,
        id: deviceId,
        params: {
          switch: 'on',
        },
      }),
    })

    const toggleData = await toggleRes.json()

    return NextResponse.json({ success: true, result: toggleData })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}