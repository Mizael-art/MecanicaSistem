'use client'
import { useState, useEffect } from 'react'
import { supabase, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/supabase'
import { OrdemServico, StatusPagamento } from '@/types'
import { Plus, Search, ClipboardList, ChevronRight, Printer, Trash2, Edit } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

export default function OrdensPage() {
  const [ordens, setOrdens]       = useState<OrdemServico[]>([])
  const [filtered, setFiltered]   = useState<OrdemServico[]>([])
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState<StatusPagamento | 'all'>('all')
  const [loading, setLoading]     = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchOrdens = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ordens_servico')
      .select('*, clientes(nome), caminhoes(placa, modelo)')
      .order('created_at', { ascending: false })
    setOrdens(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrdens() }, [])

  useEffect(() => {
    let result = ordens
    if (statusFilter !== 'all') result = result.filter(o => o.status_pagamento === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(o =>
        String(o.numero).includes(q) ||
        (o as any).clientes?.nome?.toLowerCase().includes(q) ||
        (o as any).caminhoes?.placa?.toLowerCase().includes(q) ||
        o.descricao_avulsa?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [ordens, statusFilter, search])

  const handleDelete = async (os: any) => {
    const label = `OS #${String(os.numero).padStart(4, '0')}`
    if (!confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return
    setDeletingId(os.id)
    const { error } = await supabase.from('ordens_servico').delete().eq('id', os.id)
    if (error) {
      toast.error('Erro ao excluir: ' + error.message)
    } else {
      toast.success(`${label} excluída`)
      setOrdens(prev => prev.filter(o => o.id !== os.id))
    }
    setDeletingId(null)
  }

  const counts = {
    all:      ordens.length,
    pago:     ordens.filter(o => o.status_pagamento === 'pago').length,
    pendente: ordens.filter(o => o.status_pagamento === 'pendente').length,
    atrasado: ordens.filter(o => o.status_pagamento === 'atrasado').length,
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList size={22} className="text-brand-400" />
            Ordens de Serviço
          </h1>
          <p className="page-subtitle">
            {filtered.length !== ordens.length ? `${filtered.length} de ${ordens.length}` : ordens.length} ordens
          </p>
        </div>
        <Link href="/dashboard/ordens/nova" className="btn-primary w-full sm:w-auto">
          <Plus size={16} /> Nova OS
        </Link>
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-field pl-9" placeholder="Buscar por nº, cliente, placa ou descrição..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {([
            { key: 'all',      label: 'Todas',     count: counts.all },
            { key: 'pendente', label: 'Pendentes', count: counts.pendente },
            { key: 'atrasado', label: 'Atrasadas', count: counts.atrasado },
            { key: 'pago',     label: 'Pagas',     count: counts.pago },
          ] as const).map(({ key, label, count }) => (
            <button key={key} onClick={() => setStatus(key)}
              className={clsx(
                'px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors',
                statusFilter === key
                  ? 'bg-brand-600 text-white border-brand-500'
                  : 'bg-surface-700 text-slate-400 border-white hover:text-white'
              )}>
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-14 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <ClipboardList size={36} className="empty-state-icon mx-auto" />
          <p className="text-slate-500 mt-2">Nenhuma ordem encontrada</p>
          <Link href="/dashboard/ordens/nova" className="btn-primary mt-4 mx-auto w-fit">
            <Plus size={15} /> Criar primeira OS
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="card overflow-hidden hide-mobile">
            <table className="table">
              <thead>
                <tr>
                  <th>Nº OS</th>
                  <th>Data</th>
                  <th>Cliente / Descrição</th>
                  <th>Placa</th>
                  <th>Vencimento</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(os => {
                  const colors      = getStatusColor(os.status_pagamento)
                  const displayNome = (os as any).clientes?.nome || os.descricao_avulsa || '—'
                  const placa       = (os as any).caminhoes?.placa || '—'
                  const isDeleting  = deletingId === os.id
                  return (
                    <tr key={os.id} className={clsx(isDeleting && 'opacity-40 pointer-events-none')}>
                      <td>
                        <span className="font-mono text-brand-400 font-bold text-xs">
                          #{String(os.numero).padStart(4, '0')}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs">{formatDate(os.data_abertura)}</td>
                      <td className="max-w-[180px] truncate font-medium text-slate-200">{displayNome}</td>
                      <td className="font-mono text-xs text-slate-400">{placa}</td>
                      <td className="text-xs text-slate-500">
                        {os.data_vencimento ? formatDate(os.data_vencimento) : '—'}
                      </td>
                      <td className="font-bold text-slate-100">{formatCurrency(os.valor_total)}</td>
                      <td>
                        <span className={clsx('status-badge', colors.bg, colors.text, colors.border)}>
                          {getStatusLabel(os.status_pagamento)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-0.5 justify-end">
                          <Link href={`/prints/${os.id}`} target="_blank"
                            className="btn-ghost p-1.5" title="Imprimir">
                            <Printer size={13} />
                          </Link>
                          <Link href={`/dashboard/ordens/${os.id}`} className="btn-ghost p-1.5" title="Editar OS">
                            <Edit size={13} className="text-brand-400" />
                          </Link>
                          <button onClick={() => handleDelete(os)}
                            className="btn-ghost p-1.5 hover:text-red-400 transition-colors" title="Excluir OS">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="show-mobile mobile-card-list">
            {filtered.map(os => {
              const colors      = getStatusColor(os.status_pagamento)
              const displayNome = (os as any).clientes?.nome || os.descricao_avulsa || '—'
              const placa       = (os as any).caminhoes?.placa
              const isDeleting  = deletingId === os.id
              return (
                <div key={os.id} className={clsx('mobile-card', isDeleting && 'opacity-40')}>
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/dashboard/ordens/${os.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-brand-400 font-bold text-sm">
                          #{String(os.numero).padStart(4, '0')}
                        </span>
                        <span className={clsx('status-badge', colors.bg, colors.text, colors.border)}>
                          {getStatusLabel(os.status_pagamento)}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-200 mt-1 truncate">{displayNome}</div>
                      {placa && (
                        <span className="font-mono text-xs text-slate-500 bg-surface-800 px-2 py-0.5 rounded mt-1 inline-block">
                          {placa}
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="text-right mr-1">
                        <div className="text-base font-bold text-white">{formatCurrency(os.valor_total)}</div>
                        <div className="text-xs text-slate-500">{formatDate(os.data_abertura)}</div>
                      </div>
                      <Link href={`/dashboard/ordens/${os.id}`} className="btn-ghost p-1.5" title="Editar">
                        <Edit size={13} className="text-brand-400"/>
                      </Link>
                      <Link href={`/prints/${os.id}`} target="_blank" className="btn-ghost p-1.5">
                        <Printer size={13} />
                      </Link>
                      <button onClick={() => handleDelete(os)}
                        className="btn-ghost p-1.5 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
