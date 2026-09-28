import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import GateDashboard from '@/components/gate-dashboard'
import { auth } from '@/lib/auth'
import { query } from '@/lib/db'

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const profiles = await query<{ role: string; status: string }>('SELECT role, status FROM app_users WHERE id = $1 LIMIT 1', [session.user.id])
  const profile = profiles[0]
  if (!profile || profile.status === 'suspended' || (profile.role !== 'master' && profile.role !== 'admin')) redirect('/')
  return <GateDashboard managementOnly />
}
