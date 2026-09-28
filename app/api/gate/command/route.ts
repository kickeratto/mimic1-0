import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const email = process.env.EWELINK_EMAIL
    const password = process.env.EWELINK_PASSWORD
    const region = process.env.EWELINK_REGION || 'us'
    const deviceId = process.env.EWELINK_DEVICE_ID

    if (!email || !password || !deviceId) {
      return NextResponse.json({ success: false, error: 'Faltan variables de entorno de eWeLink' }, { status: 400 })
    }

    // 1. Obtener Token de Acceso desde eWeLink
    const loginRes = await fetch(`https://${region}-api.coolkit.cc:8080/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        version: 8,
        ts: Math.floor(Date.now() / 1000),
        appid: 'oe1243567890abcdef', // AppID público estándar de eWeLink
        imei: '12345678-1234-1234-1234-123456789012',
        os: 'android',
      }),
    })

    const loginData = await loginRes.json()

    if (loginData.error !== 0 || !loginData.at) {
      return NextResponse.json({ success: false, error: 'Error de autenticación con eWeLink', details: loginData }, { status: 401 })
    }

    const at = loginData.at

    // 2. Enviar pulso/encendido al dispositivo Sonoff/eWeLink
    const toggleRes = await fetch(`https://${region}-zeroconf-api.coolkit.cc:8080/api/v2/device/thing/status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${at}`,
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