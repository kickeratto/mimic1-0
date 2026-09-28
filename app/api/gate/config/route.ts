import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const profiles = await query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 LIMIT 1', [session.user.id])
  if (!['master', 'admin'].includes(profiles[0]?.role ?? '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  if (body.sinric !== undefined) {
    if (profiles[0]?.role !== 'master') return NextResponse.json({ error: 'Solo el maestro puede modificar las credenciales de Sinric Pro.' }, { status: 403 })
    const deviceId = String(body.sinric.deviceId ?? '').trim()
    const appKey = String(body.sinric.appKey ?? '').trim()
    const appSecret = String(body.sinric.appSecret ?? '').trim()
    if (!deviceId || !appKey || !appSecret) return NextResponse.json({ error: 'Completa Device ID, App Key y App Secret.' }, { status: 400 })
    await query('UPDATE app_users SET sinric_device_id = $1, sinric_app_key = $2, sinric_app_secret = $3 WHERE role = \'master\'', [deviceId, appKey, appSecret])
    return NextResponse.json({ ok: true, message: 'Credenciales Sinric Pro guardadas.' })
  }
  if (body.secondStep !== undefined) {
    if (!['master', 'admin'].includes(profiles[0]?.role ?? '')) return NextResponse.json({ error: 'Solo maestro o administrador pueden cambiar esta configuración' }, { status: 403 })
    const url = String(body.secondStep.webhookUrl ?? '').trim()
    if (url && !/^https:\/\//i.test(url)) return NextResponse.json({ error: 'La URL del segundo aparato debe comenzar con https://' }, { status: 400 })
    await query('UPDATE app_users SET second_step_enabled = $1, second_step_visible = $2, second_step_webhook_url = $3, second_step_webhook_method = $4, second_step_webhook_secret = COALESCE($5, second_step_webhook_secret) WHERE role = \'master\'', [Boolean(body.secondStep.enabled), Boolean(body.secondStep.visible), url || null, body.secondStep.method === 'GET' ? 'GET' : 'POST', String(body.secondStep.secret ?? '').trim() || null])
    return NextResponse.json({ ok: true, message: 'Configuración del segundo aparato guardada.' })
  }
  if (body.webhookUrl !== undefined) {
    const url = String(body.webhookUrl ?? '').trim()
    const method = body.webhookMethod === 'GET' ? 'GET' : 'POST'
    const secret = String(body.webhookSecret ?? '').trim() || null
    if (url && !/^https:\/\//i.test(url)) return NextResponse.json({ error: 'La URL debe comenzar con https://' }, { status: 400 })
    await query('UPDATE app_users SET gate_webhook_url = $1, gate_webhook_method = $2, gate_webhook_secret = COALESCE($3, gate_webhook_secret) WHERE id = $4', [url || null, method, secret, session.user.id])
    return NextResponse.json({ ok: true, message: 'Configuración guardada.' })
  }
  const savedCredentials = await query<{ sinric_device_id: string | null; sinric_app_key: string | null; sinric_app_secret: string | null }>('SELECT sinric_device_id, sinric_app_key, sinric_app_secret FROM app_users WHERE role = \'master\' LIMIT 1')
  const deviceId = savedCredentials[0]?.sinric_device_id || process.env.SINRIC_DEVICE_ID
  const appKey = savedCredentials[0]?.sinric_app_key || process.env.SINRIC_APP_KEY
  const appSecret = savedCredentials[0]?.sinric_app_secret || process.env.SINRIC_APP_SECRET
  if (!deviceId || !appKey) return NextResponse.json({ ok: false, message: 'Faltan SINRIC_DEVICE_ID o SINRIC_APP_KEY.' }, { status: 503 })
  try {
    const response = await fetch(`https://api.sinric.pro/v1/devices/${encodeURIComponent(deviceId)}`, { headers: { Authorization: appKey, 'x-sinric-api-key': appKey, ...(appSecret ? { 'x-sinric-app-secret': appSecret } : {}) }, cache: 'no-store' })
    return NextResponse.json({ ok: response.ok, message: response.ok ? 'Conexión correcta: Sinric Pro respondió y las credenciales son válidas.' : `Sinric Pro rechazó la solicitud (${response.status}). Revisa Device ID, App Key, App Secret y que el dispositivo esté en línea.`, status: response.status })
  } catch { return NextResponse.json({ ok: false, message: 'No se pudo conectar con Sinric Pro.' }, { status: 502 }) }
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const profiles = await query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 LIMIT 1', [session.user.id])
  const isMaster = profiles[0]?.role === 'master'
  const profile = await query<{ gate_webhook_url: string | null; gate_webhook_method: string | null; gate_webhook_secret: string | null; second_step_enabled: boolean; second_step_visible: boolean; second_step_webhook_url: string | null; second_step_webhook_method: string | null; second_step_webhook_secret: string | null; sinric_device_id: string | null; sinric_app_key: string | null; sinric_app_secret: string | null }>('SELECT gate_webhook_url, gate_webhook_method, gate_webhook_secret, second_step_enabled, second_step_visible, second_step_webhook_url, second_step_webhook_method, second_step_webhook_secret, sinric_device_id, sinric_app_key, sinric_app_secret FROM app_users WHERE role IN (\'master\', \'admin\') ORDER BY CASE WHEN role = \'master\' THEN 0 ELSE 1 END LIMIT 1')
  const saved = profile[0]
  const configuredDeviceId = saved?.sinric_device_id || process.env.SINRIC_DEVICE_ID
  const configuredAppKey = saved?.sinric_app_key || process.env.SINRIC_APP_KEY
  const configuredAppSecret = saved?.sinric_app_secret || process.env.SINRIC_APP_SECRET
  const deviceIdConfigured = Boolean(configuredDeviceId)
  const appKeyConfigured = Boolean(configuredAppKey)
  const appSecretConfigured = Boolean(configuredAppSecret)
  let reachable = false
  if (deviceIdConfigured && appKeyConfigured) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`https://api.sinric.pro/v1/devices/${encodeURIComponent(configuredDeviceId!)}`, { headers: { Authorization: configuredAppKey!, 'x-sinric-api-key': configuredAppKey!, ...(configuredAppSecret ? { 'x-sinric-app-secret': configuredAppSecret } : {}) }, cache: 'no-store', signal: controller.signal })
      clearTimeout(timeout)
      reachable = response.ok
    } catch { reachable = false }
  }
  const diagnostic = !deviceIdConfigured ? 'Falta Device ID.' : !appKeyConfigured ? 'Falta App Key.' : !appSecretConfigured ? 'Falta App Secret.' : !reachable ? 'Sinric Pro no respondió. Revisa credenciales, dispositivo y conexión a Internet.' : 'Conexión correcta; Sinric Pro respondió.'
  return NextResponse.json({ deviceIdConfigured, appKeyConfigured, appSecretConfigured, reachable, connected: deviceIdConfigured && appKeyConfigured && reachable, diagnostic: isMaster ? diagnostic : undefined, transport: 'sinric-pro', webhookUrl: saved?.gate_webhook_url ?? '', webhookMethod: saved?.gate_webhook_method ?? 'POST', webhookSecretConfigured: Boolean(saved?.gate_webhook_secret), sinricDeviceId: isMaster ? (saved?.sinric_device_id ?? process.env.SINRIC_DEVICE_ID ?? '') : '', sinricAppKey: isMaster ? (saved?.sinric_app_key ?? process.env.SINRIC_APP_KEY ?? '') : '', sinricAppSecret: '', secondStepEnabled: Boolean(saved?.second_step_enabled), secondStepVisible: Boolean(saved?.second_step_visible), secondStepWebhookUrl: saved?.second_step_webhook_url ?? '', secondStepWebhookMethod: saved?.second_step_webhook_method ?? 'POST', secondStepSecretConfigured: Boolean(saved?.second_step_webhook_secret), checkedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
