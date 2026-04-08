'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Cliente } from '@/types'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  cliente?: Cliente | null
  onClose: () => void
  onSave: () => void
}

export function ClienteModal({ cliente, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: cliente?.nome || '',
    cnpj: cliente?.cnpj || '',
    telefone: cliente?.telefone || '',
    email: cliente?.email || '',
    endereco: cliente?.endereco || '',
    observacoes: cliente?.observacoes || '',
  })

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      cnpj: form.cnpj || null,
      telefone: form.telefone || null,
      email: form.email || null,
      endereco: form.endereco || null,
      observacoes: form.observacoes || null,
    }
    const { error } = cliente?.id
      ? await supabase.from('clientes').update(payload).eq('id', cliente.id)
      : await supabase.from('clientes').insert(payload)
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success(cliente ? 'Cliente atualizado!' : 'Cliente cadastrado!')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-white">
          <h2 className="font-bold text-white">{cliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Nome / Razão Social *</label>
            <input className="input-field" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">CNPJ</label>
              <input className="input-field font-mono" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input-field" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(41) 99999-9999" />
            </div>
          </div>
          <div>
            <label className="label">E-mail</label>
            <input type="email" className="input-field" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@empresa.com.br" />
          </div>
          <div>
            <label className="label">Endereço</label>
            <input className="input-field" value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, cidade..." />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input-field resize-none" rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Informações adicionais..." />
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
