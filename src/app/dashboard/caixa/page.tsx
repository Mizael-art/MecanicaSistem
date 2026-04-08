'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, formatCurrency } from '@/lib/supabase'
import { Banknote, Lock, Unlock, ArrowUpCircle, ArrowDownCircle, X } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

export default function CaixaPage() {
  const [sessao, setSessao] = useState<any>(null)
  const [movs, setMovs]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAbrir, setShowAbrir] = useState(false)
  const [showMov, setShowMov] = useState<'entrada'|'saida'|null>(null)
  const [formAbrir, setFormAbrir] = useState('')
  const [formMov, setFormMov] = useState({ descricao:'', valor:'', forma:'dinheiro' })

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('caixa_sessoes').select('*').eq('status','aberto').order('data_abertura',{ascending:false}).limit(1)
    const s = data?.[0] || null; setSessao(s)
    if (s) {
      const { data: ms } = await supabase.from('movimentacoes_caixa').select('*').eq('sessao_id',s.id).order('created_at',{ascending:false})
      setMovs(ms || [])
    } else setMovs([])
    setLoading(false)
  }, [])
  useEffect(() => { fetch() }, [fetch])

  const totalEnt = movs.filter((m:any)=>m.tipo==='entrada').reduce((s:number,m:any)=>s+m.valor,0)
  const totalSai = movs.filter((m:any)=>m.tipo==='saida').reduce((s:number,m:any)=>s+m.valor,0)
  const saldo    = sessao ? sessao.saldo_inicial + totalEnt - totalSai : 0

  const abrir = async () => {
    await supabase.from('caixa_sessoes').insert({ saldo_inicial: parseFloat(formAbrir)||0 })
    toast.success('Caixa aberto!'); setShowAbrir(false); fetch()
  }
  const fechar = async () => {
    if (!sessao || !confirm('Fechar caixa?')) return
    await supabase.from('caixa_sessoes').update({ status:'fechado', data_fechamento: new Date().toISOString(), saldo_final: saldo, total_entradas: totalEnt, total_saidas: totalSai }).eq('id', sessao.id)
    toast.success('Caixa fechado!'); setSessao(null); setMovs([])
  }
  const registrar = async () => {
    if (!sessao || !formMov.descricao || !formMov.valor) return
    await supabase.from('movimentacoes_caixa').insert({ sessao_id: sessao.id, tipo: showMov, valor: parseFloat(formMov.valor), descricao: formMov.descricao, forma_pagamento: formMov.forma })
    toast.success('Registrado!'); setShowMov(null); setFormMov({descricao:'',valor:'',forma:'dinheiro'}); fetch()
  }

  if (loading) return <div className="card h-48 animate-pulse"/>
  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><Banknote size={22} className="text-brand-400"/> Fluxo de Caixa</h1>
          <p className="page-subtitle">{sessao ? 'Caixa aberto' : 'Caixa fechado'}</p>
        </div>
        {sessao ? (
          <div className="flex gap-2">
            <button onClick={()=>setShowMov('entrada')} className="btn-secondary text-sm"><ArrowUpCircle size={14} className="text-emerald-400"/> Entrada</button>
            <button onClick={()=>setShowMov('saida')}   className="btn-secondary text-sm"><ArrowDownCircle size={14} className="text-red-400"/> Saída</button>
            <button onClick={fechar} className="btn-danger text-sm"><Lock size={14}/> Fechar</button>
          </div>
        ) : <button onClick={()=>setShowAbrir(true)} className="btn-primary"><Unlock size={15}/> Abrir Caixa</button>}
      </div>

      {!sessao ? (
        <div className="card py-20 text-center space-y-3">
          <Banknote size={40} className="mx-auto text-slate-700"/>
          <p className="text-slate-500">Abra o caixa para registrar movimentações</p>
          <button onClick={()=>setShowAbrir(true)} className="btn-primary mx-auto w-fit"><Unlock size={15}/> Abrir Caixa</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[{l:'Saldo Inicial',v:sessao.saldo_inicial,c:'text-slate-300'},{l:'Entradas',v:totalEnt,c:'text-emerald-400'},{l:'Saídas',v:totalSai,c:'text-red-400'},{l:'Saldo Atual',v:saldo,c:saldo>=0?'text-brand-400':'text-red-400'}].map(k=>(
              <div key={k.l} className="stat-card"><span className="stat-label">{k.l}</span><div className={clsx('stat-value text-xl',k.c)}>{formatCurrency(k.v)}</div></div>
            ))}
          </div>
          <div className="card p-4">
            <div className="section-title mb-3">Movimentações ({movs.length})</div>
            {movs.length===0 ? <div className="py-8 text-center text-slate-600 text-sm">Nenhuma movimentação</div> : (
              <div>
                {movs.map((m:any)=>(
                  <div key={m.id} className="flex items-center justify-between py-3 border-b border-white last:border-0 gap-3">
                    <div className="flex items-center gap-3">
                      {m.tipo==='entrada'?<ArrowUpCircle size={15} className="text-emerald-400"/>:<ArrowDownCircle size={15} className="text-red-400"/>}
                      <div>
                        <div className="text-sm text-slate-200 font-medium">{m.descricao}</div>
                        <div className="text-xs text-slate-600">{m.forma_pagamento}</div>
                      </div>
                    </div>
                    <span className={clsx('font-bold font-mono text-sm',m.tipo==='entrada'?'text-emerald-400':'text-red-400')}>{m.tipo==='entrada'?'+':'-'}{formatCurrency(m.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showAbrir&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAbrir(false)}>
        <div className="modal-content">
          <div className="modal-header"><h2 className="font-bold text-white">Abrir Caixa</h2><button onClick={()=>setShowAbrir(false)} className="btn-ghost p-1.5"><X size={16}/></button></div>
          <div className="modal-body"><label className="label">Saldo Inicial (R$)</label><input type="number" min="0" step="0.01" className="input-field text-lg" placeholder="0,00" value={formAbrir} onChange={e=>setFormAbrir(e.target.value)} autoFocus/></div>
          <div className="modal-footer"><button onClick={()=>setShowAbrir(false)} className="btn-secondary flex-1">Cancelar</button><button onClick={abrir} className="btn-primary flex-1"><Unlock size={15}/> Abrir</button></div>
        </div>
      </div>}

      {showMov&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowMov(null)}>
        <div className="modal-content">
          <div className="modal-header"><h2 className={clsx('font-bold',showMov==='entrada'?'text-emerald-400':'text-red-400')}>Registrar {showMov==='entrada'?'Entrada':'Saída'}</h2><button onClick={()=>setShowMov(null)} className="btn-ghost p-1.5"><X size={16}/></button></div>
          <div className="modal-body space-y-3">
            <div><label className="label">Descrição</label><input className="input-field" autoFocus value={formMov.descricao} onChange={e=>setFormMov(p=>({...p,descricao:e.target.value}))} placeholder="Descreva o movimento"/></div>
            <div className="form-grid-2">
              <div><label className="label">Valor (R$)</label><input type="number" min="0" step="0.01" className="input-field" placeholder="0,00" value={formMov.valor} onChange={e=>setFormMov(p=>({...p,valor:e.target.value}))}/></div>
              <div><label className="label">Forma</label>
                <select className="input-field" value={formMov.forma} onChange={e=>setFormMov(p=>({...p,forma:e.target.value}))}>
                  <option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="cartao_debito">Débito</option><option value="cartao_credito">Crédito</option><option value="transferencia">TED/PIX</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer"><button onClick={()=>setShowMov(null)} className="btn-secondary flex-1">Cancelar</button><button onClick={registrar} className={clsx('btn-primary flex-1',showMov==='saida'&&'bg-red-600 hover:bg-red-500')}>Registrar</button></div>
        </div>
      </div>}
    </div>
  )
}
