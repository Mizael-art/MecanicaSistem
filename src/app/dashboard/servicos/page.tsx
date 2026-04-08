'use client'
import { useState, useEffect } from 'react'
import { supabase, formatCurrency } from '@/lib/supabase'
import { ItemServico } from '@/types'
import { Plus, Search, Package, Wrench, Edit, Trash2, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { ItemServicoModal } from '@/components/forms/ItemServicoModal'
import { clsx } from 'clsx'

export default function ServicosPage() {
  const [items, setItems] = useState<ItemServico[]>([])
  const [filtered, setFiltered] = useState<ItemServico[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'peca' | 'servico'>('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ItemServico | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase.from('itens_servicos').select('*').order('categoria').order('nome')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  useEffect(() => {
    let result = items
    if (filter !== 'all') result = result.filter(i => i.categoria === filter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(i => i.nome.toLowerCase().includes(q) || i.codigo_interno?.toLowerCase().includes(q))
    }
    setFiltered(result)
  }, [items, filter, search])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este item?')) return
    const { error } = await supabase.from('itens_servicos').delete().eq('id', id)
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Item excluído')
    fetchItems()
  }

  const pecas = items.filter(i => i.categoria === 'peca')
  const servicos = items.filter(i => i.categoria === 'servico')

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Package size={24} className="text-brand-400" /> Peças & Serviços
          </h1>
          <p className="page-subtitle">{pecas.length} peças · {servicos.length} serviços cadastrados</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} /> Novo Item
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-field pl-10" placeholder="Buscar por nome ou código..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['all', 'peca', 'servico'] as const).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                filter === f
                  ? 'bg-brand-600 text-white border-brand-500'
                  : 'bg-surface-600 text-slate-400 border-white hover:text-white'
              )}>
              {f === 'all' ? 'Todos' : f === 'peca' ? 'Peças' : 'Serviços'}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Package size={40} className="mx-auto mb-3 text-slate-700" />
          <p className="text-slate-500">Nenhum item encontrado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Código</th>
                <th>Preço Padrão</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={clsx(
                        'w-7 h-7 rounded-lg flex items-center justify-center',
                        item.categoria === 'peca'
                          ? 'bg-brand-500-15 text-brand-400'
                          : 'bg-purple-500/15 text-purple-400'
                      )}>
                        {item.categoria === 'peca' ? <Package size={13} /> : <Wrench size={13} />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">{item.nome}</div>
                        {item.descricao && (
                          <div className="text-xs text-slate-600 mt-0.5 max-w-xs truncate">{item.descricao}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={clsx(
                      'status-badge',
                      item.categoria === 'peca'
                        ? 'bg-brand-500-10 text-brand-400 border-brand-500-20'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    )}>
                      {item.categoria === 'peca' ? 'Peça' : 'Serviço'}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-500">
                    {item.codigo_interno ? (
                      <span className="flex items-center gap-1"><Tag size={10} /> {item.codigo_interno}</span>
                    ) : '-'}
                  </td>
                  <td className="font-semibold text-slate-200">{formatCurrency(item.preco_padrao)}</td>
                  <td>
                    <span className={clsx(
                      'status-badge text-[10px]',
                      item.ativo
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                    )}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { setEditing(item); setShowModal(true) }} className="btn-ghost p-2">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="btn-ghost p-2 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ItemServicoModal
          item={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={() => { setShowModal(false); setEditing(null); fetchItems() }}
        />
      )}
    </div>
  )
}
