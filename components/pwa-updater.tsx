'use client'

import { useEffect } from 'react'

export function PwaUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let refreshing = false
    const register = async () => {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      await registration.update()

      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
    }

    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    register().catch(() => undefined)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  return null
}

export default PwaUpdater
