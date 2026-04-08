'use client'
import { useState, useEffect } from 'react'
import { supabase, formatPlaca } from '@/lib/supabase'
import { Caminhao, Cliente } from '@/types'
import { Plus, Search, Truck, ChevronRight, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CaminhaoModal } from '@/components/forms/CaminhaoModal'

type CaminhaoWithCliente = Caminhao & { clientes: Cliente }

export default function CaminhoesPage() {
  const [caminhoes, setCaminhoes] = useState<CaminhaoWithCliente[]>([])
  const [filtered, setFiltered]   = useState<CaminhaoWithCliente[]>([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Caminhao | null>(null)

  const fetchCaminhoes = async () => {
    setLoading(true)
    const { data } = await supabase.from('caminhoes').select('*, clientes(*)').order('placa')
    setCaminhoes(data as CaminhaoWithCliente[] || [])
    setFiltered(data as CaminhaoWithCliente[] || [])
    setLoading(false)
  }

  useEffect(() => { fetchCaminhoes() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(caminhoes.filter(c =>
      c.placa.toLowerCase().includes(q) ||
      c.marca.toLowerCase().includes(q) ||
      c.modelo.toLowerCase().includes(q) ||
      c.clientes?.nome?.toLowerCase().includes(q)
    ))
  }, [search, caminhoes])

  const handleDelete = async (id: string, placa: string) => {
    const { count } = await supabase
      .from('ordens_servico').select('id', { count: 'exact', head: true }).eq('caminhao_id', id)
    if ((count || 0) > 0) {
      toast.error(`Não é possível excluir o caminhão ${placa} — possui ${count} OS vinculada${count! > 1 ? 's' : ''}.`, { duration: 5000, icon: '⚠️' })
      return
    }
    if (!confirm(`Excluir o caminhão ${placa}? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('caminhoes').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir: ' + error.message); return }
    toast.success('Caminhão excluído')
    fetchCaminhoes()
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Truck size={22} className="text-brand-400" /> Caminhões
          </h1>
          <p className="page-subtitle">{caminhoes.length} veículos cadastrados</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="btn-primary w-full sm:w-auto">
          <Plus size={16} /> Novo Caminhão
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input-field pl-9" placeholder="Buscar por placa, marca, modelo ou empresa..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Truck size={36} className="empty-state-icon mx-auto" />
          <p className="text-slate-500 mt-2">Nenhum caminhão encontrado</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="card overflow-hidden hide-mobile">
            <table className="table">
              <thead>
                <tr><th>Placa</th><th>Veículo</th><th>Ano</th><th>Empresa</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-mono font-bold text-white text-sm tracking-widest">
                        {formatPlaca(c.placa)}
                      </span>
                    </td>
                    <td className="text-slate-300">{c.marca} {c.modelo}</td>
                    <td className="text-slate-500 text-sm">{c.ano || '—'}</td>
                    <td className="text-brand-400 text-sm">{c.clientes?.nome || '—'}</td>
                    <td>
                      <div className="flex items-center gap-0.5 justify-end">
                        <button onClick={() => { setEditing(c); setShowModal(true) }} className="btn-ghost p-1.5">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => handleDelete(c.id, c.placa)} className="btn-ghost p-1.5 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                        <Link href={`/dashboard/caminhoes/${c.id}`} className="btn-ghost p-1.5">
                          <ChevronRight size={14} className="text-brand-400" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="show-mobile mobile-card-list">
            {filtered.map(c => (
              <div key={c.id} className="mobile-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-600-15 border border-brand-500-20
                                    flex items-center justify-center flex-shrink-0">
                      <Truck size={16} className="text-brand-400" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-white tracking-widest">
                        {formatPlaca(c.placa)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {c.marca} {c.modelo} {c.ano ? `· ${c.ano}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(c); setShowModal(true) }} className="btn-ghost p-2">
                      <Edit size={14} />
                    </button>
                    <Link href={`/dashboard/caminhoes/${c.id}`} className="btn-ghost p-2">
                      <ChevronRight size={15} className="text-brand-400" />
                    </Link>
                  </div>
                </div>
                {c.clientes?.nome && (
                  <div className="mt-2 pt-2 border-t border-white text-xs text-brand-400">
                    {c.clientes.nome}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <CaminhaoModal
          caminhao={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={() => { setShowModal(false); setEditing(null); fetchCaminhoes() }}
        />
      )}
    </div>
  )
}
