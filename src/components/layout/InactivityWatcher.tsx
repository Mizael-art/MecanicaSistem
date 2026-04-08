'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const INACTIVITY_MS = 6 * 60 * 60 * 1000 // 6 hours
const WARN_BEFORE_MS = 2 * 60 * 1000      // warn 2 min before

const EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'] as const

export function InactivityWatcher() {
  const router = useRouter()
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnToastId = useRef<string | undefined>(undefined)

  const reset = () => {
    // Clear existing timers
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (warnTimer.current)   clearTimeout(warnTimer.current)

    // Dismiss warning toast if showing
    if (warnToastId.current) {
      toast.dismiss(warnToastId.current)
      warnToastId.current = undefined
    }

    // Warning timer (6h - 2min)
    warnTimer.current = setTimeout(() => {
      warnToastId.current = toast(
        '⚠️ Sessão expira em 2 minutos por inatividade.',
        { duration: WARN_BEFORE_MS, id: 'inactivity-warn' }
      ) as string
    }, INACTIVITY_MS - WARN_BEFORE_MS)

    // Logout timer
    logoutTimer.current = setTimeout(async () => {
      toast.dismiss()
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.error('Sessão expirada por inatividade. Faça login novamente.', { duration: 5000 })
      router.push('/login')
      router.refresh()
    }, INACTIVITY_MS)
  }

  useEffect(() => {
    reset()
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }))
    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
      if (warnTimer.current)   clearTimeout(warnTimer.current)
      EVENTS.forEach(e => window.removeEventListener(e, reset))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
