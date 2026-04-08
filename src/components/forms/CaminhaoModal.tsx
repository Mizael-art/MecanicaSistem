'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Caminhao, Cliente } from '@/types'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  caminhao?: Caminhao | null
  onClose: () => void
  onSave: () => void
}

export function CaminhaoModal({ caminhao, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [form, setForm] = useState({
    cliente_id: caminhao?.cliente_id || '',
    placa: caminhao?.placa || '',
    marca: caminhao?.marca || '',
    modelo: caminhao?.modelo || '',
    ano: caminhao?.ano ? String(caminhao.ano) : '',
    observacoes: caminhao?.observacoes || '',
  })

  useEffect(() => {
    supabase.from('clientes').select('*').order('nome').then(({ data }) => setClientes(data || []))
  }, [])

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  const handleSave = async () => {
    if (!form.cliente_id) { toast.error('Selecione o cliente'); return }
    if (!form.placa) { toast.error('Placa é obrigatória'); return }
    if (!form.marca || !form.modelo) { toast.error('Marca e modelo são obrigatórios'); return }
    setSaving(true)
    const payload = {
      cliente_id: form.cliente_id,
      placa: form.placa.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      marca: form.marca,
      modelo: form.modelo,
      ano: form.ano ? parseInt(form.ano) : null,
      observacoes: form.observacoes || null,
    }
    const { error } = caminhao?.id
      ? await supabase.from('caminhoes').update(payload).eq('id', caminhao.id)
      : await supabase.from('caminhoes').insert(payload)
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success(caminhao ? 'Caminhão atualizado!' : 'Caminhão cadastrado!')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-white">
          <h2 className="font-bold text-white">{caminhao ? 'Editar Caminhão' : 'Novo Caminhão'}</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Empresa / Cliente *</label>
            <select className="input-field" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">Selecione o cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Placa *</label>
            <input className="input-field font-mono uppercase tracking-widest text-lg" value={form.placa}
              onChange={e => set('placa', e.target.value.toUpperCase())} placeholder="ABC-1234" maxLength={8} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Marca *</label>
              <input className="input-field" value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="Volvo, Scania..." />
            </div>
            <div>
              <label className="label">Modelo *</label>
              <input className="input-field" value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="FH 460..." />
            </div>
            <div>
              <label className="label">Ano</label>
              <input type="number" className="input-field" value={form.ano}
                onChange={e => set('ano', e.target.value)} placeholder="2020" min="1980" max="2030" />
            </div>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input-field resize-none" rows={2} value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)} placeholder="Características especiais, cor, etc." />
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
