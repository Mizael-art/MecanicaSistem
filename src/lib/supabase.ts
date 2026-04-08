import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helpers de formatação
export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatDate = (date: string): string => {
  if (!date) return '-'
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
}

export const formatPlaca = (placa: string): string => {
  const clean = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (clean.length === 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`
  return clean
}

export const formatCNPJ = (cnpj: string): string => {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return cnpj
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pago': return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' }
    case 'pendente': return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' }
    case 'atrasado': return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' }
    default: return { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' }
  }
}

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pago': return 'Pago'
    case 'pendente': return 'Pendente'
    case 'atrasado': return 'Atrasado'
    default: return status
  }
}

// Calcular início/fim de períodos
export const getPeriodDates = (period: 'today' | 'week' | 'month' | 'custom') => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  if (period === 'today') {
    return { inicio: today, fim: today }
  }
  if (period === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    return { inicio: start.toISOString().split('T')[0], fim: today }
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { inicio: start.toISOString().split('T')[0], fim: today }
  }
  return { inicio: today, fim: today }
}

// BUG-04 FIX: Auto-sync overdue status for OS and parcelas
// Call this on dashboard/financeiro load to keep statuses accurate
export const sincronizarAtrasados = async () => {
  const hoje = new Date().toISOString().split('T')[0]
  await Promise.all([
    supabase
      .from('ordens_servico')
      .update({ status_pagamento: 'atrasado' })
      .eq('status_pagamento', 'pendente')
      .lt('data_vencimento', hoje),
    supabase
      .from('parcelas_receber')
      .update({ status: 'atrasado' })
      .eq('status', 'pendente')
      .lt('data_vencimento', hoje),
    supabase
      .from('parcelas_pagar')
      .update({ status: 'atrasado' })
      .eq('status', 'pendente')
      .lt('data_vencimento', hoje),
  ])
}

// PERF-03 FIX: stable useCallback dependency helper
export const formatDateLocal = (date: string, timezone = 'America/Sao_Paulo'): string => {
  if (!date) return '-'
  const d = new Date(date.includes('T') ? date : date + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}
