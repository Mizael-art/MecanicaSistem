'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/supabase'
import { OrdemServico, OrdemItem, Cliente, Caminhao, ItemServico } from '@/types'
import {
  ArrowLeft, Printer, Package, Wrench,
  CheckCircle, Clock, AlertCircle, X,
  CreditCard, Banknote, Smartphone, Trash2,
  Edit, Plus, Save, DollarSign, Truck
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

// ── Modal: Registrar Pagamento ───────────────────────────────
function PagamentoModal({ os, onClose, onSaved }: { os: any; onClose: () => void; onSaved: () => void }) {
  const [forma, setForma]   = useState('dinheiro')
  const [saving, setSaving] = useState(false)
  const formas = [
    { key: 'dinheiro',       label: 'Dinheiro', icon: <Banknote size={15}/> },
    { key: 'pix',            label: 'Pix',      icon: <Smartphone size={15}/> },
    { key: 'cartao_debito',  label: 'Débito',   icon: <CreditCard size={15}/> },
    { key: 'cartao_credito', label: 'Crédito',  icon: <CreditCard size={15}/> },
    { key: 'transferencia',  label: 'TED/DOC',  icon: <Banknote size={15}/> },
    { key: 'boleto',         label: 'Boleto',   icon: <Banknote size={15}/> },
  ]
  const confirmar = async () => {
    setSaving(true)
    try {
      await supabase.from('ordens_servico').update({
        status_pagamento: 'pago',
        data_pagamento: new Date().toISOString().split('T')[0]
      }).eq('id', os.id)
      const { data: sessoes } = await supabase.from('caixa_sessoes').select('id').eq('status', 'aberto').limit(1)
      if (sessoes?.[0]) {
        await supabase.from('movimentacoes_caixa').insert({
          sessao_id: sessoes[0].id, tipo: 'entrada', valor: os.valor_total,
          descricao: `OS #${String(os.numero).padStart(4,'0')} — ${(os as any).clientes?.nome || os.descricao_avulsa || 'Sem cliente'}`,
          forma_pagamento: forma,
        })
      }
      toast.success('OS marcada como paga!')
      onSaved(); onClose()
    } catch (e: any) { toast.error('Erro: ' + e.message) }
    setSaving(false)
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-sm">
        <div className="modal-header">
          <h2 className="font-bold text-white">Registrar Pagamento</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16}/></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="section-box flex items-center justify-between">
            <span className="text-slate-400 text-sm">Valor da OS</span>
            <span className="text-xl font-bold text-white">{formatCurrency(os.valor_total)}</span>
          </div>
          <div>
            <label className="label">Forma de Pagamento</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {formas.map(f => (
                <button key={f.key} onClick={() => setForma(f.key)}
                  className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                    forma === f.key ? 'bg-brand-600 text-white border-brand-500' : 'bg-surface-600 text-slate-400 border-white hover:text-white')}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={confirmar} disabled={saving} className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-500">
            {saving ? 'Salvando...' : <><CheckCircle size={15}/> Confirmar Pago</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Confirmar Exclusão ────────────────────────────────
function ConfirmDeleteModal({ os, onClose, onDeleted }: { os: any; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const confirmar = async () => {
    setDeleting(true)
    const { error } = await supabase.from('ordens_servico').delete().eq('id', os.id)
    if (error) { toast.error('Erro ao excluir: ' + error.message); setDeleting(false) }
    else { toast.success(`OS #${String(os.numero).padStart(4,'0')} excluída`); onDeleted() }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-sm">
        <div className="modal-header">
          <h2 className="font-bold text-white flex items-center gap-2"><Trash2 size={16} className="text-red-400"/> Excluir OS</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16}/></button>
        </div>
        <div className="modal-body">
          <p className="text-slate-300 text-sm">Tem certeza que deseja excluir a <span className="font-bold text-white">OS #{String(os.numero).padStart(4,'0')}</span>?</p>
          <p className="text-slate-500 text-xs mt-2">Todos os itens vinculados serão removidos. Esta ação não pode ser desfeita.</p>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={confirmar} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors">
            {deleting ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> Excluindo...</> : <><Trash2 size={14}/> Sim, excluir</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Editar OS completa ────────────────────────────────
type ItemEditForm = { id?: string; descricao: string; categoria: 'peca'|'servico'; quantidade: number; preco_unitario: number }

function EditOSModal({ os, itensAtuais, onClose, onSaved }: {
  os: OrdemServico; itensAtuais: OrdemItem[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving]     = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [caminhoes, setCaminhoes] = useState<Caminhao[]>([])
  const [catalogo, setCatalogo] = useState<ItemServico[]>([])
  const [form, setForm] = useState({
    cliente_id:      os.cliente_id      || '',
    caminhao_id:     os.caminhao_id     || '',
    placa_manual:    '',
    descricao:       os.descricao_avulsa || '',
    data_abertura:   os.data_abertura,
    data_vencimento: os.data_vencimento  || '',
    data_pagamento:  os.data_pagamento   || '',
    observacoes:     (() => {
      if (!os.observacoes) return ''
      return os.observacoes.replace(/\nPlaca:.*|Placa:.*\n?/gi, '').trim()
    })(),
    status_pagamento: os.status_pagamento,
    valor_manual:    os.valor_manual ? String(os.valor_manual) : '',
  })
  const [itens, setItens] = useState<ItemEditForm[]>(
    itensAtuais.map(i => ({ id: i.id, descricao: i.descricao, categoria: i.categoria, quantidade: i.quantidade, preco_unitario: i.preco_unitario }))
  )
  const [showCatalog, setShowCatalog] = useState(false)
  const [catSearch, setCatSearch]     = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('itens_servicos').select('*').eq('ativo', true).order('nome'),
    ]).then(([c, it]) => { setClientes(c.data || []); setCatalogo(it.data || []) })
  }, [])

  useEffect(() => {
    if (!form.cliente_id) { setCaminhoes([]); return }
    supabase.from('caminhoes').select('*').eq('cliente_id', form.cliente_id).order('placa')
      .then(({ data }) => setCaminhoes(data || []))
  }, [form.cliente_id])

  const setF = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  const addFromCatalog = (item: ItemServico) => {
    const idx = itens.findIndex(i => !i.id && i.descricao === item.nome)
    if (idx >= 0) { setItens(p => p.map((it, i) => i === idx ? { ...it, quantidade: it.quantidade + 1 } : it)); return }
    setItens(p => [...p, { descricao: item.nome, categoria: item.categoria, quantidade: 1, preco_unitario: item.preco_padrao }])
    setShowCatalog(false)
  }

  const updateItem = (idx: number, field: string, value: string | number) =>
    setItens(p => p.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  const removeItem = (idx: number) => setItens(p => p.filter((_, i) => i !== idx))

  const total = itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.preco_unitario), 0)
    || (form.valor_manual ? parseFloat(form.valor_manual) : 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Atualizar dados da OS
      const payload: any = {
        cliente_id:       form.cliente_id  || null,
        caminhao_id:      form.caminhao_id || null,
        descricao_avulsa: form.descricao.trim() || null,
        valor_manual:     form.valor_manual ? parseFloat(form.valor_manual) : null,
        data_abertura:    form.data_abertura,
        data_vencimento:  form.data_vencimento  || null,
        data_pagamento:   form.data_pagamento   || null,
        observacoes:      form.observacoes || null,
        status_pagamento: form.status_pagamento,
        avulsa:           !form.cliente_id || !!form.placa_manual,
      }
      if (itens.length > 0 && total > 0) payload.valor_total = total

      const { error: osErr } = await supabase.from('ordens_servico').update(payload).eq('id', os.id)
      if (osErr) throw new Error(osErr.message)

      // 2. Itens: deletar os que foram removidos, inserir os novos, atualizar os existentes
      const idsOriginais = itensAtuais.map(i => i.id)
      const idsRestantes = itens.filter(i => i.id).map(i => i.id!)
      const idsRemover   = idsOriginais.filter(id => !idsRestantes.includes(id))

      if (idsRemover.length > 0) {
        await supabase.from('ordem_itens').delete().in('id', idsRemover)
      }

      for (const item of itens) {
        const itemPayload = {
          ordem_id: os.id, descricao: item.descricao,
          categoria: item.categoria,
          quantidade: Number(item.quantidade),
          preco_unitario: Number(item.preco_unitario),
        }
        if (item.id) {
          await supabase.from('ordem_itens').update(itemPayload).eq('id', item.id)
        } else {
          await supabase.from('ordem_itens').insert({ ...itemPayload, item_id: null })
        }
      }

      toast.success('OS atualizada com sucesso!')
      onSaved(); onClose()
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    }
    setSaving(false)
  }

  const catFiltrado = catalogo.filter(i =>
    !catSearch || i.nome.toLowerCase().includes(catSearch.toLowerCase()) || i.codigo_interno?.includes(catSearch)
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl w-full" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header sticky top-0 bg-surface-800 z-10">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Edit size={16} className="text-brand-400"/> Editar OS #{String(os.numero).padStart(4,'0')}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16}/></button>
        </div>

        <div className="modal-body space-y-5">

          {/* Identificação */}
          <div>
            <div className="section-title">Identificação</div>
            <div className="space-y-3">
              <div>
                <label className="label">Descrição do Serviço</label>
                <input className="input-field" placeholder="Ex: Revisão geral, troca de óleo..."
                  value={form.descricao} onChange={e => setF('descricao', e.target.value)}/>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Cliente <span className="text-slate-600 font-normal normal-case">(opcional)</span></label>
                  <select className="input-field" value={form.cliente_id}
                    onChange={e => setF('cliente_id', e.target.value)}>
                    <option value="">— Sem cliente —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Veículo <span className="text-slate-600 font-normal normal-case">(opcional)</span></label>
                  {form.cliente_id && caminhoes.length > 0 ? (
                    <select className="input-field" value={form.caminhao_id}
                      onChange={e => setF('caminhao_id', e.target.value)}>
                      <option value="">— Sem veículo —</option>
                      {caminhoes.map(c => <option key={c.id} value={c.id}>{c.placa} — {c.marca} {c.modelo}</option>)}
                    </select>
                  ) : (
                    <div className="relative">
                      <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                      <input className="input-field pl-9 font-mono uppercase tracking-widest"
                        placeholder="ABC-1234 ou vazio" maxLength={10}
                        value={form.placa_manual}
                        onChange={e => setF('placa_manual', e.target.value.toUpperCase())}/>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Datas e status */}
          <div>
            <div className="section-title">Datas & Status</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label">Abertura</label>
                <input type="date" className="input-field" value={form.data_abertura}
                  onChange={e => setF('data_abertura', e.target.value)}/>
              </div>
              <div>
                <label className="label">Vencimento</label>
                <input type="date" className="input-field" value={form.data_vencimento}
                  onChange={e => setF('data_vencimento', e.target.value)}/>
              </div>
              <div>
                <label className="label">Pago em</label>
                <input type="date" className="input-field" value={form.data_pagamento}
                  onChange={e => setF('data_pagamento', e.target.value)}/>
              </div>
              <div>
                <label className="label">Status Pgto</label>
                <select className="input-field" value={form.status_pagamento}
                  onChange={e => setF('status_pagamento', e.target.value)}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="atrasado">Atrasado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Valor fixo e observações */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Valor Fixo (R$) <span className="text-slate-600 font-normal normal-case">(se não usar itens)</span></label>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input type="number" min="0" step="0.01" className="input-field pl-8" placeholder="0,00"
                  value={form.valor_manual} onChange={e => setF('valor_manual', e.target.value)}/>
              </div>
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input-field resize-none" rows={2} placeholder="Detalhes adicionais..."
                value={form.observacoes} onChange={e => setF('observacoes', e.target.value)}/>
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="section-title mb-0">Itens ({itens.length})</div>
              <div className="flex gap-2">
                <button onClick={() => setShowCatalog(v => !v)}
                  className="btn-secondary text-xs py-1.5 px-3">
                  <Package size={12}/> Catálogo
                </button>
                <button onClick={() => setItens(p => [...p, { descricao: '', categoria: 'servico', quantidade: 1, preco_unitario: 0 }])}
                  className="btn-secondary text-xs py-1.5 px-3">
                  <Plus size={12}/> Linha Manual
                </button>
              </div>
            </div>

            {/* Mini catálogo */}
            {showCatalog && (
              <div className="mb-3 bg-surface-800 rounded-xl border border-white overflow-hidden">
                <div className="p-3 border-b border-white">
                  <input className="input-field text-sm" placeholder="Buscar peça ou serviço..."
                    value={catSearch} onChange={e => setCatSearch(e.target.value)} autoFocus/>
                </div>
                <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
                  {catFiltrado.slice(0, 20).map(item => (
                    <button key={item.id} onClick={() => addFromCatalog(item)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-600 transition-colors flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.categoria === 'peca'
                          ? <Package size={11} className="text-brand-400 flex-shrink-0"/>
                          : <Wrench size={11} className="text-purple-400 flex-shrink-0"/>}
                        <span className="text-sm text-slate-200 truncate">{item.nome}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-400 flex-shrink-0">{formatCurrency(item.preco_padrao)}</span>
                    </button>
                  ))}
                  {catFiltrado.length === 0 && <div className="text-center py-4 text-slate-600 text-xs">Nenhum item encontrado</div>}
                </div>
              </div>
            )}

            {itens.length === 0 ? (
              <div className="text-center py-6 text-slate-600 text-sm border-2 border-dashed border-white rounded-lg">
                Nenhum item — use o catálogo ou adicione uma linha manual
              </div>
            ) : (
              <div className="space-y-2">
                {itens.map((item, idx) => (
                  <div key={idx} className="section-box">
                    <div className="hidden sm:grid grid-cols-[1fr_90px_80px_90px_70px_28px] gap-2 items-center">
                      <input className="input-field text-sm py-1.5" placeholder="Descrição"
                        value={item.descricao} onChange={e => updateItem(idx, 'descricao', e.target.value)}/>
                      <select className="input-field text-sm py-1.5" value={item.categoria}
                        onChange={e => updateItem(idx, 'categoria', e.target.value)}>
                        <option value="servico">Serviço</option>
                        <option value="peca">Peça</option>
                      </select>
                      <input type="number" min="0.01" step="0.01" className="input-field text-sm py-1.5 text-center"
                        placeholder="Qtd" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', e.target.value)}/>
                      <input type="number" min="0" step="0.01" className="input-field text-sm py-1.5"
                        placeholder="R$ Unit" value={item.preco_unitario} onChange={e => updateItem(idx, 'preco_unitario', e.target.value)}/>
                      <div className="font-mono text-sm text-slate-200 text-right">
                        {formatCurrency(Number(item.quantidade) * Number(item.preco_unitario))}
                      </div>
                      <button onClick={() => removeItem(idx)} className="text-slate-600 hover:text-red-400 p-1">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                    {/* Mobile */}
                    <div className="sm:hidden space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Item {idx+1}</span>
                        <button onClick={() => removeItem(idx)} className="text-slate-600 hover:text-red-400 p-1"><X size={14}/></button>
                      </div>
                      <input className="input-field" placeholder="Descrição"
                        value={item.descricao} onChange={e => updateItem(idx, 'descricao', e.target.value)}/>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="label">Tipo</div>
                          <select className="input-field text-sm" value={item.categoria}
                            onChange={e => updateItem(idx, 'categoria', e.target.value)}>
                            <option value="servico">Serviço</option>
                            <option value="peca">Peça</option>
                          </select>
                        </div>
                        <div>
                          <div className="label">Qtd</div>
                          <input type="number" className="input-field text-center" value={item.quantidade}
                            onChange={e => updateItem(idx, 'quantidade', e.target.value)}/>
                        </div>
                        <div>
                          <div className="label">Preço</div>
                          <input type="number" className="input-field" value={item.preco_unitario}
                            onChange={e => updateItem(idx, 'preco_unitario', e.target.value)}/>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-1">
                  <span className="text-sm text-slate-400 mr-3">Total:</span>
                  <span className="font-bold text-white">{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer sticky bottom-0 bg-surface-800">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> Salvando...</> : <><Save size={15}/> Salvar Alterações</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function OSDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [os, setOs]         = useState<OrdemServico | null>(null)
  const [itens, setItens]   = useState<OrdemItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showPagamento, setShowPagamento] = useState(false)
  const [showDelete, setShowDelete]       = useState(false)
  const [showEdit, setShowEdit]           = useState(false)

  const fetchData = async () => {
    const [osRes, itensRes] = await Promise.all([
      supabase.from('ordens_servico').select('*, clientes(*), caminhoes(*)').eq('id', params.id).single(),
      supabase.from('ordem_itens').select('*').eq('ordem_id', params.id).order('created_at'),
    ])
    setOs(osRes.data)
    setItens(itensRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [params.id])

  const updateStatus = async (status: string) => {
    if (status === 'pago') { setShowPagamento(true); return }
    setUpdating(true)
    const { error } = await supabase.from('ordens_servico').update({ status_pagamento: status }).eq('id', params.id)
    if (error) toast.error('Erro: ' + error.message)
    else { toast.success('Status atualizado!'); fetchData() }
    setUpdating(false)
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-surface-600 rounded-lg"/>
      <div className="h-40 bg-surface-700 rounded-xl"/>
    </div>
  )
  if (!os) return <div className="card p-12 text-center text-slate-500">OS não encontrada</div>

  const colors   = getStatusColor(os.status_pagamento)
  const cliente  = (os as any).clientes
  const caminhao = (os as any).caminhoes
  const pecas    = itens.filter(i => i.categoria === 'peca')
  const servicos = itens.filter(i => i.categoria === 'servico')
  const placaManual = !caminhao && os.observacoes?.match(/Placa:\s*([A-Z0-9-]+)/i)?.[1]

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/ordens" className="btn-ghost p-2 flex-shrink-0"><ArrowLeft size={16}/></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">OS #{String(os.numero).padStart(4,'0')}</h1>
              <span className={clsx('status-badge', colors.bg, colors.text, colors.border)}>
                {getStatusLabel(os.status_pagamento)}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">Aberta em {formatDate(os.data_abertura)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowEdit(true)}
            className="btn-secondary text-sm">
            <Edit size={14}/> <span className="hidden sm:inline">Editar</span>
          </button>
          <Link href={`/prints/${os.id}`} target="_blank" className="btn-secondary text-sm">
            <Printer size={14}/> <span className="hidden sm:inline">Imprimir</span>
          </Link>
          <button onClick={() => setShowDelete(true)}
            className="btn-ghost p-2 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={15}/>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-5">

          {/* Informações */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="section-title mb-0">Informações</div>
              <button onClick={() => setShowEdit(true)}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                <Edit size={11}/> Editar
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              {os.descricao_avulsa && (
                <div className="sm:col-span-2">
                  <div className="label">Descrição</div>
                  <div className="text-slate-200 font-medium">{os.descricao_avulsa}</div>
                </div>
              )}
              <div>
                <div className="label">Cliente</div>
                {cliente ? (
                  <>
                    <div className="text-slate-200 font-medium">{cliente.nome}</div>
                    {cliente.telefone && <div className="text-xs text-slate-500 mt-0.5">{cliente.telefone}</div>}
                  </>
                ) : <div className="text-slate-500 italic text-sm">Não vinculado</div>}
              </div>
              <div>
                <div className="label">Veículo</div>
                {caminhao ? (
                  <>
                    <div className="font-mono font-bold text-white tracking-widest">{caminhao.placa}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{caminhao.marca} {caminhao.modelo}</div>
                  </>
                ) : placaManual ? (
                  <div className="font-mono font-bold text-white tracking-widest">{placaManual}</div>
                ) : (
                  <div className="text-slate-500 italic text-sm">Não informado</div>
                )}
              </div>
              {os.data_vencimento && (
                <div>
                  <div className="label">Vencimento</div>
                  <div className={clsx('text-sm font-medium', os.status_pagamento === 'atrasado' ? 'text-red-400' : 'text-slate-300')}>
                    {formatDate(os.data_vencimento)}
                  </div>
                </div>
              )}
              {os.data_pagamento && (
                <div>
                  <div className="label">Pago em</div>
                  <div className="text-emerald-400 font-medium">{formatDate(os.data_pagamento)}</div>
                </div>
              )}
            </div>
            {os.observacoes && (() => {
              const obsLimpa = os.observacoes.replace(/\nPlaca:.*|Placa:.*\n?/gi, '').trim()
              return obsLimpa ? (
                <div className="mt-4 p-3 bg-surface-800 rounded-lg border border-white text-sm text-slate-400">{obsLimpa}</div>
              ) : null
            })()}
          </div>

          {/* Itens */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="section-title mb-0">Itens ({itens.length})</div>
              <button onClick={() => setShowEdit(true)}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                <Edit size={11}/> Editar itens
              </button>
            </div>

            {os.valor_manual && itens.length === 0 && (
              <div className="section-box flex items-center justify-between mb-4">
                <span className="text-slate-400 text-sm font-medium">Valor fixo do serviço</span>
                <span className="font-bold text-white text-lg">{formatCurrency(os.valor_manual)}</span>
              </div>
            )}

            {itens.length === 0 && !os.valor_manual ? (
              <div className="text-center py-8 text-slate-600 text-sm border-2 border-dashed border-white rounded-lg">
                Nenhum item registrado —{' '}
                <button onClick={() => setShowEdit(true)} className="text-brand-400 hover:underline">adicionar itens</button>
              </div>
            ) : (
              <>
                {servicos.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      <Wrench size={11} className="text-purple-400"/> Serviços / Mão de obra
                    </div>
                    <div className="space-y-1">
                      {servicos.map(item => (
                        <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-surface-800/60 rounded-lg gap-2">
                          <div className="min-w-0">
                            <div className="text-sm text-slate-200">{item.descricao}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{item.quantidade} × {formatCurrency(item.preco_unitario)}</div>
                          </div>
                          <span className="font-mono text-sm font-semibold text-slate-200 flex-shrink-0">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pecas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      <Package size={11} className="text-brand-400"/> Peças / Materiais
                    </div>
                    <div className="space-y-1">
                      {pecas.map(item => (
                        <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-surface-800/60 rounded-lg gap-2">
                          <div className="min-w-0">
                            <div className="text-sm text-slate-200">{item.descricao}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{item.quantidade} × {formatCurrency(item.preco_unitario)}</div>
                          </div>
                          <span className="font-mono text-sm font-semibold text-slate-200 flex-shrink-0">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-4 pt-4 border-t border-white flex justify-between items-center">
              <span className="font-semibold text-slate-400">Total</span>
              <span className="text-2xl font-bold text-white">{formatCurrency(os.valor_total)}</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="section-title">Pagamento</div>
            {os.status_pagamento !== 'pago' && (
              <button onClick={() => updateStatus('pago')} disabled={updating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-colors">
                <CheckCircle size={15}/> Marcar como Pago
              </button>
            )}
            {os.status_pagamento === 'pago' && (
              <div className="flex items-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <CheckCircle size={15}/> Pago em {formatDate(os.data_pagamento || '')}
              </div>
            )}
            {os.status_pagamento !== 'pendente' && os.status_pagamento !== 'pago' && (
              <button onClick={() => updateStatus('pendente')} disabled={updating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 transition-colors">
                <Clock size={15}/> Reverter para Pendente
              </button>
            )}
            {os.status_pagamento === 'pendente' && os.data_vencimento && (
              <button onClick={() => updateStatus('atrasado')} disabled={updating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors">
                <AlertCircle size={15}/> Marcar Atrasado
              </button>
            )}
          </div>

          <div className="card p-5 space-y-2">
            <div className="section-title">Composição</div>
            {servicos.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Serviços ({servicos.length})</span>
                <span className="text-slate-300 font-mono">{formatCurrency(servicos.reduce((s,i) => s+i.subtotal,0))}</span>
              </div>
            )}
            {pecas.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Peças ({pecas.length})</span>
                <span className="text-slate-300 font-mono">{formatCurrency(pecas.reduce((s,i) => s+i.subtotal,0))}</span>
              </div>
            )}
            {os.valor_manual && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Valor fixo</span>
                <span className="text-slate-300 font-mono">{formatCurrency(os.valor_manual)}</span>
              </div>
            )}
            <div className="border-t border-white pt-2 flex justify-between font-bold">
              <span className="text-slate-300">Total</span>
              <span className="text-white">{formatCurrency(os.valor_total)}</span>
            </div>
          </div>

          <div className="card p-4 space-y-2">
            <button onClick={() => setShowEdit(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-brand-400 border border-brand-500-25 hover:bg-brand-500-10 transition-colors">
              <Edit size={14}/> Editar esta OS
            </button>
            <button onClick={() => setShowDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">
              <Trash2 size={14}/> Excluir esta OS
            </button>
          </div>
        </div>
      </div>

      {showPagamento && os && <PagamentoModal os={os} onClose={() => setShowPagamento(false)} onSaved={fetchData}/>}
      {showDelete    && os && <ConfirmDeleteModal os={os} onClose={() => setShowDelete(false)} onDeleted={() => router.push('/dashboard/ordens')}/>}
      {showEdit      && os && <EditOSModal os={os} itensAtuais={itens} onClose={() => setShowEdit(false)} onSaved={fetchData}/>}
    </div>
  )
}
