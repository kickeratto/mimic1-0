import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profiles = await query<{ role: string; sinric_device_id: string | null; sinric_app_key: string | null; sinric_app_secret: string | null }>(
    'SELECT role, sinric_device_id, sinric_app_key, sinric_app_secret FROM app_users WHERE id = $1 LIMIT 1',
    [session.user.id],
  )
  const profile = profiles[0]
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const command = body.command === 'open' || body.command === 'close' || body.command === 'pulse' ? body.command : 'pulse'
  const step = body.step === 2 ? 2 : 1
  if (step === 2 && profile.role === 'user') return NextResponse.json({ error: 'No tienes permiso para el segundo portón.' }, { status: 403 })

  const deviceId = profile.sinric_device_id || process.env.SINRIC_DEVICE_ID
  const appKey = profile.sinric_app_key || process.env.API_KEY_2 || process.env.SINRIC_APP_KEY
  const appSecret = profile.sinric_app_secret || process.env.Secret || process.env.SINRIC_APP_SECRET
  if (!deviceId || !appKey || !appSecret) return NextResponse.json({ error: 'Sinric Pro no está configurado completamente.' }, { status: 503 })

  try {
    const response = await fetch(`https://api.sinric.pro/v1/devices/${encodeURIComponent(deviceId)}/action`, {
      method: 'POST',
      headers: { Authorization: appKey, 'x-sinric-api-key': appKey, 'x-sinric-app-secret': appSecret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: command, step }),
      cache: 'no-store',
    })
    if (!response.ok) return NextResponse.json({ error: `Sinric Pro rechazó el comando (${response.status}). Revisa Device ID y credenciales.` }, { status: 502 })
    return NextResponse.json({ success: true, command, step })
  } catch { return NextResponse.json({ error: 'No se pudo conectar con Sinric Pro.' }, { status: 502 }) }
}
