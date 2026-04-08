'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function ProgressInner() {
  const [progress, setProgress] = useState(0)
  const [visible,  setVisible]  = useState(false)
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const complete = useCallback(() => {
    setProgress(100)
    setTimeout(() => { setVisible(false); setProgress(0) }, 350)
  }, [])

  // Reset on route change
  useEffect(() => { complete() }, [pathname, searchParams, complete])

  // Intercept link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href') || ''
      if (!href || href.startsWith('#') || href.startsWith('http') || anchor.target === '_blank') return
      setVisible(true)
      setProgress(15)
      const t1 = setTimeout(() => setProgress(45), 120)
      const t2 = setTimeout(() => setProgress(72), 350)
      const t3 = setTimeout(() => setProgress(88), 700)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
    document.addEventListener('click', handleClick, { passive: true })
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2,
      zIndex: 9999, pointerEvents: 'none', overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'linear-gradient(90deg, var(--brand-600) 0%, var(--brand-400) 50%, var(--brand-300) 100%)',
        transition: progress === 100 ? 'width 0.08s ease-out' : 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
        opacity: progress === 100 ? 0 : 1,
        transitionProperty: 'width, opacity',
        boxShadow: '0 0 10px rgba(96,165,250,0.7)',
      }} />
    </div>
  )
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressInner />
    </Suspense>
  )
}
