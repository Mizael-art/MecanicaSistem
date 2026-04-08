'use client'
import { useState, useEffect } from 'react'
import { supabase, formatCurrency, formatDate, formatPlaca, getStatusColor, getStatusLabel } from '@/lib/supabase'
import { Caminhao, OrdemServico } from '@/types'
import { ArrowLeft, Truck, ClipboardList, Edit } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { CaminhaoModal } from '@/components/forms/CaminhaoModal'

export default function CaminhaoDetailPage({ params }: { params: { id: string } }) {
  const [caminhao, setCaminhao] = useState<Caminhao | null>(null)
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchData = async () => {
    const [cRes, osRes] = await Promise.all([
      supabase.from('caminhoes').select('*, clientes(nome, telefone)').eq('id', params.id).single(),
      supabase.from('ordens_servico').select('*, clientes(nome)').eq('caminhao_id', params.id)
        .order('data_abertura', { ascending: false }),
    ])
    setCaminhao(cRes.data)
    setOrdens(osRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [params.id])

  if (loading) return <div className="animate-pulse p-8"><div className="h-8 w-48 bg-surface-600 rounded" /></div>
  if (!caminhao) return <div className="p-8 text-slate-500">Caminhão não encontrado</div>

  const totalFaturado = ordens.filter(o => o.status_pagamento === 'pago').reduce((s, o) => s + o.valor_total, 0)

  return (
    <div className="animate-fade-in">
      <Link href="/dashboard/caminhoes" className="btn-ghost text-sm mb-6 inline-flex">
        <ArrowLeft size={16} /> Caminhões
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-600-15 border border-brand-500-20 flex items-center justify-center">
            <Truck size={24} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">{formatPlaca(caminhao.placa)}</h1>
            <p className="text-slate-500">{caminhao.marca} {caminhao.modelo} {caminhao.ano}</p>
            {(caminhao as any).clientes && (
              <p className="text-brand-400 text-sm">{(caminhao as any).clientes.nome}</p>
            )}
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-secondary text-sm">
          <Edit size={14} /> Editar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-label">Total OS</span>
          <div className="stat-value text-xl">{ordens.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Faturado</span>
          <div className="stat-value text-xl text-emerald-400">{formatCurrency(totalFaturado)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Última OS</span>
          <div className="stat-value text-xl text-sm font-semibold">
            {ordens[0] ? formatDate(ordens[0].data_abertura) : '-'}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-slate-200 text-sm flex items-center gap-2 mb-4">
          <ClipboardList size={14} className="text-brand-400" /> Histórico de Ordens ({ordens.length})
        </h2>
        {ordens.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">Nenhuma OS para este caminhão</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>OS</th><th>Data</th><th>Cliente</th><th>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {ordens.map(os => {
                  const colors = getStatusColor(os.status_pagamento)
                  return (
                    <tr key={os.id}>
                      <td>
                        <Link href={`/dashboard/ordens/${os.id}`} className="font-mono text-brand-400 text-xs">
                          #{String(os.numero).padStart(4, '0')}
                        </Link>
                      </td>
                      <td className="text-xs text-slate-500">{formatDate(os.data_abertura)}</td>
                      <td className="text-slate-300">{(os as any).clientes?.nome}</td>
                      <td className="font-semibold">{formatCurrency(os.valor_total)}</td>
                      <td><span className={clsx('status-badge', colors.bg, colors.text, colors.border)}>{getStatusLabel(os.status_pagamento)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <CaminhaoModal caminhao={caminhao} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchData() }} />
      )}
    </div>
  )
}
