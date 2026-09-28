import { NextResponse } from 'next/server'
// @ts-ignore
import ewelink from 'ewelink-api'

export async function POST() {
  try {
    const email = eddy.s.mtz@gmail.com
    const password = Lalo1234@
    const deviceid = 10026a23b1
    const region = us

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