import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import GateDashboard from '@/components/gate-dashboard'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'

export default async function Page() {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  if (!session?.user) redirect('/sign-in')
  const profiles = await query<{ role: string; status: string }>('SELECT role, status FROM app_users WHERE id = $1 LIMIT 1', [session.user.id])
  const profile = profiles[0]
  if (profile?.status === 'suspended') redirect('/sign-in')
  const isPhone = /Android|iPhone|iPad|iPod|Mobile/i.test(requestHeaders.get('user-agent') ?? '')
  if (profile?.role === 'user' && !isPhone) redirect('/sign-in')
  return <GateDashboard />
}

