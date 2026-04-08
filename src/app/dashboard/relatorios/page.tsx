'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, formatCurrency } from '@/lib/supabase'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

export default function RelatoriosPage() {
  const [ano, setAno]         = useState(new Date().getFullYear())
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchDRE = useCallback(async () => {
    setLoading(true)
    const inicio = `${ano}-01-01`
    const fim    = `${ano}-12-31`

    const [ordensRes, despesasRes, vendasRes] = await Promise.all([
      supabase.from('ordens_servico').select('valor_total,status_pagamento,data_abertura').gte('data_abertura',inicio).lte('data_abertura',fim),
      supabase.from('despesas').select('valor,data,categoria').gte('data',inicio).lte('data',fim),
      supabase.from('vendas').select('valor_total,data_venda').gte('data_venda',inicio).lte('data_venda',fim).eq('status','finalizada'),
    ])

    const ordens  = ordensRes.data || []
    const desp    = despesasRes.data || []
    const vendas  = vendasRes.data || []

    const receitaOS    = ordens.filter(o=>o.status_pagamento==='pago').reduce((s:number,o:any)=>s+o.valor_total,0)
    const receitaVenda = vendas.reduce((s:number,v:any)=>s+v.valor_total,0)
    const receita      = receitaOS + receitaVenda

    const custoDesp = desp.reduce((s:number,d:any)=>s+d.valor,0)
    const lucro     = receita - custoDesp

    // Por mês
    const meses = Array.from({length:12},(_,i)=>{
      const mes   = String(i+1).padStart(2,'0')
      const recOS = ordens.filter((o:any)=>o.status_pagamento==='pago'&&o.data_abertura.startsWith(`${ano}-${mes}`)).reduce((s:number,o:any)=>s+o.valor_total,0)
      const recV  = vendas.filter((v:any)=>v.data_venda.startsWith(`${ano}-${mes}`)).reduce((s:number,v:any)=>s+v.valor_total,0)
      const despM = desp.filter((d:any)=>d.data.startsWith(`${ano}-${mes}`)).reduce((s:number,d:any)=>s+d.valor,0)
      return { mes:['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i], receita:recOS+recV, despesas:despM, lucro:recOS+recV-despM }
    })

    setData({ receita, receitaOS, receitaVenda, custoDesp, lucro, meses })
    setLoading(false)
  }, [ano])

  useEffect(() => { fetchDRE() }, [fetchDRE])

  const maxBar = data ? Math.max(...data.meses.map((m:any)=>Math.max(m.receita,m.despesas)),1) : 1

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><BarChart3 size={22} className="text-brand-400"/> DRE — Relatórios</h1>
          <p className="page-subtitle">Demonstrativo de Resultado do Exercício</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input-field w-auto text-sm" value={ano} onChange={e=>setAno(Number(e.target.value))}>
            {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchDRE} className="btn-ghost p-2"><RefreshCw size={15}/></button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="card h-24 animate-pulse"/>)}</div>
      ) : data && (
        <>
          {/* Resumo DRE */}
          <div className="card p-5 mb-5">
            <div className="section-title mb-4">DRE Anual — {ano}</div>
            <div className="space-y-2.5">
              {[
                { label:'(+) Receita Bruta Total',      value: data.receita,     color:'text-emerald-400', sub:`OS: ${formatCurrency(data.receitaOS)} + Vendas: ${formatCurrency(data.receitaVenda)}` },
                { label:'(-) Custos e Despesas Totais',  value: data.custoDesp,   color:'text-red-400',     sub:'Despesas operacionais' },
                { label:'(=) Resultado Líquido',         value: data.lucro,       color: data.lucro>=0?'text-brand-400':'text-red-400', bold: true },
              ].map(row=>(
                <div key={row.label} className={clsx('flex items-center justify-between py-2.5 border-b border-white last:border-0', row.bold&&'border-t border-white mt-1 pt-3')}>
                  <div>
                    <div className={clsx('font-semibold text-sm', row.bold?'text-slate-100 text-base':'text-slate-400')}>{row.label}</div>
                    {row.sub&&<div className="text-xs text-slate-600 mt-0.5">{row.sub}</div>}
                  </div>
                  <span className={clsx('font-bold font-mono', row.bold?'text-lg':''  ,row.color)}>{formatCurrency(row.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico mensal */}
          <div className="card p-5">
            <div className="section-title mb-4">Desempenho Mensal — {ano}</div>
            <div className="grid grid-cols-12 gap-1 items-end h-48">
              {data.meses.map((m:any)=>(
                <div key={m.mes} className="flex flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5 h-36">
                    <div className="w-3 rounded-sm bg-emerald-500/60 transition-all" style={{height:`${(m.receita/maxBar)*100}%`, minHeight: m.receita>0?'4px':'0'}} title={`Receita: ${formatCurrency(m.receita)}`}/>
                    <div className="w-3 rounded-sm bg-red-500/50 transition-all" style={{height:`${(m.despesas/maxBar)*100}%`, minHeight: m.despesas>0?'4px':'0'}} title={`Despesas: ${formatCurrency(m.despesas)}`}/>
                  </div>
                  <span className="text-[9px] text-slate-600">{m.mes}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-3 h-3 rounded-sm bg-emerald-500/60"/> Receita</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-3 h-3 rounded-sm bg-red-500/50"/> Despesas</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
