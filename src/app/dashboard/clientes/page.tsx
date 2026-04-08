'use client'
import { useState, useEffect } from 'react'
import { supabase, formatCNPJ } from '@/lib/supabase'
import { Cliente } from '@/types'
import { Plus, Search, Users, ChevronRight, Phone, Mail, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ClienteModal } from '@/components/forms/ClienteModal'
import { clsx } from 'clsx'

export default function ClientesPage() {
  const [clientes, setClientes]   = useState<Cliente[]>([])
  const [filtered, setFiltered]   = useState<Cliente[]>([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Cliente | null>(null)

  const fetchClientes = async () => {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(clientes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.cnpj?.includes(q) ||
      c.telefone?.includes(q)
    ))
  }, [search, clientes])

  const handleDelete = async (id: string, nome: string) => {
    // Verificar vínculos antes de deletar — evita erro de FK
    const [osRes, camRes] = await Promise.all([
      supabase.from('ordens_servico').select('id', { count: 'exact', head: true }).eq('cliente_id', id),
      supabase.from('caminhoes').select('id', { count: 'exact', head: true }).eq('cliente_id', id),
    ])
    const totalOS  = osRes.count || 0
    const totalCam = camRes.count || 0
    if (totalOS > 0 || totalCam > 0) {
      const partes = []
      if (totalOS  > 0) partes.push(`${totalOS} OS`)
      if (totalCam > 0) partes.push(`${totalCam} caminhão${totalCam > 1 ? 'ões' : ''}`)
      toast.error(`Não é possível excluir "${nome}" — possui ${partes.join(' e ')} vinculado${partes.length > 1 ? 's' : ''}.`, { duration: 5000, icon: '⚠️' })
      return
    }
    if (!confirm(`Excluir o cliente "${nome}"? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir: ' + error.message); return }
    toast.success('Cliente excluído com sucesso')
    fetchClientes()
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users size={22} className="text-brand-400" /> Clientes
          </h1>
          <p className="page-subtitle">{clientes.length} empresas cadastradas</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="btn-primary w-full sm:w-auto">
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input-field pl-9" placeholder="Buscar por nome, CNPJ ou telefone..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Users size={36} className="empty-state-icon mx-auto" />
          <p className="text-slate-500 mt-2">{search ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}</p>
          {!search && (
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto w-fit">
              <Plus size={15} /> Adicionar primeiro
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="card overflow-hidden hide-mobile">
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>CNPJ</th><th>Telefone</th><th>E-mail</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td className="font-semibold text-slate-200">{c.nome}</td>
                    <td className="font-mono text-xs text-slate-500">{c.cnpj ? formatCNPJ(c.cnpj) : '—'}</td>
                    <td className="text-slate-400 text-sm">{c.telefone || '—'}</td>
                    <td className="text-slate-400 text-sm max-w-[160px] truncate">{c.email || '—'}</td>
                    <td>
                      <div className="flex items-center gap-0.5 justify-end">
                        <button onClick={() => { setEditing(c); setShowModal(true) }} className="btn-ghost p-1.5">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => handleDelete(c.id, c.nome)} className="btn-ghost p-1.5 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                        <Link href={`/dashboard/clientes/${c.id}`} className="btn-ghost p-1.5">
                          <ChevronRight size={14} className="text-brand-400" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="show-mobile mobile-card-list">
            {filtered.map(c => (
              <div key={c.id} className="mobile-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-brand-600-20 border border-brand-500-20
                                    flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-400 font-bold text-sm">
                        {c.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 truncate">{c.nome}</div>
                      {c.cnpj && (
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{formatCNPJ(c.cnpj)}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditing(c); setShowModal(true) }} className="btn-ghost p-2">
                      <Edit size={14} />
                    </button>
                    <Link href={`/dashboard/clientes/${c.id}`} className="btn-ghost p-2">
                      <ChevronRight size={15} className="text-brand-400" />
                    </Link>
                  </div>
                </div>
                {(c.telefone || c.email) && (
                  <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-white">
                    {c.telefone && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone size={10} /> {c.telefone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
                        <Mail size={10} /> {c.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <ClienteModal
          cliente={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={() => { setShowModal(false); setEditing(null); fetchClientes() }}
        />
      )}
    </div>
  )
}
