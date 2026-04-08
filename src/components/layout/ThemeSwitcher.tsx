'use client'
import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Palette, Check } from 'lucide-react'
import { useTheme, ThemeColor } from '@/contexts/ThemeContext'

const COLOR_OPTIONS: { value: ThemeColor; label: string; hex: string }[] = [
  { value: 'blue',    label: 'Azul',     hex: '#2563eb' },
  { value: 'emerald', label: 'Verde',    hex: '#059669' },
  { value: 'violet',  label: 'Violeta',  hex: '#7c3aed' },
  { value: 'rose',    label: 'Rosa',     hex: '#e11d48' },
  { value: 'amber',   label: 'Âmbar',   hex: '#d97706' },
  { value: 'cyan',    label: 'Ciano',    hex: '#0891b2' },
  { value: 'orange',  label: 'Laranja',  hex: '#ea580c' },
  { value: 'teal',    label: 'Teal',     hex: '#0f766e' },
]

export function ThemeSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setMode, setColor } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const isLight = theme.mode === 'light'

  return (
    <div ref={ref} className="relative px-2 pb-1">
      <button
        onClick={() => setOpen(o => !o)}
        title="Tema"
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors
          ${collapsed ? 'justify-center px-0' : ''}`}
        style={{
          color: open ? 'var(--text-secondary)' : 'var(--text-muted)',
          backgroundColor: open ? 'color-mix(in srgb, var(--text-primary) 6%, transparent)' : undefined,
        }}
      >
        <Palette size={14} />
        {!collapsed && <span>Tema</span>}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-2 mb-2 w-52 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border-subtle)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2.5 border-b text-[10px] font-bold uppercase tracking-widest"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            Personalizar Tema
          </div>

          {/* Light / Dark toggle */}
          <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div
              className="text-[10px] font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Modo
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('dark')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all border
                  ${!isLight
                    ? 'border-brand-600 text-brand-400 bg-brand-600-10'
                    : 'border-transparent hover:border-white'
                  }`}
                style={{ color: !isLight ? undefined : 'var(--text-muted)' }}
              >
                <Moon size={12} /> Escuro
              </button>
              <button
                onClick={() => setMode('light')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all border
                  ${isLight
                    ? 'border-brand-600 text-brand-400 bg-brand-600-10'
                    : 'border-transparent hover:border-black/10'
                  }`}
                style={{ color: isLight ? undefined : 'var(--text-muted)' }}
              >
                <Sun size={12} /> Claro
              </button>
            </div>
          </div>

          {/* Color swatches */}
          <div className="px-3 py-3">
            <div
              className="text-[10px] font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Cor de Destaque
            </div>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setColor(opt.value)}
                  title={opt.label}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all ring-2 ring-offset-1"
                    style={{
                      background: opt.hex,
                      outline: theme.color === opt.value ? `2px solid ${opt.hex}` : '2px solid transparent',
                      outlineOffset: '2px',
                    }}
                  >
                    {theme.color === opt.value && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
