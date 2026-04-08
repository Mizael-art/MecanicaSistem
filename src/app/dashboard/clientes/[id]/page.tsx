'use client'
import { useState, useEffect } from 'react'
import { supabase, formatCurrency, formatDate, getStatusColor, getStatusLabel, formatCNPJ } from '@/lib/supabase'
import { Cliente, Caminhao, OrdemServico } from '@/types'
import { ArrowLeft, Truck, ClipboardList, Phone, Mail, MapPin, Edit } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { ClienteModal } from '@/components/forms/ClienteModal'

export default function ClienteDetailPage({ params }: { params: { id: string } }) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [caminhoes, setCaminhoes] = useState<Caminhao[]>([])
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchData = async () => {
    const [clienteRes, caminhoesRes, ordensRes] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', params.id).single(),
      supabase.from('caminhoes').select('*').eq('cliente_id', params.id).order('placa'),
      supabase.from('ordens_servico').select('*, caminhoes(placa)').eq('cliente_id', params.id)
        .order('data_abertura', { ascending: false }),
    ])
    setCliente(clienteRes.data)
    setCaminhoes(caminhoesRes.data || [])
    setOrdens(ordensRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [params.id])

  if (loading) return <div className="animate-pulse p-8"><div className="h-8 w-48 bg-surface-600 rounded" /></div>
  if (!cliente) return <div className="p-8 text-slate-500">Cliente não encontrado</div>

  const totalFaturado = ordens.filter(o => o.status_pagamento === 'pago').reduce((s, o) => s + o.valor_total, 0)
  const totalPendente = ordens.filter(o => o.status_pagamento !== 'pago').reduce((s, o) => s + o.valor_total, 0)

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <Link href="/dashboard/clientes" className="btn-ghost text-sm mb-6 inline-flex">
        <ArrowLeft size={16} /> Clientes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-600-20 border border-brand-500-20 flex items-center justify-center">
            <span className="text-brand-400 font-bold text-xl">{cliente.nome.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{cliente.nome}</h1>
            {cliente.cnpj && <p className="text-slate-500 font-mono text-sm">{formatCNPJ(cliente.cnpj)}</p>}
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-secondary text-sm">
          <Edit size={14} /> Editar
        </button>
      </div>

      {/* Info + Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-label">Faturado</span>
          <div className="stat-value text-emerald-400 text-xl">{formatCurrency(totalFaturado)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pendente</span>
          <div className="stat-value text-amber-400 text-xl">{formatCurrency(totalPendente)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total OS</span>
          <div className="stat-value text-xl">{ordens.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Caminhões</span>
          <div className="stat-value text-xl">{caminhoes.length}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="space-y-4">
          {/* Contato */}
          <div className="card p-5 space-y-3">
            <h2 className="font-bold text-slate-200 text-sm">Informações</h2>
            {cliente.telefone && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Phone size={14} className="text-brand-400" /> {cliente.telefone}
              </div>
            )}
            {cliente.email && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Mail size={14} className="text-brand-400" /> {cliente.email}
              </div>
            )}
            {cliente.endereco && (
              <div className="flex items-start gap-2 text-sm text-slate-400">
                <MapPin size={14} className="text-brand-400 mt-0.5 shrink-0" /> {cliente.endereco}
              </div>
            )}
            {cliente.observacoes && (
              <div className="text-xs text-slate-500 bg-surface-800 rounded-lg p-3 border border-white">
                {cliente.observacoes}
              </div>
            )}
          </div>

          {/* Caminhões */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-200 text-sm flex items-center gap-2 mb-3">
              <Truck size={14} className="text-brand-400" /> Caminhões ({caminhoes.length})
            </h2>
            {caminhoes.length === 0 ? (
              <p className="text-xs text-slate-600">Nenhum caminhão vinculado</p>
            ) : (
              <div className="space-y-2">
                {caminhoes.map(c => (
                  <Link key={c.id} href={`/dashboard/caminhoes/${c.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors">
                    <div>
                      <div className="font-mono text-sm font-bold text-brand-400">{c.placa}</div>
                      <div className="text-xs text-slate-500">{c.marca} {c.modelo} {c.ano}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* OS History */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h2 className="font-bold text-slate-200 text-sm flex items-center gap-2 mb-4">
              <ClipboardList size={14} className="text-brand-400" /> Histórico de Ordens ({ordens.length})
            </h2>
            {ordens.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">Nenhuma OS encontrada</div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>OS</th>
                      <th>Data</th>
                      <th>Placa</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordens.map(os => {
                      const colors = getStatusColor(os.status_pagamento)
                      return (
                        <tr key={os.id}>
                          <td>
                            <Link href={`/dashboard/ordens/${os.id}`}
                              className="font-mono text-brand-400 hover:text-brand-300 text-xs">
                              #{String(os.numero).padStart(4, '0')}
                            </Link>
                          </td>
                          <td className="text-slate-500 text-xs">{formatDate(os.data_abertura)}</td>
                          <td className="font-mono text-xs text-slate-400">
                            {(os as any).caminhoes?.placa || '-'}
                          </td>
                          <td className="font-semibold">{formatCurrency(os.valor_total)}</td>
                          <td>
                            <span className={clsx('status-badge', colors.bg, colors.text, colors.border)}>
                              {getStatusLabel(os.status_pagamento)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ClienteModal
          cliente={cliente}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchData() }}
        />
      )}
    </div>
  )
}
