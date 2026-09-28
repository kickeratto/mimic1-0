'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true); setError('')
    const data = new FormData(event.currentTarget)
    const result = isSignUp
      ? await authClient.signUp.email({ name: String(data.get('name')), email: String(data.get('email')), password: String(data.get('password')) })
      : await authClient.signIn.email({ email: String(data.get('email')), password: String(data.get('password')) })
    if (result.error) setError('No se pudo completar la operación. Revisa tus datos e inténtalo de nuevo.')
    else {
      router.push('/'); router.refresh()
    }
    setLoading(false)
  }

  return <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-[#111a2d] p-6 shadow-2xl">
    <div><p className="text-lg font-bold tracking-[0.16em] text-blue-400">TECNO-OTAY</p><p className="mt-1 text-xs text-slate-500">Tecnología a tu alcance...</p><h1 className="mt-5 text-2xl font-semibold">{isSignUp ? 'Crear administrador' : 'Iniciar sesión'}</h1><p className="mt-2 text-sm text-slate-400">Controla tu acceso de forma segura.</p></div>
    {isSignUp && <input name="name" required placeholder="Nombre completo" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-blue-400" />}
    <input name="email" type="email" required placeholder="Correo electrónico" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-blue-400" />
    <input name="password" type="password" required minLength={8} placeholder="Contraseña (mínimo 8 caracteres)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-blue-400" />
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <button disabled={loading} className="w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-60">{loading ? 'Procesando…' : isSignUp ? 'Crear cuenta' : 'Entrar'}</button>
    <a href={isSignUp ? '/sign-in' : '/sign-up'} className="block text-center text-sm text-slate-400 hover:text-white">{isSignUp ? 'Ya tengo una cuenta' : 'Crear cuenta de administrador'}</a>
  </form>
}
