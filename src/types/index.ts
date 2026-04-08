// ============================================================
// MECÂNICA PAI E FILHO - TypeScript Types v3 (ERP Completo)
// ============================================================

export type StatusPagamento  = 'pago' | 'pendente' | 'atrasado'
export type Categoria        = 'peca' | 'servico'
export type FormaPagamento   = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'boleto' | 'transferencia' | 'misto'

// ── Entidades base ──────────────────────────────────────────

export interface Cliente {
  id: string; nome: string; cnpj?: string; telefone?: string
  email?: string; endereco?: string; observacoes?: string
  created_at?: string; updated_at?: string
}

export interface Caminhao {
  id: string; cliente_id: string; placa: string; marca: string
  modelo: string; ano?: number; observacoes?: string
  created_at?: string; updated_at?: string; clientes?: Cliente
}

export interface ItemServico {
  id: string; nome: string; descricao?: string
  categoria: Categoria; preco_padrao: number
  codigo_interno?: string; ativo: boolean
  estoque_atual: number; estoque_minimo: number
  custo_medio: number; unidade: string
  created_at?: string; updated_at?: string
}

// ── Ordens de Serviço ───────────────────────────────────────

export interface OrdemServico {
  id: string; numero: number
  cliente_id?: string | null; caminhao_id?: string | null
  avulsa: boolean; descricao_avulsa?: string | null
  valor_manual?: number | null
  data_abertura: string; data_vencimento?: string | null
  data_pagamento?: string | null; observacoes?: string | null
  valor_total: number; status_pagamento: StatusPagamento
  created_at?: string; updated_at?: string
  clientes?: Cliente | null; caminhoes?: Caminhao | null
  ordem_itens?: OrdemItem[]
}

export interface OrdemItem {
  id: string; ordem_id: string; item_id?: string | null
  descricao: string; categoria: Categoria
  quantidade: number; preco_unitario: number; subtotal: number
  created_at: string; itens_servicos?: ItemServico
}

export interface OrdemServicoForm {
  avulsa: boolean; descricao_avulsa?: string; valor_manual?: number
  cliente_id?: string; caminhao_id?: string
  data_abertura: string; data_vencimento?: string
  observacoes?: string; status_pagamento: StatusPagamento
  itens: OrdemItemForm[]
}

export interface OrdemItemForm {
  item_id?: string; descricao: string; categoria: Categoria
  quantidade: number; preco_unitario: number
}

// ── Orçamentos ──────────────────────────────────────────────

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'reprovado' | 'convertido'

export interface Orcamento {
  id: string; numero: number
  cliente_id?: string | null; caminhao_id?: string | null
  descricao?: string | null; data_emissao: string
  data_validade?: string | null; observacoes?: string | null
  valor_total: number; status: StatusOrcamento
  os_id?: string | null
  created_at?: string; updated_at?: string
  clientes?: Cliente | null; caminhoes?: Caminhao | null
  itens_orcamento?: ItemOrcamento[]
}

export interface ItemOrcamento {
  id: string; orcamento_id: string; item_id?: string | null
  descricao: string; categoria: Categoria
  quantidade: number; preco_unitario: number; subtotal: number
  created_at: string
}

export interface OrcamentoForm {
  cliente_id?: string; caminhao_id?: string
  descricao?: string; data_emissao: string
  data_validade?: string; observacoes?: string
  status: StatusOrcamento; itens: OrdemItemForm[]
}

// ── Financeiro ──────────────────────────────────────────────

export interface CategoriaFinanceira {
  id: string; nome: string; tipo: 'receita' | 'despesa' | 'ambos'; cor: string
}

export interface ContaReceber {
  id: string; descricao: string
  cliente_id?: string | null; os_id?: string | null
  categoria_id?: string | null
  valor_total: number; parcelas: number
  data_emissao: string; observacoes?: string | null
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  created_at?: string; updated_at?: string
  clientes?: Cliente | null; parcelas_receber?: ParcelaReceber[]
}

export interface ParcelaReceber {
  id: string; conta_id: string; numero: number; valor: number
  data_vencimento: string; data_pagamento?: string | null
  status: 'pendente' | 'pago' | 'atrasado'
  forma_pagamento?: FormaPagamento | null; observacoes?: string | null
  created_at: string
}

export interface ContaPagar {
  id: string; descricao: string; fornecedor?: string | null
  categoria_id?: string | null; valor_total: number; parcelas: number
  data_emissao: string; observacoes?: string | null
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  created_at?: string; updated_at?: string
  parcelas_pagar?: ParcelaPagar[]
}

export interface ParcelaPagar {
  id: string; conta_id: string; numero: number; valor: number
  data_vencimento: string; data_pagamento?: string | null
  status: 'pendente' | 'pago' | 'atrasado'
  forma_pagamento?: string | null; observacoes?: string | null
  created_at: string
}

// ── Caixa ───────────────────────────────────────────────────

export interface CaixaSessao {
  id: string; data_abertura: string; data_fechamento?: string | null
  saldo_inicial: number; saldo_final?: number | null
  total_entradas: number; total_saidas: number
  status: 'aberto' | 'fechado'; observacoes?: string | null
  created_at: string
}

export interface MovimentacaoCaixa {
  id: string; sessao_id: string; tipo: 'entrada' | 'saida'
  valor: number; descricao: string; forma_pagamento: FormaPagamento
  ref_id?: string | null; ref_tipo?: string | null; created_at: string
}

// ── PDV / Vendas ────────────────────────────────────────────

export interface Venda {
  id: string; numero: number
  cliente_id?: string | null; sessao_caixa_id?: string | null
  data_venda: string; valor_total: number
  desconto: number; valor_pago: number
  forma_pagamento: FormaPagamento
  status: 'aberta' | 'finalizada' | 'cancelada'
  observacoes?: string | null; created_at: string
  clientes?: Cliente | null; itens_venda?: ItemVenda[]
}

export interface ItemVenda {
  id: string; venda_id: string; item_id?: string | null
  descricao: string; categoria: Categoria
  quantidade: number; preco_unitario: number; subtotal: number
  created_at: string
}

// ── Notas Fiscais ───────────────────────────────────────────

export type TipoNota   = 'nfe' | 'nfce' | 'nfse'
export type StatusNota = 'rascunho' | 'enviada' | 'autorizada' | 'cancelada' | 'rejeitada'

export interface NotaFiscal {
  id: string; numero?: string | null; serie: string
  tipo: TipoNota; natureza_op: string
  cliente_id?: string | null; os_id?: string | null; venda_id?: string | null
  valor_total: number; chave_acesso?: string | null
  xml_path?: string | null; pdf_path?: string | null
  status: StatusNota; protocolo?: string | null
  data_emissao?: string | null; data_autorizacao?: string | null
  motivo_cancelamento?: string | null; dados_emissao?: any
  created_at?: string; updated_at?: string
  clientes?: Cliente | null
}

// ── Estoque ─────────────────────────────────────────────────

export interface MovimentacaoEstoque {
  id: string; item_id: string; tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number; custo_unitario: number; motivo?: string | null
  ref_id?: string | null; ref_tipo?: string | null
  saldo_apos?: number | null; usuario: string; created_at: string
  itens_servicos?: ItemServico
}

// ── Despesas (legado) ────────────────────────────────────────

export interface Despesa {
  id: string; nome: string; valor: number; data: string
  categoria: string; observacao?: string
  created_at?: string; updated_at?: string
}

// ── Form types ───────────────────────────────────────────────

export type ClienteForm     = Omit<Cliente, 'id' | 'created_at' | 'updated_at'>
export type CaminhaoForm    = Omit<Caminhao, 'id' | 'created_at' | 'updated_at' | 'clientes'>
export type ItemServicoForm = Omit<ItemServico, 'id' | 'created_at' | 'updated_at'>
export type DespesaForm     = Omit<Despesa, 'id' | 'created_at' | 'updated_at'>

// ── Dashboard ────────────────────────────────────────────────

export interface ResumoFinanceiro {
  total_recebido: number; total_pendente: number; total_atrasado: number
  total_despesas: number; lucro_liquido: number
  count_pagas: number; count_pendentes: number; count_atrasadas: number
}

export interface FiltroData { inicio: string; fim: string }
