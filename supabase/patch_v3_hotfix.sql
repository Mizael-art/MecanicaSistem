-- ============================================================
-- PATCH v3 HOTFIX — Mecânica Pai e Filho
-- Execute este script APÓS patch_v3.sql
-- Correções baseadas na auditoria completa do sistema
-- ============================================================

-- ── BUG-02: Garantir no máximo 1 caixa aberto por vez ───────
-- Impede duplo-clique ou múltiplas abas criarem sessões duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_caixa_sessao_aberta_unica
  ON caixa_sessoes (status)
  WHERE status = 'aberto';

-- ── BD-01/BD-04: Constraints de integridade ─────────────────
-- Estoque não pode ser negativo no banco
ALTER TABLE itens_servicos
  DROP CONSTRAINT IF EXISTS chk_estoque_nao_negativo;
ALTER TABLE itens_servicos
  ADD CONSTRAINT chk_estoque_nao_negativo
  CHECK (estoque_atual >= 0);

-- Valores financeiros devem ser positivos
ALTER TABLE movimentacoes_caixa
  DROP CONSTRAINT IF EXISTS chk_movcx_valor_positivo;
ALTER TABLE movimentacoes_caixa
  ADD CONSTRAINT chk_movcx_valor_positivo CHECK (valor > 0);

ALTER TABLE ordem_itens
  DROP CONSTRAINT IF EXISTS chk_oi_quantidade_positiva;
ALTER TABLE ordem_itens
  ADD CONSTRAINT chk_oi_quantidade_positiva CHECK (quantidade > 0);

-- ── BD-02: Índice composto para relatórios de estoque ────────
CREATE INDEX IF NOT EXISTS idx_movest_item_created
  ON movimentacoes_estoque (item_id, created_at DESC);

-- ── BD-03: Índices parciais para parcelas pendentes ──────────
-- Crítico para query "parcelas vencidas hoje"
CREATE INDEX IF NOT EXISTS idx_parcr_status_venc_pendente
  ON parcelas_receber (data_vencimento)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_parcp_status_venc_pendente
  ON parcelas_pagar (data_vencimento)
  WHERE status = 'pendente';

-- ── BD-05: Índices em data_emissao ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_cr_data_emissao ON contas_receber (data_emissao);
CREATE INDEX IF NOT EXISTS idx_cp_data_emissao ON contas_pagar (data_emissao);

-- ── BD-06: Índice em created_at das movimentacoes_caixa ──────
CREATE INDEX IF NOT EXISTS idx_movcx_created ON movimentacoes_caixa (created_at);

-- ── BD-07: Fix trigger recalcular_total_os ───────────────────
-- O trigger original ignorava valor_manual em OS avulsas sem itens
-- Agora: se tem itens, usa soma dos itens; se sem itens e tem valor_manual, mantém valor_manual
CREATE OR REPLACE FUNCTION recalcular_total_os()
RETURNS TRIGGER AS $$
DECLARE
  total_itens NUMERIC(12,2);
  vm NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO total_itens
  FROM ordem_itens
  WHERE ordem_id = COALESCE(NEW.ordem_id, OLD.ordem_id);

  SELECT valor_manual INTO vm
  FROM ordens_servico
  WHERE id = COALESCE(NEW.ordem_id, OLD.ordem_id);

  -- Se tem itens, sempre usar soma; se sem itens, manter valor_manual (ou 0)
  UPDATE ordens_servico
  SET valor_total = CASE WHEN total_itens > 0 THEN total_itens ELSE COALESCE(vm, 0) END
  WHERE id = COALESCE(NEW.ordem_id, OLD.ordem_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── BUG-04: Função para auto-marcar atrasados ────────────────
-- Pode ser chamada via Supabase Edge Functions com cron diário
CREATE OR REPLACE FUNCTION marcar_registros_atrasados()
RETURNS void AS $$
BEGIN
  -- Ordens de serviço vencidas
  UPDATE ordens_servico
  SET status_pagamento = 'atrasado'
  WHERE status_pagamento = 'pendente'
    AND data_vencimento IS NOT NULL
    AND data_vencimento < CURRENT_DATE;

  -- Parcelas a receber vencidas
  UPDATE parcelas_receber
  SET status = 'atrasado'
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;

  -- Parcelas a pagar vencidas
  UPDATE parcelas_pagar
  SET status = 'atrasado'
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Executar imediatamente ao aplicar o patch
SELECT marcar_registros_atrasados();

-- ── Índices de performance adicionais ───────────────────────
CREATE INDEX IF NOT EXISTS idx_os_cliente_status
  ON ordens_servico (cliente_id, status_pagamento)
  WHERE cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_sessao
  ON vendas (sessao_caixa_id)
  WHERE sessao_caixa_id IS NOT NULL;

