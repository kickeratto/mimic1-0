import { NextResponse } from 'next/server'
// @ts-ignore
import ewelink from 'ewelink-api'

export async function POST() {
  try {
    const email = process.env.EWELINK_EMAIL
    const password = process.env.EWELINK_PASSWORD
    const deviceid = process.env.EWELINK_DEVICE_ID
    const region = process.env.EWELINK_REGION || 'us'

    if (!email || !password || !deviceid) {
      return NextResponse.json(
        { success: false, error: 'Faltan credenciales de eWeLink en Vercel' },
        { status: 400 }
      )
    }

    const connection = new ewelink({
      email,
      password,
      region,
    })

    const result = await connection.setDevicePowerState(deviceid, 'on')

    if (result && result.status === 'ok') {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.msg || 'Error al conectar con eWeLink' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}