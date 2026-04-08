'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Wrench, Users, Truck, ClipboardList, BarChart3, Package,
  ChevronLeft, ChevronRight, DollarSign, Banknote, Receipt,
  ShoppingCart, FileText, Boxes, TrendingUp, LogOut
} from 'lucide-react'
import { clsx } from 'clsx'
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher'

type NavItem = { href: string; icon: any; label: string; exact?: boolean }
type NavGroup = { title: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    title: 'Operações',
    items: [
      { href: '/dashboard',            icon: BarChart3,     label: 'Painel Geral',       exact: true },
      { href: '/dashboard/ordens',     icon: ClipboardList, label: 'Ordens de Serviço' },
      { href: '/dashboard/orcamentos', icon: FileText,      label: 'Orçamentos' },
      { href: '/dashboard/clientes',   icon: Users,         label: 'Clientes' },
      { href: '/dashboard/caminhoes',  icon: Truck,         label: 'Frota' },
    ]
  },
  {
    title: 'Financeiro',
    items: [
      { href: '/dashboard/financeiro', icon: DollarSign,  label: 'Contas Pagar/Receber' },
      { href: '/dashboard/caixa',      icon: Banknote,    label: 'Fluxo de Caixa' },
      { href: '/dashboard/relatorios', icon: TrendingUp,  label: 'DRE / Relatórios' },
    ]
  },
  {
    title: 'Estoque & Vendas',
    items: [
      { href: '/dashboard/pdv',      icon: ShoppingCart, label: 'PDV / Frente de Caixa' },
      { href: '/dashboard/estoque',  icon: Boxes,        label: 'Controle de Estoque' },
      { href: '/dashboard/servicos', icon: Package,      label: 'Peças & Serviços' },
    ]
  },
  {
    title: 'Fiscal',
    items: [
      { href: '/dashboard/fiscal', icon: Receipt, label: 'Notas Fiscais' },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-current-width',
      collapsed ? '60px' : '240px'
    )
  }, [collapsed])

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-current-width', '240px')
  }, [])

  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="sidebar" style={{ width: collapsed ? '60px' : '240px' }}>
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-[14px] flex-shrink-0',
        collapsed && 'justify-center px-0'
      )} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--brand-600)' }}>
          <Wrench size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-[13px] font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>Mecânica</div>
            <div className="text-[10px] font-bold tracking-widest uppercase whitespace-nowrap" style={{ color: 'var(--brand-400)' }}>Pai e Filho</div>
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {navGroups.map(group => (
          <div key={group.title}>
            {!collapsed && (
              <div className="text-[9px] font-bold uppercase tracking-widest px-2 py-2 mt-1"
                style={{ color: 'var(--text-muted)' }}>
                {group.title}
              </div>
            )}
            {collapsed && <div className="my-1" style={{ borderTop: '1px solid var(--border-subtle)' }}/>}
            {group.items.map(({ href, icon: Icon, label, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link
                  key={href} href={href}
                  title={collapsed ? label : undefined}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-lg text-xs font-medium transition-colors duration-150 mb-0.5',
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2',
                  )}
                  style={active ? {
                    backgroundColor: 'color-mix(in srgb, var(--brand-600) 20%, transparent)',
                    color: 'var(--brand-300)',
                    border: '1px solid color-mix(in srgb, var(--brand-600) 30%, transparent)',
                  } : {
                    color: 'var(--text-muted)',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}}
                >
                  <Icon size={15} className="flex-shrink-0" style={{ color: active ? 'var(--brand-400)' : undefined }} />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {!collapsed && active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: 'var(--brand-400)' }}/>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Theme switcher */}
      <ThemeSwitcher collapsed={collapsed} />

      {/* Logout */}
      <div className="px-2 pb-1 flex-shrink-0">
        <button
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors',
            collapsed && 'justify-center px-0'
          )}
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239,68,68,0.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
          title="Sair"
        >
          <LogOut size={14}/>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className="px-2 py-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          className={clsx(
            'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors',
            collapsed && 'justify-center px-0'
          )}
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 4%, transparent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight size={14}/> : <><ChevronLeft size={14}/><span>Recolher</span></>}
        </button>
      </div>
    </aside>
  )
}
