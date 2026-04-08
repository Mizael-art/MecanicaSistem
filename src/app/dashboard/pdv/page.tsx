'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, formatCurrency } from '@/lib/supabase'
import { ShoppingCart, Package, Wrench, Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Check, X, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

type CartItem = { item_id: string; descricao: string; categoria: string; quantidade: number; preco_unitario: number }
type Forma = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito'

export default function PDVPage() {
  const [catalog, setCatalog]       = useState<any[]>([])
  const [search, setSearch]         = useState('')
  const [tab, setTab]               = useState<'todos' | 'servico' | 'peca'>('todos')
  const [cart, setCart]             = useState<CartItem[]>([])
  const [forma, setForma]           = useState<Forma>('dinheiro')
  const [desconto, setDesconto]     = useState('')
  const [finalizing, setFinalizing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastVendaNum, setLastVendaNum] = useState<number | null>(null)
  const [sessaoAberta, setSessaoAberta] = useState<any>(null)

  const loadData = useCallback(async () => {
    const [catRes, sessaoRes] = await Promise.all([
      supabase.from('itens_servicos').select('id,nome,categoria,preco_padrao,codigo_interno,estoque_atual,unidade').eq('ativo', true).order('nome'),
      supabase.from('caixa_sessoes').select('id').eq('status', 'aberto').limit(1),
    ])
    setCatalog(catRes.data || [])
    setSessaoAberta(sessaoRes.data?.[0] || null)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = catalog.filter(i => {
    const matchS = !search || i.nome.toLowerCase().includes(search.toLowerCase()) || i.codigo_interno?.toLowerCase().includes(search.toLowerCase())
    const matchT = tab === 'todos' || i.categoria === tab
    return matchS && matchT
  })

  const addToCart = (item: any) => {
    const idx = cart.findIndex(c => c.item_id === item.id)
    if (idx >= 0) setCart(p => p.map((c, i) => i === idx ? { ...c, quantidade: c.quantidade + 1 } : c))
    else setCart(p => [...p, { item_id: item.id, descricao: item.nome, categoria: item.categoria, quantidade: 1, preco_unitario: item.preco_padrao }])
  }
  const updateQty = (idx: number, delta: number) => {
    setCart(prev => prev.map((c, i) => i === idx ? { ...c, quantidade: Math.max(0.01, c.quantidade + delta) } : c).filter(c => c.quantidade > 0))
  }
  const removeFromCart = (idx: number) => setCart(p => p.filter((_, i) => i !== idx))

  const subtotal    = cart.reduce((s, c) => s + (c.quantidade * c.preco_unitario), 0)
  const descontoVal = parseFloat(desconto) || 0
  const total       = Math.max(0, subtotal - descontoVal)

  const finalizarVenda = async () => {
    if (cart.length === 0) { toast.error('Carrinho vazio'); return }
    setFinalizing(true)
    try {
      // BUG-05 FIX: low stock for each 'peca' item sold
      // PROB-04 FIX: link venda to open caixa session
      const { data: venda, error } = await supabase.from('vendas').insert({
        valor_total: total, desconto: descontoVal, valor_pago: total,
        forma_pagamento: forma, status: 'finalizada',
        sessao_caixa_id: sessaoAberta?.id || null,
      }).select().single()

      if (error || !venda) { toast.error('Erro: ' + error?.message); setFinalizing(false); return }

      // Insert itens_venda
      await supabase.from('itens_venda').insert(cart.map(c => ({
        venda_id: venda.id, item_id: c.item_id, descricao: c.descricao,
        categoria: c.categoria, quantidade: c.quantidade, preco_unitario: c.preco_unitario
      })))

      // BUG-05: baixar estoque de peças + registrar movimentacao
      const pecas = cart.filter(c => c.categoria === 'peca')
      for (const item of pecas) {
        const catalogItem = catalog.find(ci => ci.id === item.item_id)
        if (!catalogItem) continue
        const novoSaldo = Math.max(0, (catalogItem.estoque_atual || 0) - item.quantidade)
        await supabase.from('movimentacoes_estoque').insert({
          item_id: item.item_id, tipo: 'saida', quantidade: item.quantidade,
          motivo: 'venda', ref_id: venda.id, ref_tipo: 'venda', saldo_apos: novoSaldo
        })
        await supabase.from('itens_servicos').update({ estoque_atual: novoSaldo }).eq('id', item.item_id)
      }

      // Registrar no caixa se aberto
      if (sessaoAberta) {
        await supabase.from('movimentacoes_caixa').insert({
          sessao_id: sessaoAberta.id, tipo: 'entrada', valor: total,
          descricao: `Venda #${venda.numero}`, forma_pagamento: forma
        })
      }

      setLastVendaNum(venda.numero)
      setCart([]); setDesconto(''); setShowSuccess(true)
      loadData() // refresh estoque
    } catch (e: any) {
      toast.error('Erro inesperado: ' + e.message)
    }
    setFinalizing(false)
  }

  const FORMAS = [
    { key: 'dinheiro',       label: 'Dinheiro', icon: <Banknote size={15}/> },
    { key: 'pix',            label: 'Pix',      icon: <Smartphone size={15}/> },
    { key: 'cartao_debito',  label: 'Débito',   icon: <CreditCard size={15}/> },
    { key: 'cartao_credito', label: 'Crédito',  icon: <CreditCard size={15}/> },
  ] as const

  return (
    // UX-06 FIX: use dvh and account for bottom nav (58px safe)
    <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100dvh - 140px)', minHeight: '500px' }}>
      <div className="page-header mb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="page-title flex items-center gap-2"><ShoppingCart size={22} className="text-brand-400"/> Frente de Caixa — PDV</h1>
            <p className="page-subtitle">Venda rápida de peças e serviços</p>
          </div>
          {/* PROB-04: show caixa status */}
          {sessaoAberta ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/> Caixa Aberto
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={12}/> Caixa Fechado
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-[1fr_360px] gap-5 min-h-0">
        {/* Catálogo */}
        <div className="flex flex-col min-h-0">
          <div className="space-y-2 mb-3 flex-shrink-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input className="input-field pl-9" placeholder="Buscar por nome ou código..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div className="flex gap-1">
              {(['todos', 'servico', 'peca'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={clsx('flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors',
                    tab === t ? 'bg-brand-600 text-white border-brand-500' : 'bg-surface-700 text-slate-400 border-white hover:text-white')}>
                  {{ todos: 'Todos', servico: 'Serviços', peca: 'Peças' }[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
            {filtered.map(item => {
              const inCart    = cart.find(c => c.item_id === item.id)
              const semEstoque = item.categoria === 'peca' && item.estoque_atual !== null && item.estoque_atual <= 0
              return (
                <button key={item.id} onClick={() => addToCart(item)} disabled={semEstoque}
                  className={clsx('p-3 rounded-xl border text-left transition-all active:scale-95 relative',
                    semEstoque ? 'opacity-40 cursor-not-allowed bg-surface-800 border-white' :
                    inCart ? 'bg-brand-600-20 border-brand-500-40' : 'bg-surface-700 border-white hover:bg-surface-600 hover:border-white')}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {item.categoria === 'peca' ? <Package size={13} className="text-brand-400"/> : <Wrench size={13} className="text-purple-400"/>}
                    {inCart && <span className="text-xs font-bold text-brand-400 ml-auto">{inCart.quantidade}×</span>}
                  </div>
                  <div className="text-sm font-semibold text-slate-200 leading-tight line-clamp-2">{item.nome}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="text-sm font-bold text-emerald-400">{formatCurrency(item.preco_padrao)}</div>
                    {item.categoria === 'peca' && item.estoque_atual !== null && (
                      <div className={clsx('text-[10px] font-mono', item.estoque_atual <= 0 ? 'text-red-400' : item.estoque_atual <= (item.estoque_minimo || 0) ? 'text-amber-400' : 'text-slate-600')}>
                        {item.estoque_atual}{item.unidade || 'un'}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Carrinho */}
        <div className="flex flex-col gap-3">
          <div className="card flex-1 flex flex-col min-h-0 p-4">
            <div className="section-title mb-3">Carrinho ({cart.length} {cart.length === 1 ? 'item' : 'itens'})</div>
            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-slate-600 text-sm">
                <div><ShoppingCart size={32} className="mx-auto mb-2 opacity-20"/><p>Selecione itens para vender</p></div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {cart.map((c, idx) => (
                  <div key={idx} className="section-box">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate flex-1">{c.descricao}</span>
                      <button onClick={() => removeFromCart(idx)} className="text-slate-600 hover:text-red-400 flex-shrink-0 p-0.5"><Trash2 size={12}/></button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 rounded bg-surface-600 hover:bg-surface-500 flex items-center justify-center"><Minus size={11}/></button>
                        <span className="text-sm font-bold text-white w-8 text-center">{c.quantidade}</span>
                        <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 rounded bg-surface-600 hover:bg-surface-500 flex items-center justify-center"><Plus size={11}/></button>
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-200">{formatCurrency(c.quantidade * c.preco_unitario)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout */}
          <div className="card p-4 space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-mono text-slate-300">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="label mb-0 whitespace-nowrap">Desconto R$</label>
              <input type="number" min="0" max={subtotal} step="0.01" className="input-field text-sm py-1.5 min-h-[36px]"
                placeholder="0,00" value={desconto} onChange={e => setDesconto(e.target.value)}/>
            </div>
            <div className="flex items-center justify-between text-lg font-bold border-t border-white pt-2">
              <span className="text-slate-300">Total</span>
              <span className="text-white">{formatCurrency(total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {FORMAS.map(f => (
                <button key={f.key} onClick={() => setForma(f.key as Forma)}
                  className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                    forma === f.key ? 'bg-brand-600 text-white border-brand-500' : 'bg-surface-600 text-slate-400 border-white hover:text-white')}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
            <button onClick={finalizarVenda} disabled={finalizing || cart.length === 0} className="btn-primary w-full text-base py-3">
              {finalizing
                ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> Finalizando...</>
                : <><Check size={16}/> Finalizar — {formatCurrency(total)}</>}
            </button>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-body text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
                <Check size={28} className="text-emerald-400"/>
              </div>
              <h2 className="text-xl font-bold text-white">Venda Finalizada!</h2>
              <p className="text-slate-400">Venda #{lastVendaNum} · {formatCurrency(total)}</p>
              <p className="text-sm text-slate-500">
                {forma === 'dinheiro' ? 'Dinheiro' : forma === 'pix' ? 'Pix' : 'Cartão'}
                {sessaoAberta && <span className="text-emerald-500/70 ml-2">· Registrado no caixa</span>}
              </p>
              <button onClick={() => setShowSuccess(false)} className="btn-primary mx-auto w-fit"><Plus size={15}/> Nova Venda</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
