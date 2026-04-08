'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light'
export type ThemeColor =
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'orange'
  | 'teal'

export interface ThemeConfig {
  mode: ThemeMode
  color: ThemeColor
}

interface ThemeContextValue {
  theme: ThemeConfig
  setMode: (mode: ThemeMode) => void
  setColor: (color: ThemeColor) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Palettes for each accent color
const colorPalettes: Record<ThemeColor, Record<string, string>> = {
  blue: {
    '--brand':       '#2563eb',
    '--brand-light': '#3b82f6',
    '--brand-50':    '#eff6ff',
    '--brand-100':   '#dbeafe',
    '--brand-200':   '#bfdbfe',
    '--brand-300':   '#93c5fd',
    '--brand-400':   '#60a5fa',
    '--brand-500':   '#3b82f6',
    '--brand-600':   '#2563eb',
    '--brand-700':   '#1d4ed8',
    '--brand-800':   '#1e40af',
    '--brand-900':   '#1e3a8a',
  },
  emerald: {
    '--brand':       '#059669',
    '--brand-light': '#10b981',
    '--brand-50':    '#ecfdf5',
    '--brand-100':   '#d1fae5',
    '--brand-200':   '#a7f3d0',
    '--brand-300':   '#6ee7b7',
    '--brand-400':   '#34d399',
    '--brand-500':   '#10b981',
    '--brand-600':   '#059669',
    '--brand-700':   '#047857',
    '--brand-800':   '#065f46',
    '--brand-900':   '#064e3b',
  },
  violet: {
    '--brand':       '#7c3aed',
    '--brand-light': '#8b5cf6',
    '--brand-50':    '#f5f3ff',
    '--brand-100':   '#ede9fe',
    '--brand-200':   '#ddd6fe',
    '--brand-300':   '#c4b5fd',
    '--brand-400':   '#a78bfa',
    '--brand-500':   '#8b5cf6',
    '--brand-600':   '#7c3aed',
    '--brand-700':   '#6d28d9',
    '--brand-800':   '#5b21b6',
    '--brand-900':   '#4c1d95',
  },
  rose: {
    '--brand':       '#e11d48',
    '--brand-light': '#f43f5e',
    '--brand-50':    '#fff1f2',
    '--brand-100':   '#ffe4e6',
    '--brand-200':   '#fecdd3',
    '--brand-300':   '#fda4af',
    '--brand-400':   '#fb7185',
    '--brand-500':   '#f43f5e',
    '--brand-600':   '#e11d48',
    '--brand-700':   '#be123c',
    '--brand-800':   '#9f1239',
    '--brand-900':   '#881337',
  },
  amber: {
    '--brand':       '#d97706',
    '--brand-light': '#f59e0b',
    '--brand-50':    '#fffbeb',
    '--brand-100':   '#fef3c7',
    '--brand-200':   '#fde68a',
    '--brand-300':   '#fcd34d',
    '--brand-400':   '#fbbf24',
    '--brand-500':   '#f59e0b',
    '--brand-600':   '#d97706',
    '--brand-700':   '#b45309',
    '--brand-800':   '#92400e',
    '--brand-900':   '#78350f',
  },
  cyan: {
    '--brand':       '#0891b2',
    '--brand-light': '#06b6d4',
    '--brand-50':    '#ecfeff',
    '--brand-100':   '#cffafe',
    '--brand-200':   '#a5f3fc',
    '--brand-300':   '#67e8f9',
    '--brand-400':   '#22d3ee',
    '--brand-500':   '#06b6d4',
    '--brand-600':   '#0891b2',
    '--brand-700':   '#0e7490',
    '--brand-800':   '#155e75',
    '--brand-900':   '#164e63',
  },
  orange: {
    '--brand':       '#ea580c',
    '--brand-light': '#f97316',
    '--brand-50':    '#fff7ed',
    '--brand-100':   '#ffedd5',
    '--brand-200':   '#fed7aa',
    '--brand-300':   '#fdba74',
    '--brand-400':   '#fb923c',
    '--brand-500':   '#f97316',
    '--brand-600':   '#ea580c',
    '--brand-700':   '#c2410c',
    '--brand-800':   '#9a3412',
    '--brand-900':   '#7c2d12',
  },
  teal: {
    '--brand':       '#0f766e',
    '--brand-light': '#14b8a6',
    '--brand-50':    '#f0fdfa',
    '--brand-100':   '#ccfbf1',
    '--brand-200':   '#99f6e4',
    '--brand-300':   '#5eead4',
    '--brand-400':   '#2dd4bf',
    '--brand-500':   '#14b8a6',
    '--brand-600':   '#0d9488',
    '--brand-700':   '#0f766e',
    '--brand-800':   '#115e59',
    '--brand-900':   '#134e4a',
  },
}

const darkSurface = {
  '--surface-950': '#09090d',
  '--surface-900': '#0f0f14',
  '--surface-800': '#141419',
  '--surface-700': '#1a1a22',
  '--surface-600': '#20202a',
  '--surface-500': '#272733',
  '--surface-400': '#30303e',
  '--surface-300': '#3d3d4f',
  '--bg-body':     '#0f0f14',
  '--text-primary':   '#f1f5f9',
  '--text-secondary': '#94a3b8',
  '--text-muted':     '#475569',
  '--border-subtle':  'rgba(255,255,255,0.07)',
  '--card-bg':        '#1a1a22',
  '--input-bg':       '#141419',
}

const lightSurface = {
  '--surface-950': '#f8fafc',
  '--surface-900': '#f1f5f9',
  '--surface-800': '#e9eef5',
  '--surface-700': '#dde4ee',
  '--surface-600': '#cbd4e1',
  '--surface-500': '#b8c4d4',
  '--surface-400': '#a0aec0',
  '--surface-300': '#8896aa',
  '--bg-body':     '#f1f5f9',
  '--text-primary':   '#0f172a',
  '--text-secondary': '#475569',
  '--text-muted':     '#94a3b8',
  '--border-subtle':  'rgba(0,0,0,0.08)',
  '--card-bg':        '#ffffff',
  '--input-bg':       '#f8fafc',
}

function applyTheme(config: ThemeConfig) {
  const root = document.documentElement
  const surface = config.mode === 'dark' ? darkSurface : lightSurface
  const palette = colorPalettes[config.color]

  Object.entries({ ...surface, ...palette }).forEach(([k, v]) => {
    root.style.setProperty(k, v)
  })

  root.setAttribute('data-theme-mode', config.mode)
  root.setAttribute('data-theme-color', config.color)
}

const STORAGE_KEY = 'mecanica-theme'

const defaultTheme: ThemeConfig = { mode: 'dark', color: 'blue' }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: ThemeConfig = JSON.parse(saved)
        setTheme(parsed)
        applyTheme(parsed)
        return
      }
    } catch {}
    applyTheme(defaultTheme)
  }, [])

  const updateTheme = (next: ThemeConfig) => {
    setTheme(next)
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const setMode  = (mode: ThemeMode)   => updateTheme({ ...theme, mode })
  const setColor = (color: ThemeColor) => updateTheme({ ...theme, color })

  return (
    <ThemeContext.Provider value={{ theme, setMode, setColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
