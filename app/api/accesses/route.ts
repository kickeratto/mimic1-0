import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool, query } from '@/lib/db'

function getDeviceId(request: Request) {
  const match = request.headers.get('cookie')?.match(/(?:^|; )porton_device=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

async function getOrCreateProfile(session: { user: { id: string; email: string; name: string } }, deviceId: string | null) {
  const current = await query<{ id: string; role: string; status: string; device_id: string | null; device_status: string }>('SELECT id, role, status, device_id, device_status FROM app_users WHERE id = $1 LIMIT 1', [session.user.id])
  if (current.length) {
    const profile = current[0]
    // El maestro y los administradores pueden entrar desde cualquier dispositivo; la vinculación estricta aplica solo a usuarios normales.
    if (profile.role === 'user' && profile.device_id && profile.device_id !== deviceId) return { ...profile, device_status: 'blocked' }
    if (profile.role === 'user' && !profile.device_id && deviceId) await query('UPDATE app_users SET device_id = $1, device_status = \'approved\' WHERE id = $2', [deviceId, session.user.id])
    return { ...profile, device_id: profile.device_id ?? deviceId, device_status: profile.device_id ? profile.device_status : 'approved' }
  }

  const profiles = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM app_users')
  const role = profiles[0]?.count === '0' ? 'master' : 'user'
  const rows = await query<{ id: string; role: string; status: string; device_id: string | null; device_status: string }>(
    'INSERT INTO app_users (id, email, name, role, status, device_id, device_status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, role, status, device_id, device_status',
    [session.user.id, session.user.email, session.user.name, role, 'active', deviceId, deviceId ? 'approved' : 'unbound'],
  )
  return rows[0]
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  let profile
  try { profile = await getOrCreateProfile(session, getDeviceId(request)) } catch (error) {
    if (error instanceof Error && error.message === 'DEVICE_NOT_AUTHORIZED') return NextResponse.json({ error: 'Este teléfono no está autorizado. Solicita al administrador que autorice este dispositivo.' }, { status: 403 })
    throw error
  }
  if (profile.status === 'suspended') return NextResponse.json({ error: 'Tu acceso está suspendido' }, { status: 403 })
  const rows = profile.role === 'user'
    ? await query('SELECT id, email, name, phone, role, status, created_at, device_status FROM app_users WHERE id = $1', [session.user.id])
    : await query('SELECT id, email, name, phone, role, status, created_at, device_status FROM app_users ORDER BY created_at DESC')
  const response = NextResponse.json(rows)
  response.headers.set('x-porton-role', profile.role)
  return response
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const current = await getOrCreateProfile(session, getDeviceId(request))
  if (current.device_status === 'blocked') return NextResponse.json({ error: 'Este teléfono no está autorizado para esta cuenta' }, { status: 403 })
  if (current.status === 'suspended') return NextResponse.json({ error: 'Tu acceso está suspendido' }, { status: 403 })
  if (current.role !== 'master' && current.role !== 'admin') return NextResponse.json({ error: 'Solo un administrador puede invitar usuarios' }, { status: 403 })
  const body = await request.json()
  if (body.role === 'admin' && current.role !== 'master') return NextResponse.json({ error: 'Solo el usuario maestro puede crear administradores' }, { status: 403 })
  const email = String(body.email ?? '').trim().toLowerCase()
  const name = String(body.name ?? '').trim()
  const phone = String(body.phone ?? '').trim() || null
  const password = String(body.password ?? '')
  if (!email || !name || password.length < 8) return NextResponse.json({ error: 'Nombre, correo y una contraseña de mínimo 8 caracteres son obligatorios' }, { status: 400 })
  const existing = await query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [email])
  if (existing.length) return NextResponse.json({ error: 'Ese correo ya tiene una cuenta' }, { status: 409 })
  const signup = await auth.api.signUpEmail({ body: { name, email, password } })
  if (!signup?.user?.id) return NextResponse.json({ error: 'No se pudo crear la cuenta de acceso' }, { status: 400 })
  const role = body.role === 'admin' ? 'admin' : 'user'
  const rows = await query('INSERT INTO app_users (id, email, name, phone, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, phone, role, status, created_at', [signup.user.id, email, name, phone, role, 'active'])
  return NextResponse.json(rows[0], { status: 201 })
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const current = await getOrCreateProfile(session, getDeviceId(request))
  if (current.status === 'suspended' || (current.role !== 'master' && current.role !== 'admin')) return NextResponse.json({ error: 'Solo un administrador puede cambiar accesos' }, { status: 403 })
  const body = await request.json()
  const id = String(body.id ?? '')
  const status = body.status === 'suspended' ? 'suspended' : 'active'
  if (!id) return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })
  const target = await query<{ role: string }>('SELECT role FROM app_users WHERE id = $1 LIMIT 1', [id])
  if (!target.length) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (target[0].role === 'master') return NextResponse.json({ error: 'El usuario maestro no puede ser suspendido' }, { status: 403 })
  if (current.role === 'admin' && target[0].role === 'admin') return NextResponse.json({ error: 'Solo el usuario maestro puede administrar administradores' }, { status: 403 })
  const rows = await query('UPDATE app_users SET status = $1 WHERE id = $2 RETURNING id, email, name, phone, role, status, created_at', [status, id])
  if (!rows.length) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const current = await getOrCreateProfile(session, getDeviceId(request))
  if (current.status === 'suspended' || (current.role !== 'master' && current.role !== 'admin')) return NextResponse.json({ error: 'Solo un administrador puede dar de baja usuarios' }, { status: 403 })
  const body = await request.json()
  const id = String(body.id ?? '')
  if (!id || id === session.user.id) return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
  const target = await query<{ id: string; role: string }>('SELECT id, role FROM app_users WHERE id = $1 LIMIT 1', [id])
  if (!target.length) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (target[0].role === 'master') return NextResponse.json({ error: 'El usuario maestro no puede darse de baja' }, { status: 403 })
  if (current.role === 'admin' && target[0].role === 'admin') return NextResponse.json({ error: 'Solo el usuario maestro puede dar de baja administradores' }, { status: 403 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Remove dependent authentication records before removing the account itself.
    await client.query('DELETE FROM session WHERE "userId" = $1', [id])
    await client.query('DELETE FROM account WHERE "userId" = $1', [id])
    await client.query('DELETE FROM app_users WHERE id = $1', [id])
    await client.query('DELETE FROM "user" WHERE id = $1', [id])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[v0] Error al dar de baja usuario:', error)
    return NextResponse.json({ error: 'No se pudo completar la baja. Intenta nuevamente.' }, { status: 500 })
  } finally {
    client.release()
  }
  return NextResponse.json({ ok: true, id })
}
