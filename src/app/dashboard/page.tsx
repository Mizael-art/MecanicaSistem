'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, formatCurrency, formatDate, getStatusColor, getStatusLabel, getPeriodDates, sincronizarAtrasados } from '@/lib/supabase'
import { OrdemServico, Despesa, ResumoFinanceiro } from '@/types'
import {
  TrendingUp, TrendingDown, Clock, AlertCircle, DollarSign,
  Calendar, Plus, ChevronRight, Filter, RefreshCw, Zap
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { DespesaModal } from '@/components/forms/DespesaModal'

type Period = 'today' | 'week' | 'month' | 'custom'

export default function FinanceiroDashboard() {
  const [period, setPeriod]       = useState<Period>('month')
  const [custom, setCustom]       = useState({ inicio: '', fim: '' })
  const [ordens, setOrdens]       = useState<OrdemServico[]>([])
  const [atrasadas, setAtrasadas] = useState<OrdemServico[]>([])
  const [despesas, setDespesas]   = useState<Despesa[]>([])
  const [resumo, setResumo]       = useState<ResumoFinanceiro | null>(null)
  const [loading, setLoading]     = useState(true)
  const [showDespesa, setShowDespesa] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const dates = period === 'custom' ? custom : getPeriodDates(period)
    if (!dates.inicio || !dates.fim) { setLoading(false); return }

    // BUG-04 FIX: auto-mark overdue before fetching
    await sincronizarAtrasados()

    // Busca OS do período E todas as atrasadas (independente de data)
    const [ordensRes, atrasadasRes, despesasRes] = await Promise.all([
      supabase.from('ordens_servico')
        .select('*, clientes(nome), caminhoes(placa)')
        .gte('data_abertura', dates.inicio)
        .lte('data_abertura', dates.fim)
        .order('data_abertura', { ascending: false }),

      // ✅ BUG FIX: busca TODAS atrasadas, sem filtro de data
      supabase.from('ordens_servico')
        .select('*, clientes(nome), caminhoes(placa)')
        .eq('status_pagamento', 'atrasado')
        .order('data_vencimento', { ascending: true }),

      supabase.from('despesas')
        .select('*')
        .gte('data', dates.inicio)
        .lte('data', dates.fim)
        .order('data', { ascending: false }),
    ])

    const os    = ordensRes.data  || []
    const atras = atrasadasRes.data || []
    const desp  = despesasRes.data  || []

    setOrdens(os)
    setAtrasadas(atras)
    setDespesas(desp)

    // KPIs são do período selecionado + atrasadas totais
    const osDosPeriodo = os
    const recebido  = osDosPeriodo.filter(o => o.status_pagamento === 'pago').reduce((s, o) => s + o.valor_total, 0)
    const pendente  = osDosPeriodo.filter(o => o.status_pagamento === 'pendente').reduce((s, o) => s + o.valor_total, 0)
    const atrasVal  = atras.reduce((s, o) => s + o.valor_total, 0)
    const despTotal = desp.reduce((s, d) => s + d.valor, 0)

    setResumo({
      total_recebido: recebido,
      total_pendente: pendente,
      total_atrasado: atrasVal,
      total_despesas: despTotal,
      lucro_liquido:  recebido - despTotal,
      count_pagas:    osDosPeriodo.filter(o => o.status_pagamento === 'pago').length,
      count_pendentes:osDosPeriodo.filter(o => o.status_pagamento === 'pendente').length,
      count_atrasadas:atras.length,
    })
    setLoading(false)
  }, [period, custom.inicio, custom.fim])

  useEffect(() => { fetchData() }, [fetchData])

  const pendentes = ordens.filter(o => o.status_pagamento === 'pendente')
  const pagas     = ordens.filter(o => o.status_pagamento === 'pago')

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Painel Financeiro</h1>
          <p className="page-subtitle">Visão geral do caixa e movimentações</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-ghost p-2" title="Atualizar">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setShowDespesa(true)} className="btn-secondary text-sm">
            <Plus size={14} /> Despesa
          </button>
          <Link href="/dashboard/ordens/nova" className="btn-primary text-sm">
            <Plus size={14} /> Nova OS
          </Link>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter size={13} className="text-slate-600 flex-shrink-0" />
        {(['today','week','month','custom'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              period === p
                ? 'bg-brand-600 text-white border-brand-500'
                : 'bg-surface-700 text-slate-400 border-white hover:text-white'
            )}>
            {{ today:'Hoje', week:'Semana', month:'Mês', custom:'Personalizado' }[p]}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2 mt-1 w-full sm:w-auto sm:mt-0">
            <input type="date" className="input-field w-auto text-xs py-1.5 px-2 min-h-[32px]"
              value={custom.inicio} onChange={e => setCustom(p => ({ ...p, inicio: e.target.value }))} />
            <span className="text-slate-600 text-xs">até</span>
            <input type="date" className="input-field w-auto text-xs py-1.5 px-2 min-h-[32px]"
              value={custom.fim} onChange={e => setCustom(p => ({ ...p, fim: e.target.value }))} />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="stat-card h-24 animate-pulse" />)}
        </div>
      ) : resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Recebido"     value={formatCurrency(resumo.total_recebido)} sub={`${resumo.count_pagas} pagas`}         icon={<TrendingUp size={15}/>}  color="emerald"/>
          <KpiCard label="Pendente"     value={formatCurrency(resumo.total_pendente)} sub={`${resumo.count_pendentes} a receber`}  icon={<Clock size={15}/>}       color="amber"/>
          <KpiCard label="Em Atraso"    value={formatCurrency(resumo.total_atrasado)} sub={`${resumo.count_atrasadas} atrasadas`}  icon={<AlertCircle size={15}/>} color="red"/>
          <KpiCard label="Lucro Líquido" value={formatCurrency(resumo.lucro_liquido)} sub={`Desp: ${formatCurrency(resumo.total_despesas)}`} icon={<DollarSign size={15}/>} color={resumo.lucro_liquido>=0?'blue':'red'}/>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* ✅ Atrasadas — SEMPRE visíveis, sem filtro de período */}
          {atrasadas.length > 0 && (
            <div className="card p-4 border-red-500/20">
              <div className="section-title text-red-400 mb-3">
                <AlertCircle size={13} className="text-red-400" />
                Em Atraso — {atrasadas.length} OS
                <span className="text-slate-600 font-normal normal-case tracking-normal ml-1 text-[10px]">
                  (todas as datas)
                </span>
              </div>
              <OrdensSection ordens={atrasadas} />
            </div>
          )}

          {/* Pendentes do período */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="section-title mb-0">
                <Clock size={12} className="text-amber-400" />
                Pendentes no período ({pendentes.length})
              </div>
              <Link href="/dashboard/ordens" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-0.5">
                Ver todas <ChevronRight size={11}/>
              </Link>
            </div>
            {pendentes.length === 0
              ? <EmptyPeriod label="Nenhuma OS pendente no período"/>
              : <OrdensSection ordens={pendentes.slice(0,6)}/>
            }
          </div>

          {/* Recebidas do período */}
          <div className="card p-4">
            <div className="section-title mb-3">
              <TrendingUp size={12} className="text-emerald-400"/>
              Recebidas no período ({pagas.length})
            </div>
            {pagas.length === 0
              ? <EmptyPeriod label="Nenhuma OS paga no período"/>
              : <OrdensSection ordens={pagas.slice(0,6)}/>
            }
          </div>
        </div>

        {/* Despesas */}
        <div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="section-title mb-0">
                <TrendingDown size={12} className="text-red-400"/>
                Despesas ({despesas.length})
              </div>
              <button onClick={() => setShowDespesa(true)}
                className="w-6 h-6 rounded flex items-center justify-center bg-surface-600 hover:bg-surface-500 border border-white transition-colors">
                <Plus size={11} className="text-slate-300"/>
              </button>
            </div>
            {despesas.length === 0
              ? <EmptyPeriod label="Sem despesas no período"/>
              : (
                <div className="space-y-1">
                  {despesas.slice(0,12).map(d => (
                    <div key={d.id} className="flex items-start justify-between py-2 border-b border-white last:border-0 gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-slate-200 font-medium truncate">{d.nome}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{formatDate(d.data)} · {d.categoria}</div>
                      </div>
                      <span className="text-sm text-red-400 font-semibold flex-shrink-0">
                        -{formatCurrency(d.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Links rápidos para novos módulos */}
          <div className="card p-4 mt-4">
            <div className="section-title mb-3">Módulos Financeiros</div>
            <div className="space-y-1">
              {[
                { href:'/dashboard/financeiro', label:'Contas a Receber/Pagar', icon:'💰' },
                { href:'/dashboard/caixa',      label:'Fluxo de Caixa',         icon:'🏧' },
                { href:'/dashboard/relatorios', label:'DRE / Relatórios',        icon:'📊' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-600 border border-transparent hover:border-white transition-colors">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm text-slate-300">{item.label}</span>
                  <ChevronRight size={13} className="ml-auto text-slate-600"/>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showDespesa && (
        <DespesaModal onClose={() => setShowDespesa(false)} onSave={() => { setShowDespesa(false); fetchData() }}/>
      )}
    </div>
  )
}

// ── Sub-componentes ─────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string
  icon: React.ReactNode; color: 'emerald'|'amber'|'red'|'blue'
}) {
  const c = { emerald:{ val:'text-emerald-400', bg:'bg-emerald-500/10 text-emerald-400' }, amber:{ val:'text-amber-400', bg:'bg-amber-500/10 text-amber-400' }, red:{ val:'text-red-400', bg:'bg-red-500/10 text-red-400' }, blue:{ val:'text-brand-400', bg:'bg-brand-500-10 text-brand-400' } }[color]
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <div className={clsx('stat-icon', c.bg)}>{icon}</div>
      </div>
      <div className={clsx('stat-value text-xl', c.val)}>{value}</div>
      <div className="text-[11px] text-slate-600 mt-1">{sub}</div>
    </div>
  )
}

function OrdensSection({ ordens }: { ordens: OrdemServico[] }) {
  return (
    <>
      <div className="hide-mobile table-wrapper">
        <table className="table">
          <thead><tr><th>OS</th><th>Cliente</th><th>Placa</th><th>Venc.</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {ordens.map(os => {
              const colors = getStatusColor(os.status_pagamento)
              const nome = (os as any).clientes?.nome || os.descricao_avulsa || '—'
              return (
                <tr key={os.id}>
                  <td>
                    <Link href={`/dashboard/ordens/${os.id}`}
                      className="font-mono text-brand-400 hover:text-brand-300 text-xs font-bold flex items-center gap-1">
                      #{String(os.numero).padStart(4,'0')}
                      {os.avulsa && <Zap size={9} className="text-amber-400"/>}
                    </Link>
                  </td>
                  <td className="max-w-[130px] truncate">{nome}</td>
                  <td className="font-mono text-xs text-slate-500">{(os as any).caminhoes?.placa || '—'}</td>
                  <td className="text-xs text-slate-500">{os.data_vencimento ? formatDate(os.data_vencimento) : '—'}</td>
                  <td className="font-semibold">{formatCurrency(os.valor_total)}</td>
                  <td><span className={clsx('status-badge', colors.bg, colors.text, colors.border)}>{getStatusLabel(os.status_pagamento)}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="show-mobile space-y-2">
        {ordens.map(os => {
          const colors = getStatusColor(os.status_pagamento)
          const nome = (os as any).clientes?.nome || os.descricao_avulsa || '—'
          return (
            <Link key={os.id} href={`/dashboard/ordens/${os.id}`}
              className="flex items-center justify-between py-2 border-b border-white last:border-0 gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-brand-400 font-bold">#{String(os.numero).padStart(4,'0')}</span>
                  <span className={clsx('status-badge', colors.bg, colors.text, colors.border)}>{getStatusLabel(os.status_pagamento)}</span>
                </div>
                <div className="text-sm text-slate-300 mt-0.5 truncate max-w-[180px]">{nome}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-slate-100">{formatCurrency(os.valor_total)}</div>
                {os.data_vencimento && <div className="text-[10px] text-red-400 mt-0.5">Venc: {formatDate(os.data_vencimento)}</div>}
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}

function EmptyPeriod({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-slate-600 text-sm">
      <Calendar size={20} className="mx-auto mb-1.5 opacity-20"/>
      {label}
    </div>
  )
}
