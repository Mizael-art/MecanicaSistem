'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIAS = [
  'Peças', 'Combustível', 'Aluguel', 'Salário', 'Energia',
  'Água', 'Internet', 'Ferramentas', 'Impostos', 'Outros'
]

interface Props {
  onClose: () => void
  onSave: () => void
}

export function DespesaModal({ onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    categoria: 'Outros',
    observacao: '',
  })

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    if (!form.valor || parseFloat(form.valor) <= 0) { toast.error('Informe um valor válido'); return }
    setSaving(true)
    const { error } = await supabase.from('despesas').insert({
      nome: form.nome.trim(),
      valor: parseFloat(form.valor),
      data: form.data,
      categoria: form.categoria,
      observacao: form.observacao || null,
    })
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success('Despesa registrada!')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-white">
          <h2 className="font-bold text-white">Registrar Despesa</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Descrição *</label>
            <input className="input-field" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Compra de óleo lubrificante" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Valor (R$) *</label>
              <input type="number" min="0.01" step="0.01" className="input-field" value={form.valor}
                onChange={e => set('valor', e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input-field" value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="input-field" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Observação</label>
            <textarea className="input-field resize-none" rows={2} value={form.observacao}
              onChange={e => set('observacao', e.target.value)} placeholder="Detalhes adicionais..." />
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
