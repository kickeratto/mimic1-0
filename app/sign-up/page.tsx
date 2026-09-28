import { headers } from 'next/headers'
import { AuthForm } from '@/components/auth-form'

export default async function SignUpPage() {
  const userAgent = (await headers()).get('user-agent') ?? ''
  const isPhone = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
  return <main className="flex min-h-screen items-center justify-center bg-[#0b1120] px-5 text-slate-100">{isPhone ? <AuthForm mode="sign-up" /> : <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111a2d] p-6 text-center"><p className="text-lg font-bold tracking-[0.16em] text-blue-400">TECNO-OTAY</p><p className="mt-1 text-xs text-slate-500">Tecnología a tu alcance...</p><h1 className="mt-6 text-xl font-semibold">Alta disponible en la app</h1><p className="mt-2 text-sm text-slate-400">Los usuarios se registran únicamente desde un teléfono autorizado. Los administradores deben ser dados de alta por el maestro.</p><a href="/sign-in" className="mt-6 inline-block rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold">Ir a iniciar sesión</a></div>}</main>
}
