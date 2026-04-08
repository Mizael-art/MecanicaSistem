'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, formatCurrency } from '@/lib/supabase'
import { Cliente, Caminhao, ItemServico, OrdemItemForm } from '@/types'
import {
  ArrowLeft, Plus, Trash2, Package, Wrench, Search,
  Save, Calculator, DollarSign, X, Check, Truck
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

export default function NovaOSPage() {
  const router = useRouter()
  const [saving, setSaving]             = useState(false)
  const [clientes, setClientes]         = useState<Cliente[]>([])
  const [caminhoes, setCaminhoes]       = useState<Caminhao[]>([])
  const [catalogAll, setCatalogAll]     = useState<ItemServico[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogTab, setCatalogTab]     = useState<'todos'|'servico'|'peca'>('todos')
  const [showCatalogMobile, setShowCatalogMobile] = useState(false)

  // ── Form ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    cliente_id:      '',
    caminhao_id:     '',
    placa_manual:    '',   // ← placa digitada livremente
    descricao:       '',
    data_abertura:   new Date().toISOString().split('T')[0],
    data_vencimento: '',
    observacoes:     '',
    status_pagamento: 'pendente' as const,
    valor_manual:    '',
  })
  const [itens, setItens] = useState<OrdemItemForm[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('itens_servicos').select('*').eq('ativo', true).order('nome'),
    ]).then(([c, items]) => {
      setClientes(c.data || [])
      setCatalogAll(items.data || [])
    })
  }, [])

  // Carregar caminhões quando cliente for selecionado
  useEffect(() => {
    if (!form.cliente_id) { setCaminhoes([]); return }
    supabase.from('caminhoes').select('*')
      .eq('cliente_id', form.cliente_id).order('placa')
      .then(({ data }) => setCaminhoes(data || []))
  }, [form.cliente_id])

  const catalogFiltered = catalogAll.filter(item => {
    const matchSearch = !catalogSearch ||
      item.nome.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      item.codigo_interno?.toLowerCase().includes(catalogSearch.toLowerCase())
    const matchTab = catalogTab === 'todos' || item.categoria === catalogTab
    return matchSearch && matchTab
  })

  const addFromCatalog = (catalogItem: ItemServico) => {
    const idx = itens.findIndex(i => i.item_id === catalogItem.id)
    if (idx >= 0) {
      setItens(prev => prev.map((item, i) =>
        i === idx ? { ...item, quantidade: item.quantidade + 1 } : item
      ))
      return
    }
    setItens(prev => [...prev, {
      item_id: catalogItem.id, descricao: catalogItem.nome,
      categoria: catalogItem.categoria, quantidade: 1,
      preco_unitario: catalogItem.preco_padrao
    }])
  }

  const addManual = () => {
    setItens(prev => [...prev, { descricao: '', categoria: 'servico', quantidade: 1, preco_unitario: 0 }])
  }

  const updateItem = (idx: number, field: keyof OrdemItemForm, value: string | number) =>
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))

  const removeItem = (idx: number) => setItens(prev => prev.filter((_, i) => i !== idx))

  const totalItens   = itens.reduce((s, i) => s + (Number(i.quantidade) * Number(i.preco_unitario)), 0)
  const valorManualN = parseFloat(form.valor_manual) || 0
  const totalDisplay = form.valor_manual && itens.length === 0 ? valorManualN : totalItens

  const handleSave = async () => {
    // Validação mínima: só precisa ter alguma informação
    const temInfo = form.descricao.trim() || form.cliente_id || form.placa_manual.trim() || itens.length > 0 || form.valor_manual
    if (!temInfo) {
      toast.error('Informe ao menos uma descrição, cliente, placa ou item')
      return
    }

    setSaving(true)

    // Determinar caminhao_id: usa selecionado ou null (placa manual fica em descricao_avulsa/observacoes)
    const payload: any = {
      cliente_id:       form.cliente_id  || null,
      caminhao_id:      form.caminhao_id || null,
      // Se tem placa manual e não tem caminhão vinculado, guarda na descricao_avulsa
      avulsa:           !form.cliente_id || !!form.placa_manual,
      descricao_avulsa: form.descricao.trim() || (form.placa_manual ? `Placa: ${form.placa_manual.toUpperCase()}` : null),
      valor_manual:     form.valor_manual ? valorManualN : null,
      data_abertura:    form.data_abertura,
      data_vencimento:  form.data_vencimento || null,
      observacoes:      [
        form.observacoes,
        form.placa_manual ? `Placa: ${form.placa_manual.toUpperCase()}` : ''
      ].filter(Boolean).join('\n') || null,
      status_pagamento: form.status_pagamento,
      ...(form.valor_manual && itens.length === 0 ? { valor_total: valorManualN } : {}),
    }

    const { data: os, error } = await supabase.from('ordens_servico').insert(payload).select().single()
    if (error || !os) { toast.error('Erro: ' + (error?.message || 'desconhecido')); setSaving(false); return }

    if (itens.length > 0) {
      const { error: itensError } = await supabase.from('ordem_itens').insert(
        itens.map(i => ({
          ordem_id: os.id, item_id: i.item_id || null,
          descricao: i.descricao, categoria: i.categoria,
          quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario),
        }))
      )
      if (itensError) toast.error('OS criada, mas erro nos itens: ' + itensError.message)
    }

    toast.success('OS criada com sucesso!')
    router.push(`/dashboard/ordens/${os.id}`)
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/ordens" className="btn-ghost p-2">
          <ArrowLeft size={16}/>
        </Link>
        <div>
          <h1 className="page-title">Nova Ordem de Serviço</h1>
          <p className="page-subtitle">Todos os campos são opcionais — preencha o que tiver</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-5">
        {/* Coluna esquerda: formulário */}
        <div className="space-y-5">

          {/* Dados principais */}
          <div className="card p-5 space-y-4">
            <div className="section-title">Identificação</div>

            {/* Descrição / serviço */}
            <div>
              <label className="label">Descrição do Serviço</label>
              <input className="input-field" placeholder="Ex: Revisão geral, troca de óleo, funilaria..."
                value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}/>
            </div>

            <div className="form-grid-2">
              {/* Cliente — opcional */}
              <div>
                <label className="label">Cliente <span className="text-slate-600 normal-case font-normal">(opcional)</span></label>
                <select className="input-field" value={form.cliente_id}
                  onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value, caminhao_id: '' }))}>
                  <option value="">— Sem cliente —</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Caminhão da frota OU placa manual */}
              <div>
                <label className="label">
                  Veículo <span className="text-slate-600 normal-case font-normal">(opcional)</span>
                </label>
                {form.cliente_id && caminhoes.length > 0 ? (
                  // Cliente selecionado com frota → dropdown dos caminhões cadastrados
                  <select className="input-field" value={form.caminhao_id}
                    onChange={e => setForm(p => ({ ...p, caminhao_id: e.target.value, placa_manual: '' }))}>
                    <option value="">— Sem veículo —</option>
                    {caminhoes.map(c => <option key={c.id} value={c.id}>{c.placa} — {c.marca} {c.modelo}</option>)}
                  </select>
                ) : (
                  // Sem cliente ou cliente sem frota → digitar placa livremente
                  <div className="relative">
                    <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input className="input-field pl-9 font-mono uppercase tracking-widest"
                      placeholder="ABC-1234  ou  vazio"
                      maxLength={10}
                      value={form.placa_manual}
                      onChange={e => setForm(p => ({ ...p, placa_manual: e.target.value.toUpperCase(), caminhao_id: '' }))}/>
                  </div>
                )}
                {/* Se tem cliente com frota mas quer digitar placa diferente */}
                {form.cliente_id && caminhoes.length > 0 && (
                  <button className="text-xs text-slate-500 hover:text-brand-400 mt-1 transition-colors"
                    onClick={() => setForm(p => ({ ...p, caminhao_id: '', placa_manual: '' }))}>
                    + Digitar placa manualmente
                  </button>
                )}
              </div>

              <div>
                <label className="label">Data de Abertura</label>
                <input type="date" className="input-field" value={form.data_abertura}
                  onChange={e => setForm(p => ({ ...p, data_abertura: e.target.value }))}/>
              </div>

              <div>
                <label className="label">Vencimento <span className="text-slate-600 normal-case font-normal">(opcional)</span></label>
                <input type="date" className="input-field" value={form.data_vencimento}
                  onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))}/>
              </div>

              <div>
                <label className="label">Status Pagamento</label>
                <select className="input-field" value={form.status_pagamento}
                  onChange={e => setForm(p => ({ ...p, status_pagamento: e.target.value as any }))}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="atrasado">Atrasado</option>
                </select>
              </div>

              <div>
                <label className="label">Valor Fixo (R$) <span className="text-slate-600 normal-case font-normal">(se não usar itens)</span></label>
                <div className="relative">
                  <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                  <input type="number" min="0" step="0.01" className="input-field pl-8"
                    placeholder="0,00" value={form.valor_manual}
                    onChange={e => setForm(p => ({ ...p, valor_manual: e.target.value }))}/>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Observações</label>
              <textarea className="input-field resize-none" rows={2}
                placeholder="Detalhes adicionais sobre o serviço..."
                value={form.observacoes}
                onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}/>
            </div>
          </div>

          {/* Itens */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="section-title mb-0">
                Itens da OS
                <span className="text-slate-600 font-normal normal-case tracking-normal ml-2 text-[10px]">
                  {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCatalogMobile(true)}
                  className="xl:hidden btn-secondary text-xs py-1.5 px-3 min-h-[34px]">
                  <Search size={12}/> Catálogo
                </button>
                <button onClick={addManual} className="btn-secondary text-xs py-1.5 px-3 min-h-[34px]">
                  <Plus size={12}/> Linha Manual
                </button>
              </div>
            </div>

            {itens.length === 0 ? (
              <div className="text-center py-10 text-slate-600 text-sm border-2 border-dashed border-white rounded-lg">
                <Calculator size={24} className="mx-auto mb-2 opacity-20"/>
                <p>Selecione itens do catálogo ou adicione manualmente</p>
                <p className="text-xs mt-1 text-slate-700">Ou use o "Valor Fixo" acima para OS sem itens detalhados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itens.map((item, idx) => (
                  <ItemRow key={idx} item={item} idx={idx} onUpdate={updateItem} onRemove={removeItem}/>
                ))}
              </div>
            )}

            {itens.length > 0 && (
              <div className="flex justify-end items-center gap-3 pt-2 border-t border-white">
                <span className="text-sm text-slate-400">Subtotal:</span>
                <span className="text-lg font-bold text-white">{formatCurrency(totalDisplay)}</span>
              </div>
            )}
          </div>

          {/* Botão salvar mobile */}
          <div className="xl:hidden">
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> Salvando...</>
                : <><Save size={15}/> Criar OS — {formatCurrency(totalDisplay)}</>}
            </button>
          </div>
        </div>

        {/* Coluna direita: catálogo + resumo */}
        <div className="hidden xl:flex flex-col gap-4">
          <div className="card flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)', position: 'sticky', top: '20px' }}>
            <div className="p-4 border-b border-white">
              <div className="section-title mb-2">Catálogo de Peças & Serviços</div>
              <input className="input-field text-sm" placeholder="Buscar por nome ou código..."
                value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}/>
              <div className="flex gap-1 mt-2">
                {(['todos','servico','peca'] as const).map(tab => (
                  <button key={tab} onClick={() => setCatalogTab(tab)}
                    className={clsx(
                      'flex-1 text-xs font-semibold py-1.5 rounded-md border transition-colors',
                      catalogTab === tab
                        ? 'bg-brand-600 text-white border-brand-500'
                        : 'bg-surface-600 text-slate-400 border-white hover:text-slate-200'
                    )}>
                    {{ todos:'Todos', servico:'Serviços', peca:'Peças' }[tab]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {catalogFiltered.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-xs">Nenhum item encontrado</div>
              ) : catalogFiltered.map(item => {
                const alreadyAdded = itens.some(i => i.item_id === item.id)
                return (
                  <button key={item.id} onClick={() => addFromCatalog(item)}
                    className={clsx(
                      'w-full text-left px-3 py-2.5 rounded-lg border transition-all',
                      alreadyAdded
                        ? 'bg-brand-500-10 border-brand-500-20'
                        : 'border-transparent hover:bg-surface-600 hover:border-white'
                    )}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.categoria === 'peca'
                          ? <Package size={12} className="text-brand-400 flex-shrink-0"/>
                          : <Wrench size={12} className="text-purple-400 flex-shrink-0"/>}
                        <div className="min-w-0">
                          <div className="text-sm text-slate-200 truncate font-medium">{item.nome}</div>
                          {item.codigo_interno && (
                            <div className="text-[10px] text-slate-600 mt-0.5 font-mono">{item.codigo_interno}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs font-mono font-semibold text-emerald-400">{formatCurrency(item.preco_padrao)}</div>
                        {alreadyAdded && <div className="text-[9px] text-brand-400 mt-0.5">✓ adicionado</div>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Resumo + salvar */}
          <div className="card p-4 space-y-3">
            <div className="section-title">Resumo</div>
            {itens.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {itens.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs gap-2">
                    <span className="text-slate-500 truncate">{item.descricao || `Item ${idx+1}`}</span>
                    <span className="text-slate-300 font-mono flex-shrink-0">{formatCurrency(Number(item.quantidade)*Number(item.preco_unitario))}</span>
                  </div>
                ))}
              </div>
            )}
            {form.valor_manual && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Valor fixo</span>
                <span className="font-mono font-bold text-slate-200">{formatCurrency(valorManualN)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-white">
              <span className="text-slate-400 text-sm font-semibold">Total</span>
              <span className="text-2xl font-bold text-white">{formatCurrency(totalDisplay)}</span>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> Salvando...</>
                : <><Save size={15}/> Criar OS</>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: drawer catálogo */}
      {showCatalogMobile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface-800">
          <div className="flex items-center justify-between p-4 border-b border-white">
            <h2 className="font-bold text-white">Catálogo</h2>
            <button onClick={() => setShowCatalogMobile(false)} className="btn-ghost p-2"><X size={18}/></button>
          </div>
          <div className="p-4 border-b border-white space-y-2">
            <input className="input-field" placeholder="Buscar..."
              value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} autoFocus/>
            <div className="flex gap-1">
              {(['todos','servico','peca'] as const).map(tab => (
                <button key={tab} onClick={() => setCatalogTab(tab)}
                  className={clsx('flex-1 text-xs font-semibold py-1.5 rounded-md border transition-colors',
                    catalogTab === tab ? 'bg-brand-600 text-white border-brand-500' : 'bg-surface-600 text-slate-400 border-white')}>
                  {{ todos:'Todos', servico:'Serviços', peca:'Peças' }[tab]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {catalogFiltered.map(item => {
              const alreadyAdded = itens.some(i => i.item_id === item.id)
              return (
                <button key={item.id} onClick={() => addFromCatalog(item)}
                  className={clsx(
                    'w-full text-left px-4 py-3 rounded-xl border transition-all',
                    alreadyAdded ? 'bg-brand-500-15 border-brand-500-30' : 'border-white bg-surface-700 active:bg-surface-600'
                  )}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.categoria === 'peca' ? <Package size={15} className="text-brand-400 flex-shrink-0"/> : <Wrench size={15} className="text-purple-400 flex-shrink-0"/>}
                      <div>
                        <div className="text-sm font-semibold text-slate-200">{item.nome}</div>
                        {item.codigo_interno && <div className="text-xs text-slate-600 font-mono">{item.codigo_interno}</div>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-400">{formatCurrency(item.preco_padrao)}</span>
                      {alreadyAdded && <Check size={14} className="text-brand-400"/>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="p-4 border-t border-white">
            <button onClick={() => setShowCatalogMobile(false)} className="btn-primary w-full">
              <Check size={15}/> Confirmar ({itens.length} itens)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, idx, onUpdate, onRemove }: {
  item: OrdemItemForm; idx: number
  onUpdate: (idx: number, field: keyof OrdemItemForm, value: string|number) => void
  onRemove: (idx: number) => void
}) {
  const subtotal = Number(item.quantidade) * Number(item.preco_unitario)
  return (
    <div className="section-box">
      <div className="hidden sm:grid grid-cols-[1fr_100px_90px_100px_80px_32px] gap-2 items-center">
        <input className="input-field text-sm py-2" placeholder="Descrição do serviço/peça"
          value={item.descricao} onChange={e => onUpdate(idx, 'descricao', e.target.value)}/>
        <select className="input-field text-sm py-2" value={item.categoria}
          onChange={e => onUpdate(idx, 'categoria', e.target.value)}>
          <option value="servico">Serviço</option>
          <option value="peca">Peça</option>
        </select>
        <input type="number" min="0.01" step="0.01" className="input-field text-sm py-2 text-center"
          placeholder="Qtd" value={item.quantidade} onChange={e => onUpdate(idx, 'quantidade', e.target.value)}/>
        <input type="number" min="0" step="0.01" className="input-field text-sm py-2"
          placeholder="R$ Unit." value={item.preco_unitario} onChange={e => onUpdate(idx, 'preco_unitario', e.target.value)}/>
        <div className="font-mono text-sm font-semibold text-slate-200 text-right pr-1">{formatCurrency(subtotal)}</div>
        <button onClick={() => onRemove(idx)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
          <Trash2 size={14}/>
        </button>
      </div>
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Item {idx+1}</span>
          <button onClick={() => onRemove(idx)} className="text-slate-600 hover:text-red-400 p-1"><X size={15}/></button>
        </div>
        <input className="input-field" placeholder="Descrição" value={item.descricao}
          onChange={e => onUpdate(idx, 'descricao', e.target.value)}/>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="label">Tipo</div>
            <select className="input-field text-sm" value={item.categoria}
              onChange={e => onUpdate(idx, 'categoria', e.target.value)}>
              <option value="servico">Serviço</option>
              <option value="peca">Peça</option>
            </select>
          </div>
          <div>
            <div className="label">Qtd</div>
            <input type="number" min="0.01" step="0.01" className="input-field text-center"
              value={item.quantidade} onChange={e => onUpdate(idx, 'quantidade', e.target.value)}/>
          </div>
          <div>
            <div className="label">Preço</div>
            <input type="number" min="0" step="0.01" className="input-field"
              value={item.preco_unitario} onChange={e => onUpdate(idx, 'preco_unitario', e.target.value)}/>
          </div>
        </div>
        <div className="flex justify-end">
          <span className="text-sm font-bold text-slate-200">= {formatCurrency(subtotal)}</span>
        </div>
      </div>
    </div>
  )
}
