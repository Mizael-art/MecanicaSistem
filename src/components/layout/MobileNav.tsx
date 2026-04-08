'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, ClipboardList, Users, ShoppingCart, LayoutGrid, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'

const mainItems = [
  { href: '/dashboard',           icon: BarChart3,     label: 'Painel',   exact: true },
  { href: '/dashboard/ordens',    icon: ClipboardList, label: 'Ordens'              },
  { href: '/dashboard/pdv',       icon: ShoppingCart,  label: 'PDV'                 },
  { href: '/dashboard/clientes',  icon: Users,         label: 'Clientes'            },
]

const moreItems = [
  { href: '/dashboard/orcamentos', label: 'Orçamentos' },
  { href: '/dashboard/financeiro', label: 'Financeiro' },
  { href: '/dashboard/caixa',      label: 'Fluxo de Caixa' },
  { href: '/dashboard/estoque',    label: 'Estoque' },
  { href: '/dashboard/relatorios', label: 'DRE / Relatórios' },
  { href: '/dashboard/fiscal',     label: 'Fiscal' },
  { href: '/dashboard/servicos',   label: 'Peças & Serviços' },
  { href: '/dashboard/caminhoes',  label: 'Frota' },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <>
      <nav className="bottom-nav">
        <div className="flex items-stretch justify-around h-[58px]">
          {mainItems.map(({ href, icon: Icon, label, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link key={href} href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors"
                style={{ color: active ? 'var(--brand-400)' : 'var(--text-muted)' }}>
                <div className="p-1.5 rounded-lg transition-all"
                  style={{ backgroundColor: active ? 'color-mix(in srgb, var(--brand-600) 20%, transparent)' : 'transparent' }}>
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.8}/>
                </div>
                <span className="text-[10px] font-semibold leading-none">{label}</span>
              </Link>
            )
          })}
          <button onClick={() => setShowMore(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1"
            style={{ color: 'var(--text-muted)' }}>
            <div className="p-1.5 rounded-lg"><LayoutGrid size={19} strokeWidth={1.8}/></div>
            <span className="text-[10px] font-semibold leading-none">Mais</span>
          </button>
        </div>
      </nav>

      {showMore && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowMore(false)}>
          <div className="border-t rounded-t-2xl p-4" onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'var(--surface-800)', borderColor: 'var(--border-subtle)' }}>
            <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: 'var(--border-subtle)' }}/>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map(item => (
                <Link key={item.href} href={item.href}
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-colors"
                  style={isActive(item.href) ? {
                    backgroundColor: 'color-mix(in srgb, var(--brand-600) 20%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--brand-500) 30%, transparent)',
                    color: 'var(--brand-300)',
                  } : {
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}>
                  {item.label}
                </Link>
              ))}
            </div>
            <button onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#f87171' }}>
              <LogOut size={15}/> Sair do sistema
            </button>
          </div>
        </div>
      )}
    </>
  )
}
