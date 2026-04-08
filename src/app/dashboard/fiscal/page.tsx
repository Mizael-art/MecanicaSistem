'use client'
import { useState, useEffect } from 'react'
import { supabase, formatCurrency, formatDate } from '@/lib/supabase'
import { Receipt, Plus, Upload, FileCheck, AlertCircle, Info } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string,string> = {
  rascunho:   'bg-slate-500/15 text-slate-400 border-slate-500/30',
  enviada:    'bg-brand-500-15 text-brand-400 border-brand-500-30',
  autorizada: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelada:  'bg-red-500/15 text-red-400 border-red-500/30',
  rejeitada:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

export default function FiscalPage() {
  const [notas, setNotas]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInfo, setShowInfo] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    const { data } = await supabase.from('notas_fiscais').select('*, clientes(nome)').order('created_at',{ascending:false})
    setNotas(data || [])
    setLoading(false)
  }
  useEffect(() => { fetchAll() }, [])

  const criarRascunho = async () => {
    const { data, error } = await supabase.from('notas_fiscais').insert({
      tipo: 'nfse', natureza_op: 'Prestação de Serviço de Manutenção Veicular', status: 'rascunho'
    }).select().single()
    if (error) toast.error('Erro: '+error.message)
    else { toast.success('Rascunho criado — aguardando integração com API fiscal'); fetchAll() }
  }

  const stats = {
    autorizadas: notas.filter(n=>n.status==='autorizada').length,
    canceladas:  notas.filter(n=>n.status==='cancelada').length,
    total:       notas.filter(n=>n.status==='autorizada').reduce((s:number,n:any)=>s+n.valor_total,0),
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><Receipt size={22} className="text-brand-400"/> Módulo Fiscal</h1>
          <p className="page-subtitle">NFe · NFCe · NFS-e</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm"><Upload size={14}/> Importar XML</button>
          <button onClick={criarRascunho} className="btn-primary text-sm"><Plus size={14}/> Nova Nota</button>
        </div>
      </div>

      {/* Aviso de integração pendente */}
      {showInfo && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-brand-500-25 bg-brand-500-10 mb-5">
          <Info size={16} className="text-brand-400 flex-shrink-0 mt-0.5"/>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-brand-300">Integração com API Fiscal — Em Desenvolvimento</div>
            <p className="text-xs text-brand-400 mt-1">A estrutura fiscal está pronta. A emissão real requer integração com um provedor como Focus NFe, NFe.io ou similar. As notas criadas ficam como rascunho até a integração.</p>
          </div>
          <button onClick={()=>setShowInfo(false)} className="text-brand-400 hover:text-brand-400 text-xs">×</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="stat-card"><span className="stat-label">Autorizadas</span><div className="stat-value text-emerald-400 text-xl">{stats.autorizadas}</div></div>
        <div className="stat-card"><span className="stat-label">Canceladas</span><div className="stat-value text-red-400 text-xl">{stats.canceladas}</div></div>
        <div className="stat-card"><span className="stat-label">Faturado</span><div className="stat-value text-brand-400 text-xl">{formatCurrency(stats.total)}</div></div>
      </div>

      {loading ? <div className="space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="card h-16 animate-pulse"/>)}</div> :
        notas.length===0 ? (
          <div className="card py-16 text-center space-y-3">
            <Receipt size={40} className="mx-auto text-slate-700"/>
            <p className="text-slate-500">Nenhuma nota fiscal cadastrada</p>
            <button onClick={criarRascunho} className="btn-primary mx-auto w-fit"><Plus size={15}/> Criar Rascunho</button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="table">
              <thead><tr><th>Nº</th><th>Tipo</th><th>Cliente</th><th>Emissão</th><th>Total</th><th>Status</th><th>Protocolo</th></tr></thead>
              <tbody>
                {notas.map((n:any)=>(
                  <tr key={n.id}>
                    <td className="font-mono text-xs text-slate-400">{n.numero || '(rascunho)'}</td>
                    <td><span className="text-xs font-bold text-brand-400 uppercase">{n.tipo}</span></td>
                    <td className="text-slate-300">{n.clientes?.nome || '—'}</td>
                    <td className="text-xs text-slate-500">{n.data_emissao ? formatDate(n.data_emissao) : '—'}</td>
                    <td className="font-bold text-slate-100">{formatCurrency(n.valor_total)}</td>
                    <td><span className={clsx('status-badge', STATUS_COLORS[n.status]||'')}>{n.status}</span></td>
                    <td className="font-mono text-xs text-slate-600">{n.protocolo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}
