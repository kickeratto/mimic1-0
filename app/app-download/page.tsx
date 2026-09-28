'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export default function AppDownloadPage() {
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  const copyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  const shareLink = async () => {
    if ('share' in navigator) await navigator.share({ title: 'TECNO-OTAY', text: 'Instala TECNO-OTAY en tu teléfono', url: window.location.href })
    else await copyLink()
  }

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
    setIsStandalone(standalone)
    const userAgent = navigator.userAgent
    setIsIOS(/iPhone|iPad|iPod/i.test(userAgent))
    setIsAndroid(/Android/i.test(userAgent))
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1120] px-5 py-8 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111a2d] p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 text-2xl font-bold shadow-[0_10px_30px_rgba(59,130,246,.35)]">T</div>
        <p className="mt-5 text-xl font-bold tracking-[0.16em] text-blue-400">TECNO-OTAY</p>
        <p className="mt-1 text-xs text-slate-500">Tecnología a tu alcance...</p>
        <h1 className="mt-8 text-2xl font-semibold">{isStandalone ? 'Aplicación instalada' : 'Instala la aplicación'}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{isStandalone ? 'Ya estás usando TECNO-OTAY como aplicación. Inicia sesión para continuar.' : isIOS ? 'En iPhone, instala TECNO-OTAY desde Safari para tener el icono en tu pantalla de inicio.' : isAndroid ? 'En Android, toca el botón azul para instalar TECNO-OTAY automáticamente.' : 'Abre este enlace desde un teléfono para instalar TECNO-OTAY.'}</p>
        {!isStandalone && isAndroid && installPrompt && <button type="button" onClick={installApp} className="mt-6 w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">Instalar TECNO-OTAY en Android</button>}
        {!isStandalone && isAndroid && !installPrompt && <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-left text-sm text-blue-100"><p className="font-semibold">Instalación en Android:</p><ol className="mt-2 list-inside list-decimal space-y-1 text-blue-100/80"><li>Abre el enlace en Chrome.</li><li>Toca el menú de tres puntos.</li><li>Selecciona “Instalar aplicación”.</li><li>Confirma la instalación.</li></ol></div>}
        {!isStandalone && isIOS && <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-left text-sm text-blue-100"><p className="font-semibold">Instalación rápida en iPhone:</p><ol className="mt-2 list-inside list-decimal space-y-1 text-blue-100/80"><li>Si abriste WhatsApp, toca “Abrir en Safari”.</li><li>En Safari, toca Compartir.</li><li>Elige “Agregar a pantalla de inicio”.</li><li>Toca “Agregar” y abre el icono TECNO-OTAY.</li></ol><p className="mt-3 border-t border-blue-400/15 pt-3 text-xs text-blue-100/70">iPhone no descarga un archivo; crea un icono que abre la app a pantalla completa.</p></div>}
        {!isStandalone && <div className="mt-4 flex gap-2"><button type="button" onClick={shareLink} className="flex-1 rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-3 text-xs font-semibold text-blue-100">Compartir enlace</button><button type="button" onClick={copyLink} className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-xs font-semibold text-slate-200">{copied ? 'Enlace copiado' : 'Copiar enlace'}</button></div>}
        <Link href="/sign-in" className="mt-7 block rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">{isStandalone ? 'Iniciar sesión' : 'Continuar a TECNO-OTAY'}</Link>
        <p className="mt-4 text-xs text-slate-500">Las actualizaciones se aplican automáticamente al cerrar y volver a abrir la app.</p>
      </section>
    </main>
  )
}
