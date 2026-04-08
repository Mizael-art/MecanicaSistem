'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, formatCurrency, formatDate, sincronizarAtrasados } from '@/lib/supabase'
import { DollarSign, TrendingUp, TrendingDown, Plus, ChevronRight, Check, X } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

type Tab = 'resumo' | 'receber' | 'pagar'

export default function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>('resumo')
  const [cr, setCR]   = useState<any[]>([])
  const [cp, setCP]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModalR, setShowModalR] = useState(false)
  const [showModalP, setShowModalP] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    // BUG-04 FIX: sync overdue statuses before showing
    await sincronizarAtrasados()
    const [r, p] = await Promise.all([
      supabase.from('contas_receber').select('*, clientes(nome), parcelas_receber(*)').order('created_at', { ascending: false }),
      supabase.from('contas_pagar').select('*, parcelas_pagar(*)').order('created_at', { ascending: false }),
    ])
    setCR(r.data as any || [])
    setCP(p.data as any || [])
    setLoading(false)
  }, [])
  useEffect(() => { fetchAll() }, [fetchAll])

  const totAR = cr.filter(c => c.status !== 'cancelado').reduce((s: number, c: any) => s + c.valor_total, 0)
  const totAP = cp.filter(c => c.status !== 'cancelado').reduce((s: number, c: any) => s + c.valor_total, 0)
  const saldo = totAR - totAP

  const statusC = (s: string) => ({
    pendente:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
    pago:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    atrasado:  'bg-red-500/15 text-red-400 border-red-500/30',
    cancelado: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
  })[s] || 'bg-slate-500/15 text-slate-500 border-slate-500/30'

  const quitarParcela = async (parcelaId: string, contaId: string, tabParcela: 'parcelas_receber' | 'parcelas_pagar', tabConta: 'contas_receber' | 'contas_pagar') => {
    await supabase.from(tabParcela).update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', parcelaId)

    // BUG-08 FIX: check if all parcelas are now paid — update conta status
    const { data: todasParcelas } = await supabase.from(tabParcela).select('status').eq(tabParcela === 'parcelas_receber' ? 'conta_id' : 'conta_id', contaId)
    const todasPagas = todasParcelas?.every((p: any) => p.status === 'pago')
    if (todasPagas) {
      await supabase.from(tabConta).update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', contaId)
    }

    toast.success('Parcela quitada!'); fetchAll()
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><DollarSign size={22} className="text-brand-400"/> Financeiro</h1>
          <p className="page-subtitle">Contas a pagar e receber</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModalR(true)} className="btn-secondary text-sm"><Plus size={14}/> A Receber</button>
          <button onClick={() => setShowModalP(true)} className="btn-primary text-sm"><Plus size={14}/> A Pagar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="stat-card"><div className="flex items-center justify-between"><span className="stat-label">A Receber</span><div className="stat-icon bg-emerald-500/10 text-emerald-400"><TrendingUp size={14}/></div></div><div className="stat-value text-xl text-emerald-400">{formatCurrency(totAR)}</div></div>
        <div className="stat-card"><div className="flex items-center justify-between"><span className="stat-label">A Pagar</span><div className="stat-icon bg-red-500/10 text-red-400"><TrendingDown size={14}/></div></div><div className="stat-value text-xl text-red-400">{formatCurrency(totAP)}</div></div>
        <div className="stat-card col-span-2 lg:col-span-1"><div className="flex items-center justify-between"><span className="stat-label">Saldo Projetado</span><div className={clsx('stat-icon', saldo >= 0 ? 'bg-brand-500-10 text-brand-400' : 'bg-red-500/10 text-red-400')}><DollarSign size={14}/></div></div><div className={clsx('stat-value text-xl', saldo >= 0 ? 'text-brand-400' : 'text-red-400')}>{formatCurrency(saldo)}</div></div>
      </div>

      <div className="flex gap-1 mb-5 bg-surface-800 p-1 rounded-xl w-fit">
        {(['resumo', 'receber', 'pagar'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={clsx('px-4 py-2 rounded-lg text-sm font-semibold transition-colors', tab === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white')}>
            {{ resumo: 'Resumo', receber: 'A Receber', pagar: 'A Pagar' }[t]}
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="card h-16 animate-pulse"/>)}</div> : (
        <>
          {tab === 'resumo' && (
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="card p-4"><div className="section-title mb-3">Próximos — Receber</div>{cr.filter(c => c.status === 'pendente').slice(0, 5).map((c: any) => <ContaRow key={c.id} c={c} statusC={statusC}/>)}{cr.filter(c => c.status === 'pendente').length === 0 && <EmptyMsg msg="Nenhum pendente"/>}</div>
              <div className="card p-4"><div className="section-title mb-3">Próximos — Pagar</div>{cp.filter(c => c.status === 'pendente').slice(0, 5).map((c: any) => <ContaRow key={c.id} c={c} statusC={statusC}/>)}{cp.filter(c => c.status === 'pendente').length === 0 && <EmptyMsg msg="Nenhum pendente"/>}</div>
            </div>
          )}
          {tab === 'receber' && (
            <div className="space-y-3">
              {cr.length === 0 ? <EmptyCard label="Nenhuma conta a receber" onAdd={() => setShowModalR(true)}/> : cr.map((c: any) => <ContaCard key={c.id} conta={c} tipo="receber" statusC={statusC} onQuitar={quitarParcela}/>)}
            </div>
          )}
          {tab === 'pagar' && (
            <div className="space-y-3">
              {cp.length === 0 ? <EmptyCard label="Nenhuma conta a pagar" onAdd={() => setShowModalP(true)}/> : cp.map((c: any) => <ContaCard key={c.id} conta={c} tipo="pagar" statusC={statusC} onQuitar={quitarParcela}/>)}
            </div>
          )}
        </>
      )}

      {showModalR && <ContaModal tipo="receber" onClose={() => setShowModalR(false)} onSave={() => { setShowModalR(false); fetchAll() }}/>}
      {showModalP && <ContaModal tipo="pagar"   onClose={() => setShowModalP(false)} onSave={() => { setShowModalP(false); fetchAll() }}/>}
    </div>
  )
}

function ContaRow({ c, statusC }: any) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white last:border-0 gap-2">
      <div className="min-w-0"><div className="text-sm font-semibold text-slate-200 truncate">{c.descricao}</div><div className="text-xs text-slate-500 mt-0.5">{c.clientes?.nome || c.fornecedor || '—'}</div></div>
      <div className="flex-shrink-0 text-right"><div className="font-bold text-sm text-slate-100">{formatCurrency(c.valor_total)}</div><span className={clsx('status-badge mt-0.5', statusC(c.status))}>{c.status}</span></div>
    </div>
  )
}

function ContaCard({ conta, tipo, statusC, onQuitar }: any) {
  const [exp, setExp] = useState(false)
  const parcelas = tipo === 'receber' ? conta.parcelas_receber : conta.parcelas_pagar
  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-200 truncate">{conta.descricao}</span>
            <span className={clsx('status-badge', statusC(conta.status))}>{conta.status}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{conta.clientes?.nome || conta.fornecedor || '—'} · {conta.parcelas}× · {formatDate(conta.data_emissao)}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-bold text-lg text-white">{formatCurrency(conta.valor_total)}</span>
          <button onClick={() => setExp(e => !e)} className="btn-ghost p-2">
            <ChevronRight size={14} className={clsx('transition-transform', exp && 'rotate-90')}/>
          </button>
        </div>
      </div>
      {exp && parcelas?.length > 0 && (
        <div className="border-t border-white bg-surface-800/40 p-3 space-y-1">
          {parcelas.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-700 gap-3">
              <span className="text-sm text-slate-400">Parc. {p.numero}/{conta.parcelas} · {formatDate(p.data_vencimento)}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-200">{formatCurrency(p.valor)}</span>
                <span className={clsx('status-badge', statusC(p.status))}>{p.status}</span>
                {p.status !== 'pago' && (
                  <button
                    onClick={() => onQuitar(p.id, conta.id, tipo === 'receber' ? 'parcelas_receber' : 'parcelas_pagar', tipo === 'receber' ? 'contas_receber' : 'contas_pagar')}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors">
                    <Check size={10}/> Quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyMsg({ msg }: any) { return <div className="py-6 text-center text-slate-600 text-sm">{msg}</div> }
function EmptyCard({ label, onAdd }: any) {
  return (
    <div className="card py-16 text-center space-y-3">
      <DollarSign size={36} className="mx-auto text-slate-700"/>
      <p className="text-slate-500">{label}</p>
      <button onClick={onAdd} className="btn-primary mx-auto w-fit"><Plus size={15}/> Adicionar</button>
    </div>
  )
}

function ContaModal({ tipo, onClose, onSave }: any) {
  const [f, setF] = useState({ descricao: '', valor_total: '', parcelas: '1', data_emissao: new Date().toISOString().split('T')[0], data_vencimento: '', fornecedor: '', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const label = tipo === 'receber' ? 'Receber' : 'Pagar'

  const save = async () => {
    if (!f.descricao || !f.valor_total) { toast.error('Preencha descrição e valor'); return }
    setSaving(true)
    const tabela  = tipo === 'receber' ? 'contas_receber' : 'contas_pagar'
    const tabelaP = tipo === 'receber' ? 'parcelas_receber' : 'parcelas_pagar'
    const numParcelas = parseInt(f.parcelas) || 1
    const valorTotal  = parseFloat(f.valor_total)

    const { data: conta, error } = await supabase.from(tabela).insert({
      descricao: f.descricao, valor_total: valorTotal, parcelas: numParcelas,
      data_emissao: f.data_emissao, observacoes: f.observacoes || null,
      ...(tipo === 'pagar' ? { fornecedor: f.fornecedor || null } : {})
    }).select().single()

    if (error || !conta) { toast.error('Erro: ' + error?.message); setSaving(false); return }

    // PROB-01 FIX: last parcela absorbs rounding difference
    const parcs = Array.from({ length: numParcelas }, (_, i) => {
      const v = new Date(f.data_vencimento || f.data_emissao)
      v.setMonth(v.getMonth() + i)
      const valorBase   = Math.round((valorTotal / numParcelas) * 100) / 100
      const somaAntes   = Math.round((valorTotal / numParcelas) * i * 100) / 100
      const valorFinal  = i === numParcelas - 1
        ? Math.round((valorTotal - somaAntes) * 100) / 100
        : valorBase
      return { conta_id: conta.id, numero: i + 1, valor: valorFinal, data_vencimento: v.toISOString().split('T')[0] }
    })

    await supabase.from(tabelaP).insert(parcs)
    toast.success(`Conta a ${label.toLowerCase()} criada!`); onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header"><h2 className="font-bold text-white">Nova Conta a {label}</h2><button onClick={onClose} className="btn-ghost p-1.5"><X size={16}/></button></div>
        <div className="modal-body space-y-3">
          <div><label className="label">Descrição *</label><input className="input-field" autoFocus value={f.descricao} onChange={e => setF(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Peças do motor OS #0042"/></div>
          {tipo === 'pagar' && <div><label className="label">Fornecedor</label><input className="input-field" value={f.fornecedor} onChange={e => setF(p => ({ ...p, fornecedor: e.target.value }))} placeholder="Nome do fornecedor"/></div>}
          <div className="form-grid-2">
            <div><label className="label">Valor Total *</label><input type="number" min="0" step="0.01" className="input-field" placeholder="0,00" value={f.valor_total} onChange={e => setF(p => ({ ...p, valor_total: e.target.value }))}/></div>
            <div><label className="label">Parcelas</label><select className="input-field" value={f.parcelas} onChange={e => setF(p => ({ ...p, parcelas: e.target.value }))}>{[1, 2, 3, 4, 5, 6, 10, 12].map(n => <option key={n} value={n}>{n}×</option>)}</select></div>
            <div><label className="label">Emissão</label><input type="date" className="input-field" value={f.data_emissao} onChange={e => setF(p => ({ ...p, data_emissao: e.target.value }))}/></div>
            <div><label className="label">1º Vencimento</label><input type="date" className="input-field" value={f.data_vencimento} onChange={e => setF(p => ({ ...p, data_vencimento: e.target.value }))}/></div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}
