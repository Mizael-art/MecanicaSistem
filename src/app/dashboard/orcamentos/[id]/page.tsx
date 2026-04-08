'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, formatCurrency, formatDate } from '@/lib/supabase'
import { ArrowLeft, FileText, Zap, ArrowRight, Check, X, Send, ThumbsDown, ThumbsUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const STATUS_COLORS: Record<string, string> = {
  rascunho:   'bg-slate-500/15 text-slate-400 border-slate-500/30',
  enviado:    'bg-brand-500-15 text-brand-400 border-brand-500-30',
  aprovado:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  reprovado:  'bg-red-500/15 text-red-400 border-red-500/30',
  convertido: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

// BUG-06 FIX: This page was missing entirely
export default function OrcamentoDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [orc, setOrc]         = useState<any>(null)
  const [itens, setItens]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)

  const fetchData = async () => {
    const [orcRes, itensRes] = await Promise.all([
      supabase.from('orcamentos').select('*, clientes(*), caminhoes(*)').eq('id', params.id).single(),
      supabase.from('itens_orcamento').select('*').eq('orcamento_id', params.id).order('created_at'),
    ])
    setOrc(orcRes.data)
    setItens(itensRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [params.id])

  const mudarStatus = async (status: string) => {
    const { error } = await supabase.from('orcamentos').update({ status }).eq('id', params.id)
    if (error) toast.error('Erro: ' + error.message)
    else { toast.success('Status atualizado!'); fetchData() }
  }

  const converterEmOS = async () => {
    if (!confirm('Converter este orçamento em Ordem de Serviço?')) return
    setConverting(true)
    try {
      const { data: os, error } = await supabase.from('ordens_servico').insert({
        cliente_id: orc.cliente_id || null,
        caminhao_id: orc.caminhao_id || null,
        avulsa: !orc.cliente_id,
        descricao_avulsa: orc.descricao || null,
        data_abertura: new Date().toISOString().split('T')[0],
        status_pagamento: 'pendente',
      }).select().single()

      if (error || !os) { toast.error('Erro ao converter'); setConverting(false); return }

      if (itens.length > 0) {
        await supabase.from('ordem_itens').insert(itens.map((i: any) => ({
          ordem_id: os.id, item_id: i.item_id || null,
          descricao: i.descricao, categoria: i.categoria,
          quantidade: i.quantidade, preco_unitario: i.preco_unitario,
        })))
      }

      await supabase.from('orcamentos').update({ status: 'convertido', os_id: os.id }).eq('id', params.id)
      toast.success('Convertido em OS com sucesso!')
      router.push('/dashboard/ordens/' + os.id)
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    }
    setConverting(false)
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-surface-600 rounded-lg"/>
      <div className="h-40 bg-surface-700 rounded-xl"/>
    </div>
  )
  if (!orc) return <div className="card p-12 text-center text-slate-500">Orçamento não encontrado</div>

  const pecas    = itens.filter(i => i.categoria === 'peca')
  const servicos = itens.filter(i => i.categoria === 'servico')
  const cliente  = orc.clientes
  const caminhao = orc.caminhoes
  const podeConverterStatus = orc.status !== 'convertido' && orc.status !== 'reprovado'

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orcamentos" className="btn-ghost p-2">
            <ArrowLeft size={16}/>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText size={20} className="text-brand-400"/>
                Orçamento #{String(orc.numero).padStart(4, '0')}
              </h1>
              <span className={clsx('status-badge', STATUS_COLORS[orc.status] || '')}>{orc.status}</span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">Emitido em {formatDate(orc.data_emissao)}</p>
          </div>
        </div>
        {podeConverterStatus && (
          <button onClick={converterEmOS} disabled={converting}
            className="btn-primary text-sm">
            {converting
              ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> Convertendo...</>
              : <><ArrowRight size={14}/> Converter em OS</>}
          </button>
        )}
        {orc.os_id && (
          <Link href={'/dashboard/ordens/' + orc.os_id} className="btn-secondary text-sm">
            <ArrowRight size={14}/> Ver OS Gerada
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Info */}
          <div className="card p-5">
            <div className="section-title">Informações</div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {orc.descricao && (
                <div className="sm:col-span-2">
                  <div className="label">Descrição</div>
                  <div className="text-slate-200">{orc.descricao}</div>
                </div>
              )}
              <div>
                <div className="label">Cliente</div>
                {cliente
                  ? <div className="text-slate-200 font-medium">{cliente.nome}</div>
                  : <div className="text-slate-500 italic text-sm">Não vinculado</div>}
              </div>
              <div>
                <div className="label">Caminhão</div>
                {caminhao
                  ? <div className="font-mono font-bold text-white">{caminhao.placa}</div>
                  : <div className="text-slate-500 italic text-sm">Não vinculado</div>}
              </div>
              {orc.data_validade && (
                <div>
                  <div className="label">Válido até</div>
                  <div className="text-slate-300">{formatDate(orc.data_validade)}</div>
                </div>
              )}
            </div>
            {orc.observacoes && (
              <div className="mt-4 p-3 bg-surface-800 rounded-lg border border-white text-sm text-slate-400">
                {orc.observacoes}
              </div>
            )}
          </div>

          {/* Itens */}
          <div className="card p-5">
            <div className="section-title">Itens ({itens.length})</div>
            {itens.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm border-2 border-dashed border-white rounded-lg">
                Nenhum item neste orçamento
              </div>
            ) : (
              <>
                {servicos.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      Serviços
                    </div>
                    <div className="space-y-1">
                      {servicos.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-surface-800/60 rounded-lg gap-2">
                          <div className="min-w-0">
                            <div className="text-sm text-slate-200">{item.descricao}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{item.quantidade} × {formatCurrency(item.preco_unitario)}</div>
                          </div>
                          <span className="font-mono text-sm font-semibold text-slate-200 flex-shrink-0">
                            {formatCurrency(item.quantidade * item.preco_unitario)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pecas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      Peças
                    </div>
                    <div className="space-y-1">
                      {pecas.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-surface-800/60 rounded-lg gap-2">
                          <div className="min-w-0">
                            <div className="text-sm text-slate-200">{item.descricao}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{item.quantidade} × {formatCurrency(item.preco_unitario)}</div>
                          </div>
                          <span className="font-mono text-sm font-semibold text-slate-200 flex-shrink-0">
                            {formatCurrency(item.quantidade * item.preco_unitario)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="mt-4 pt-4 border-t border-white flex justify-between items-center">
              <span className="font-semibold text-slate-400">Total do Orçamento</span>
              <span className="text-2xl font-bold text-white">{formatCurrency(orc.valor_total)}</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status workflow */}
          {podeConverterStatus && (
            <div className="card p-5 space-y-3">
              <div className="section-title">Atualizar Status</div>
              {orc.status === 'rascunho' && (
                <button onClick={() => mudarStatus('enviado')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-brand-500-10 hover:bg-brand-500-20 text-brand-400 border border-brand-500-25 transition-colors">
                  <Send size={14}/> Marcar como Enviado
                </button>
              )}
              {(orc.status === 'rascunho' || orc.status === 'enviado') && (
                <>
                  <button onClick={() => mudarStatus('aprovado')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-colors">
                    <ThumbsUp size={14}/> Aprovado pelo Cliente
                  </button>
                  <button onClick={() => mudarStatus('reprovado')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors">
                    <ThumbsDown size={14}/> Reprovado pelo Cliente
                  </button>
                </>
              )}
              {orc.status === 'aprovado' && (
                <button onClick={converterEmOS} disabled={converting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/25 transition-colors">
                  <ArrowRight size={14}/> Converter em OS
                </button>
              )}
            </div>
          )}
          {/* Totais */}
          <div className="card p-5 space-y-2">
            <div className="section-title">Composição</div>
            {servicos.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Serviços</span>
                <span className="text-slate-300 font-mono">{formatCurrency(servicos.reduce((s: number, i: any) => s + i.quantidade * i.preco_unitario, 0))}</span>
              </div>
            )}
            {pecas.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Peças</span>
                <span className="text-slate-300 font-mono">{formatCurrency(pecas.reduce((s: number, i: any) => s + i.quantidade * i.preco_unitario, 0))}</span>
              </div>
            )}
            <div className="border-t border-white pt-2 flex justify-between font-bold">
              <span className="text-slate-300">Total</span>
              <span className="text-white">{formatCurrency(orc.valor_total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
