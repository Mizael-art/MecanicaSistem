'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ItemServico } from '@/types'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  item?: ItemServico | null
  onClose: () => void
  onSave: () => void
}

export function ItemServicoModal({ item, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: item?.nome || '',
    descricao: item?.descricao || '',
    categoria: item?.categoria || 'servico',
    preco_padrao: item?.preco_padrao ? String(item.preco_padrao) : '',
    codigo_interno: item?.codigo_interno || '',
    ativo: item?.ativo ?? true,
  })

  const set = (field: string, value: string | boolean) => setForm(p => ({ ...p, [field]: value }))

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao || null,
      categoria: form.categoria,
      preco_padrao: parseFloat(form.preco_padrao) || 0,
      codigo_interno: form.codigo_interno || null,
      ativo: form.ativo,
    }
    const { error } = item?.id
      ? await supabase.from('itens_servicos').update(payload).eq('id', item.id)
      : await supabase.from('itens_servicos').insert(payload)
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success(item ? 'Item atualizado!' : 'Item cadastrado!')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-white">
          <h2 className="font-bold text-white">{item ? 'Editar Item' : 'Novo Item / Serviço'}</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Categoria *</label>
            <div className="flex gap-3">
              {[
                { value: 'servico', label: '🔧 Serviço / Mão de obra' },
                { value: 'peca', label: '📦 Peça / Material' },
              ].map(opt => (
                <button key={opt.value} onClick={() => set('categoria', opt.value)}
                  className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
                    form.categoria === opt.value
                      ? 'bg-brand-600 border-brand-500 text-white'
                      : 'bg-surface-800 border-white text-slate-400 hover:text-white'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Nome *</label>
            <input className="input-field" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Troca de Óleo Motor" />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea className="input-field resize-none" rows={2} value={form.descricao}
              onChange={e => set('descricao', e.target.value)} placeholder="Descrição detalhada..." />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Preço Padrão (R$) *</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.preco_padrao}
                onChange={e => set('preco_padrao', e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="label">Código Interno</label>
              <input className="input-field font-mono" value={form.codigo_interno}
                onChange={e => set('codigo_interno', e.target.value)} placeholder="COD-001" />
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-surface-500 peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
            <span className="text-sm text-slate-400">Item ativo (disponível para novas OS)</span>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-white">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            <Save size={15} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
