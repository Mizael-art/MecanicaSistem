'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, formatCurrency } from '@/lib/supabase'
import { ArrowLeft, Plus, Trash2, Package, Wrench, Search, Save, X, Check } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

export default function NovoOrcamentoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [caminhoes, setCaminhoes] = useState<any[]>([])
  const [catalog, setCatalog] = useState<any[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogTab, setCatalogTab] = useState<'todos'|'servico'|'peca'>('todos')
  const [itens, setItens] = useState<any[]>([])
  const [form, setForm] = useState({ cliente_id:'', caminhao_id:'', descricao:'', data_emissao: new Date().toISOString().split('T')[0], data_validade:'', observacoes:'' })

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('itens_servicos').select('*').eq('ativo',true).order('nome'),
    ]).then(([c,items]) => { setClientes(c.data||[]); setCatalog(items.data||[]) })
  }, [])
  useEffect(() => {
    if (!form.cliente_id) { setCaminhoes([]); return }
    supabase.from('caminhoes').select('*').eq('cliente_id',form.cliente_id).order('placa').then(({data})=>setCaminhoes(data||[]))
  }, [form.cliente_id])

  const catalogFiltered = catalog.filter(i => {
    const matchS = !catalogSearch || i.nome.toLowerCase().includes(catalogSearch.toLowerCase())
    const matchT = catalogTab==='todos' || i.categoria===catalogTab
    return matchS && matchT
  })

  const addFromCatalog = (item: any) => {
    const idx = itens.findIndex(i=>i.item_id===item.id)
    if (idx>=0) { setItens(prev=>prev.map((it,i)=>i===idx?{...it,quantidade:it.quantidade+1}:it)); return }
    setItens(prev=>[...prev,{item_id:item.id,descricao:item.nome,categoria:item.categoria,quantidade:1,preco_unitario:item.preco_padrao}])
  }
  const addManual = () => setItens(prev=>[...prev,{descricao:'',categoria:'servico',quantidade:1,preco_unitario:0}])
  const updateItem = (idx:number,field:string,value:any) => setItens(prev=>prev.map((it,i)=>i===idx?{...it,[field]:value}:it))
  const removeItem = (idx:number) => setItens(prev=>prev.filter((_,i)=>i!==idx))
  const total = itens.reduce((s,i)=>s+(Number(i.quantidade)*Number(i.preco_unitario)),0)

  const handleSave = async () => {
    setSaving(true)
    const { data: orc, error } = await supabase.from('orcamentos').insert({
      cliente_id: form.cliente_id||null, caminhao_id: form.caminhao_id||null,
      descricao: form.descricao||null, data_emissao: form.data_emissao,
      data_validade: form.data_validade||null, observacoes: form.observacoes||null, status:'rascunho'
    }).select().single()
    if (error||!orc) { toast.error('Erro: '+error?.message); setSaving(false); return }
    if (itens.length>0) await supabase.from('itens_orcamento').insert(itens.map(i=>({orcamento_id:orc.id,item_id:i.item_id||null,descricao:i.descricao,categoria:i.categoria,quantidade:Number(i.quantidade),preco_unitario:Number(i.preco_unitario)})))
    toast.success('Orçamento criado!')
    router.push('/dashboard/orcamentos/'+orc.id)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/orcamentos" className="btn-ghost p-2"><ArrowLeft size={16}/></Link>
        <div><h1 className="page-title">Novo Orçamento</h1><p className="page-subtitle">Crie um orçamento para o cliente</p></div>
      </div>
      <div className="grid xl:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <div className="section-title">Dados do Orçamento</div>
            <div>
              <label className="label">Descrição / Título</label>
              <input className="input-field" placeholder="Ex: Revisão preventiva anual" value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))}/>
            </div>
            <div className="form-grid-2">
              <div><label className="label">Cliente</label>
                <select className="input-field" value={form.cliente_id} onChange={e=>setForm(p=>({...p,cliente_id:e.target.value,caminhao_id:''}))}>
                  <option value="">— Sem cliente —</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div><label className="label">Caminhão</label>
                <select className="input-field" value={form.caminhao_id} onChange={e=>setForm(p=>({...p,caminhao_id:e.target.value}))} disabled={!form.cliente_id}>
                  <option value="">— Selecione —</option>{caminhoes.map(c=><option key={c.id} value={c.id}>{c.placa} — {c.marca} {c.modelo}</option>)}
                </select>
              </div>
              <div><label className="label">Data de Emissão</label><input type="date" className="input-field" value={form.data_emissao} onChange={e=>setForm(p=>({...p,data_emissao:e.target.value}))}/></div>
              <div><label className="label">Validade</label><input type="date" className="input-field" value={form.data_validade} onChange={e=>setForm(p=>({...p,data_validade:e.target.value}))}/></div>
            </div>
            <div><label className="label">Observações</label><textarea className="input-field resize-none" rows={2} value={form.observacoes} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))}/></div>
          </div>
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="section-title mb-0">Itens ({itens.length})</div>
              <button onClick={addManual} className="btn-secondary text-xs py-1.5 px-3 min-h-[34px]"><Plus size={12}/> Linha Manual</button>
            </div>
            {itens.length===0 ? (
              <div className="text-center py-10 text-slate-600 text-sm border-2 border-dashed border-white rounded-lg">Selecione itens do catálogo ou adicione manualmente</div>
            ) : (
              <div className="space-y-2">
                {itens.map((item,idx)=>(
                  <div key={idx} className="section-box space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Item {idx+1}</span>
                      <button onClick={()=>removeItem(idx)} className="text-slate-600 hover:text-red-400 p-1"><X size={14}/></button>
                    </div>
                    <input className="input-field" placeholder="Descrição" value={item.descricao} onChange={e=>updateItem(idx,'descricao',e.target.value)}/>
                    <div className="grid grid-cols-3 gap-2">
                      <select className="input-field text-sm" value={item.categoria} onChange={e=>updateItem(idx,'categoria',e.target.value)}>
                        <option value="servico">Serviço</option><option value="peca">Peça</option>
                      </select>
                      <input type="number" min="0.01" step="0.01" className="input-field text-center text-sm" placeholder="Qtd" value={item.quantidade} onChange={e=>updateItem(idx,'quantidade',e.target.value)}/>
                      <input type="number" min="0" step="0.01" className="input-field text-sm" placeholder="R$ Unit." value={item.preco_unitario} onChange={e=>updateItem(idx,'preco_unitario',e.target.value)}/>
                    </div>
                    <div className="text-right text-sm font-bold text-slate-200">= {formatCurrency(Number(item.quantidade)*Number(item.preco_unitario))}</div>
                  </div>
                ))}
                <div className="flex justify-end items-center gap-3 pt-2 border-t border-white">
                  <span className="text-sm text-slate-400">Total:</span>
                  <span className="text-xl font-bold text-white">{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full xl:hidden">
            {saving?'Salvando...':<><Save size={15}/> Salvar Orçamento</>}
          </button>
        </div>
        {/* Catálogo lateral */}
        <div className="hidden xl:flex flex-col gap-4">
          <div className="card flex flex-col sticky top-5" style={{maxHeight:'calc(100vh - 100px)'}}>
            <div className="p-4 border-b border-white">
              <div className="section-title mb-2">Catálogo</div>
              <input className="input-field text-sm mb-2" placeholder="Buscar..." value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)}/>
              <div className="flex gap-1">
                {(['todos','servico','peca'] as const).map(t=>(
                  <button key={t} onClick={()=>setCatalogTab(t)} className={clsx('flex-1 text-xs font-semibold py-1.5 rounded-md border transition-colors',catalogTab===t?'bg-brand-600 text-white border-brand-500':'bg-surface-600 text-slate-400 border-white')}>
                    {{todos:'Todos',servico:'Serv.',peca:'Peças'}[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {catalogFiltered.map(item=>{
                const added = itens.some(i=>i.item_id===item.id)
                return (
                  <button key={item.id} onClick={()=>addFromCatalog(item)} className={clsx('w-full text-left px-3 py-2.5 rounded-lg border transition-all',added?'bg-brand-500-10 border-brand-500-20':'border-transparent hover:bg-surface-600 hover:border-white')}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.categoria==='peca'?<Package size={11} className="text-brand-400 flex-shrink-0"/>:<Wrench size={11} className="text-purple-400 flex-shrink-0"/>}
                        <span className="text-sm text-slate-200 truncate">{item.nome}</span>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs font-mono font-semibold text-emerald-400">{formatCurrency(item.preco_padrao)}</div>
                        {added&&<div className="text-[9px] text-brand-400">✓</div>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-semibold">Total</span>
              <span className="text-2xl font-bold text-white">{formatCurrency(total)}</span>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
              {saving?'Salvando...':<><Save size={15}/> Salvar Orçamento</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
