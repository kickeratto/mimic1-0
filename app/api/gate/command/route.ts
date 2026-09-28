import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const boundDeviceId = request.headers.get('cookie')?.match(/(?:^|; )porton_device=([^;]+)/)?.[1] ?? null
  const access = await query<{ status: string; device_id: string | null }>('SELECT status, device_id FROM app_users WHERE id = $1 LIMIT 1', [session.user.id])
  if (access[0]?.status === 'suspended') return NextResponse.json({ error: 'Tu acceso está suspendido temporalmente' }, { status: 403 })
  const profile = await query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 LIMIT 1', [session.user.id])
  const requiresDeviceBinding = profile[0]?.role === 'user'
  if (requiresDeviceBinding && (!boundDeviceId || (access[0]?.device_id && decodeURIComponent(boundDeviceId) !== access[0].device_id))) return NextResponse.json({ error: 'Este teléfono no está autorizado para esta cuenta' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const command = body.command
  const step = body.step === 2 ? 2 : 1
  if (!['pulse', 'open', 'close'].includes(command)) return NextResponse.json({ error: 'Comando inválido' }, { status: 400 })

  const settings = await query<{ second_step_enabled: boolean; second_step_webhook_url: string | null; second_step_webhook_method: string | null; second_step_webhook_secret: string | null }>('SELECT second_step_enabled, second_step_webhook_url, second_step_webhook_method, second_step_webhook_secret FROM app_users WHERE role = \'master\' LIMIT 1')
  const second = settings[0]
  if (step === 2 && (!second?.second_step_enabled || !second.second_step_webhook_url)) return NextResponse.json({ error: 'El segundo control está deshabilitado o sin configurar' }, { status: 503 })
  const credentials = await query<{ sinric_device_id: string | null; sinric_app_key: string | null }>('SELECT sinric_device_id, sinric_app_key FROM app_users WHERE role = \'master\' LIMIT 1')
  const deviceId = credentials[0]?.sinric_device_id || process.env.SINRIC_DEVICE_ID
  const appKey = credentials[0]?.sinric_app_key || process.env.SINRIC_APP_KEY
  if (step === 1 && (!deviceId || !appKey)) return NextResponse.json({ error: 'Falta configurar Sinric Pro: Device ID y App Key' }, { status: 503 })
  const targetUrl = step === 2 ? second.second_step_webhook_url! : `https://api.sinric.pro/v1/devices/${encodeURIComponent(deviceId!)}/action`
  const method = step === 2 ? (second.second_step_webhook_method === 'GET' ? 'GET' : 'POST') : 'POST'
  const value = command === 'close' ? 'Off' : 'On'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(targetUrl, {
      method,
      headers: { ...(step === 1 ? { Authorization: appKey! } : second.second_step_webhook_secret ? { Authorization: `Bearer ${second.second_step_webhook_secret}`, 'x-webhook-secret': second.second_step_webhook_secret } : {}), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(step === 1 ? { action: 'setPowerState', value } : { command, source: 'TECNO-OTAY', step: 2 }),
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return NextResponse.json({ error: 'El webhook rechazó el comando' }, { status: 502 })
    return NextResponse.json({ ok: true, command, transport: 'webhook' })
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con el webhook del portón' }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
