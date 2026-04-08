'use client'
import { useState, useEffect } from 'react'
import { supabase, formatCurrency } from '@/lib/supabase'
import { Boxes, AlertTriangle, Plus, ArrowUp, ArrowDown, Settings, X } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

export default function EstoquePage() {
  const [items, setItems]       = useState<any[]>([])
  const [movs, setMovs]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'itens'|'movimentacoes'>('itens')
  const [showAjuste, setShowAjuste] = useState<any>(null)
  const [formAjuste, setFormAjuste] = useState({ tipo:'entrada', quantidade:'', motivo:'ajuste' })

  const fetchAll = async () => {
    setLoading(true)
    const [it, mv] = await Promise.all([
      supabase.from('itens_servicos').select('*').eq('categoria','peca').order('nome'),
      supabase.from('movimentacoes_estoque').select('*, itens_servicos(nome)').order('created_at',{ascending:false}).limit(50),
    ])
    setItems(it.data||[])
    setMovs(mv.data||[])
    setLoading(false)
  }
  useEffect(() => { fetchAll() }, [])

  const abaixoMinimo = items.filter(i=>i.estoque_atual<=i.estoque_minimo)

  const registrarAjuste = async () => {
    if (!showAjuste||!formAjuste.quantidade) return
    const qtd = parseFloat(formAjuste.quantidade)
    const novoSaldo = formAjuste.tipo==='entrada'
      ? showAjuste.estoque_atual + qtd
      : Math.max(0, showAjuste.estoque_atual - qtd)

    await supabase.from('movimentacoes_estoque').insert({
      item_id: showAjuste.id, tipo: formAjuste.tipo, quantidade: qtd,
      motivo: formAjuste.motivo, saldo_apos: novoSaldo
    })
    await supabase.from('itens_servicos').update({ estoque_atual: novoSaldo }).eq('id', showAjuste.id)
    toast.success('Estoque atualizado!')
    setShowAjuste(null); setFormAjuste({tipo:'entrada',quantidade:'',motivo:'ajuste'}); fetchAll()
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><Boxes size={22} className="text-brand-400"/> Controle de Estoque</h1>
          <p className="page-subtitle">{items.length} itens · {abaixoMinimo.length} abaixo do mínimo</p>
        </div>
      </div>

      {abaixoMinimo.length>0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/25 bg-amber-500/10 mb-5">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5"/>
          <div>
            <div className="text-sm font-semibold text-amber-300">{abaixoMinimo.length} {abaixoMinimo.length===1?'item':'itens'} abaixo do estoque mínimo</div>
            <div className="text-xs text-amber-400/70 mt-0.5">{abaixoMinimo.slice(0,3).map((i:any)=>i.nome).join(', ')}{abaixoMinimo.length>3&&` +${abaixoMinimo.length-3} mais`}</div>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-5 bg-surface-800 p-1 rounded-xl w-fit">
        {(['itens','movimentacoes'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={clsx('px-4 py-2 rounded-lg text-sm font-semibold transition-colors',tab===t?'bg-brand-600 text-white':'text-slate-400 hover:text-white')}>
            {{itens:'Posição de Estoque',movimentacoes:'Movimentações'}[t]}
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="card h-14 animate-pulse"/>)}</div> : (
        <>
          {tab==='itens' && (
            <div className="card overflow-hidden">
              <table className="table">
                <thead><tr><th>Peça / Item</th><th>Código</th><th>Und</th><th>Estoque Atual</th><th>Mínimo</th><th>Custo Médio</th><th>Ações</th></tr></thead>
                <tbody>
                  {items.length===0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-600">Nenhuma peça cadastrada</td></tr>
                  ) : items.map((item:any)=>{
                    const alerta = item.estoque_atual<=item.estoque_minimo
                    return (
                      <tr key={item.id}>
                        <td><div className="flex items-center gap-2">{alerta&&<AlertTriangle size={12} className="text-amber-400 flex-shrink-0"/>}<span className="font-medium text-slate-200">{item.nome}</span></div></td>
                        <td className="font-mono text-xs text-slate-500">{item.codigo_interno||'—'}</td>
                        <td className="text-slate-500 text-sm">{item.unidade||'un'}</td>
                        <td><span className={clsx('font-bold font-mono text-sm',alerta?'text-amber-400':'text-slate-200')}>{item.estoque_atual}</span></td>
                        <td className="text-slate-500 font-mono text-sm">{item.estoque_minimo}</td>
                        <td className="font-mono text-sm text-slate-400">{formatCurrency(item.custo_medio)}</td>
                        <td>
                          <div className="flex gap-1">
                            <button onClick={()=>{setShowAjuste(item);setFormAjuste(p=>({...p,tipo:'entrada'}))}} title="Entrada" className="btn-ghost p-1.5 text-emerald-400 hover:text-emerald-300"><ArrowUp size={13}/></button>
                            <button onClick={()=>{setShowAjuste(item);setFormAjuste(p=>({...p,tipo:'saida'}))}} title="Saída" className="btn-ghost p-1.5 text-red-400 hover:text-red-300"><ArrowDown size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {tab==='movimentacoes' && (
            <div className="card overflow-hidden">
              <table className="table">
                <thead><tr><th>Data</th><th>Item</th><th>Tipo</th><th>Qtd</th><th>Saldo Após</th><th>Motivo</th></tr></thead>
                <tbody>
                  {movs.length===0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-600">Nenhuma movimentação registrada</td></tr>
                  ) : movs.map((m:any)=>(
                    <tr key={m.id}>
                      <td className="text-xs text-slate-500">{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="text-slate-200">{m.itens_servicos?.nome||'—'}</td>
                      <td><span className={clsx('status-badge text-xs',m.tipo==='entrada'?'bg-emerald-500/15 text-emerald-400 border-emerald-500/30':m.tipo==='saida'?'bg-red-500/15 text-red-400 border-red-500/30':'bg-brand-500-15 text-brand-400 border-brand-500-30')}>{m.tipo}</span></td>
                      <td className={clsx('font-mono text-sm font-bold',m.tipo==='entrada'?'text-emerald-400':m.tipo==='saida'?'text-red-400':'text-brand-400')}>{m.tipo==='entrada'?'+':m.tipo==='saida'?'-':'±'}{m.quantidade}</td>
                      <td className="font-mono text-sm text-slate-300">{m.saldo_apos??'—'}</td>
                      <td className="text-xs text-slate-500">{m.motivo||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showAjuste&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAjuste(null)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="font-bold text-white">Ajuste de Estoque — {showAjuste.nome}</h2>
              <button onClick={()=>setShowAjuste(null)} className="btn-ghost p-1.5"><X size={16}/></button>
            </div>
            <div className="modal-body space-y-3">
              <div className="section-box flex items-center justify-between">
                <span className="text-sm text-slate-400">Estoque Atual</span>
                <span className="font-bold font-mono text-white">{showAjuste.estoque_atual} {showAjuste.unidade||'un'}</span>
              </div>
              <div className="form-grid-2">
                <div><label className="label">Tipo</label>
                  <select className="input-field" value={formAjuste.tipo} onChange={e=>setFormAjuste(p=>({...p,tipo:e.target.value}))}>
                    <option value="entrada">Entrada (+)</option>
                    <option value="saida">Saída (-)</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                </div>
                <div><label className="label">Quantidade</label>
                  <input type="number" min="0.001" step="0.001" className="input-field" autoFocus placeholder="0" value={formAjuste.quantidade} onChange={e=>setFormAjuste(p=>({...p,quantidade:e.target.value}))}/>
                </div>
              </div>
              <div><label className="label">Motivo</label>
                <select className="input-field" value={formAjuste.motivo} onChange={e=>setFormAjuste(p=>({...p,motivo:e.target.value}))}>
                  <option value="ajuste">Ajuste manual</option>
                  <option value="compra">Compra</option>
                  <option value="devolucao">Devolução</option>
                  <option value="inventario">Inventário</option>
                  <option value="perda">Perda / Quebra</option>
                </select>
              </div>
              {formAjuste.quantidade&&(
                <div className="section-box flex items-center justify-between text-sm">
                  <span className="text-slate-400">Saldo após ajuste</span>
                  <span className="font-bold font-mono text-white">
                    {formAjuste.tipo==='entrada'?showAjuste.estoque_atual+parseFloat(formAjuste.quantidade):Math.max(0,showAjuste.estoque_atual-parseFloat(formAjuste.quantidade))} {showAjuste.unidade||'un'}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={()=>setShowAjuste(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={registrarAjuste} className="btn-primary flex-1">Confirmar Ajuste</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
