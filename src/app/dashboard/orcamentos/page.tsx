'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, formatCurrency, formatDate } from '@/lib/supabase'
import { Orcamento } from '@/types'
import { FileText, Plus, Search, ChevronRight, CheckCircle, XCircle, ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string,string> = {
  rascunho:'bg-slate-500/15 text-slate-400 border-slate-500/30',
  enviado:'bg-brand-500-15 text-brand-400 border-brand-500-30',
  aprovado:'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  reprovado:'bg-red-500/15 text-red-400 border-red-500/30',
  convertido:'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

export default function OrcamentosPage() {
  const router = useRouter()
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    const { data } = await supabase.from('orcamentos').select('*, clientes(nome), caminhoes(placa)').order('created_at',{ascending:false})
    setOrcamentos(data || [])
    setLoading(false)
  }
  useEffect(() => { fetchAll() }, [])

  const filtered = orcamentos.filter(o => {
    const q = search.toLowerCase()
    return !q || String(o.numero).includes(q) || o.clientes?.nome?.toLowerCase().includes(q) || o.descricao?.toLowerCase().includes(q)
  })

  const converterEmOS = async (orc: any) => {
    if (!confirm('Converter este orçamento em OS?')) return
    const { data: itens } = await supabase.from('itens_orcamento').select('*').eq('orcamento_id', orc.id)
    const { data: os, error } = await supabase.from('ordens_servico').insert({
      cliente_id: orc.cliente_id || null, caminhao_id: orc.caminhao_id || null,
      avulsa: !orc.cliente_id, descricao_avulsa: orc.descricao || null,
      data_abertura: new Date().toISOString().split('T')[0], status_pagamento: 'pendente',
    }).select().single()
    if (error || !os) { toast.error('Erro ao converter'); return }
    if (itens && itens.length > 0) {
      await supabase.from('ordem_itens').insert(itens.map((i:any)=>({ ordem_id: os.id, item_id: i.item_id||null, descricao: i.descricao, categoria: i.categoria, quantidade: i.quantidade, preco_unitario: i.preco_unitario })))
    }
    await supabase.from('orcamentos').update({ status:'convertido', os_id: os.id }).eq('id', orc.id)
    toast.success('Orçamento convertido em OS!')
    router.push('/dashboard/ordens/' + os.id)
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><FileText size={22} className="text-brand-400"/> Orçamentos</h1>
          <p className="page-subtitle">{orcamentos.length} orçamentos</p>
        </div>
        <Link href="/dashboard/orcamentos/novo" className="btn-primary w-full sm:w-auto"><Plus size={16}/> Novo Orçamento</Link>
      </div>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
        <input className="input-field pl-9" placeholder="Buscar por nº, cliente ou descrição..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {loading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="card h-16 animate-pulse"/>)}</div> : filtered.length===0 ? (
        <div className="card empty-state py-16">
          <FileText size={36} className="empty-state-icon mx-auto"/>
          <p className="text-slate-500 mt-2">Nenhum orçamento encontrado</p>
          <Link href="/dashboard/orcamentos/novo" className="btn-primary mt-4 mx-auto w-fit"><Plus size={15}/> Criar primeiro</Link>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden hide-mobile">
            <table className="table">
              <thead><tr><th>Nº</th><th>Cliente</th><th>Descrição</th><th>Validade</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map(o=>(
                  <tr key={o.id}>
                    <td><span className="font-mono text-brand-400 font-bold text-xs">#{String(o.numero).padStart(4,'0')}</span></td>
                    <td className="text-slate-300">{o.clientes?.nome || '—'}</td>
                    <td className="text-slate-500 max-w-[180px] truncate text-xs">{o.descricao || '—'}</td>
                    <td className="text-slate-500 text-xs">{o.data_validade ? formatDate(o.data_validade) : '—'}</td>
                    <td className="font-bold text-slate-100">{formatCurrency(o.valor_total)}</td>
                    <td><span className={clsx('status-badge', STATUS_COLORS[o.status]||'')}>{o.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        {o.status!=='convertido'&&o.status!=='reprovado'&&(
                          <button onClick={()=>converterEmOS(o)} title="Converter em OS" className="btn-ghost p-1.5 text-purple-400 hover:text-purple-300"><ArrowRight size={13}/></button>
                        )}
                        <Link href={'/dashboard/orcamentos/'+o.id} className="btn-ghost p-1.5"><ChevronRight size={14} className="text-brand-400"/></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="show-mobile mobile-card-list">
            {filtered.map(o=>(
              <div key={o.id} className="mobile-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-brand-400 font-bold text-sm">#{String(o.numero).padStart(4,'0')}</span>
                      <span className={clsx('status-badge', STATUS_COLORS[o.status]||'')}>{o.status}</span>
                    </div>
                    <div className="text-sm text-slate-200 mt-1">{o.clientes?.nome || o.descricao || '—'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-white">{formatCurrency(o.valor_total)}</div>
                    <Link href={'/dashboard/orcamentos/'+o.id} className="text-xs text-brand-400 mt-1 block">Ver detalhes</Link>
                  </div>
                </div>
                {o.status!=='convertido'&&o.status!=='reprovado'&&(
                  <button onClick={()=>converterEmOS(o)} className="btn-secondary w-full mt-2 text-sm">
                    <ArrowRight size={13}/> Converter em OS
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
