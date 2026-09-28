import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // URL del Webhook / Ejecución directa de eWeLink
    const webhookUrl = process.env.EWELINK_WEBHOOK_URL || 'https://web.ewelink.cc/v2/scene/webhooks/execute?id=6ab9fc4e546ad58ff9a88108'

    const res = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'eWeLink no procesó el comando correctamente' },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}