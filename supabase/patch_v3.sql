-- ============================================================
-- PATCH v3 — ERP Completo — Mecânica Pai e Filho
-- Execute APÓS schema.sql e patch_v2.sql
-- ============================================================

-- ============================================================
-- 1. ADICIONAR CAMPOS DE ESTOQUE NA TABELA itens_servicos
-- ============================================================
ALTER TABLE itens_servicos
  ADD COLUMN IF NOT EXISTS estoque_atual    NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_minimo   NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_medio      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unidade          TEXT DEFAULT 'un';

-- ============================================================
-- 2. MOVIMENTAÇÕES DE ESTOQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         UUID NOT NULL REFERENCES itens_servicos(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade      NUMERIC(10,3) NOT NULL,
  custo_unitario  NUMERIC(12,2) DEFAULT 0,
  motivo          TEXT,           -- 'venda','compra','os','ajuste','devolucao'
  ref_id          UUID,           -- id da OS, venda ou compra de origem
  ref_tipo        TEXT,           -- 'os','venda','compra'
  saldo_apos      NUMERIC(10,3),  -- saldo calculado após o movimento
  usuario         TEXT DEFAULT 'sistema',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_movest_item_id   ON movimentacoes_estoque(item_id);
CREATE INDEX idx_movest_tipo      ON movimentacoes_estoque(tipo);
CREATE INDEX idx_movest_created   ON movimentacoes_estoque(created_at);
ALTER TABLE movimentacoes_estoque DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. ORÇAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS orcamentos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            SERIAL UNIQUE,
  cliente_id        UUID REFERENCES clientes(id) ON DELETE SET NULL,
  caminhao_id       UUID REFERENCES caminhoes(id) ON DELETE SET NULL,
  descricao         TEXT,
  data_emissao      DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade     DATE,
  observacoes       TEXT,
  valor_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'rascunho'
                    CHECK (status IN ('rascunho','enviado','aprovado','reprovado','convertido')),
  os_id             UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orcamentos_cliente  ON orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_status   ON orcamentos(status);
ALTER TABLE orcamentos DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS itens_orcamento (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orcamento_id    UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  item_id         UUID REFERENCES itens_servicos(id) ON DELETE SET NULL,
  descricao       TEXT NOT NULL,
  categoria       TEXT NOT NULL CHECK (categoria IN ('peca','servico')),
  quantidade      NUMERIC(10,3) NOT NULL DEFAULT 1,
  preco_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_itens_orc_orc_id ON itens_orcamento(orcamento_id);
ALTER TABLE itens_orcamento DISABLE ROW LEVEL SECURITY;

-- trigger updated_at orcamentos
CREATE TRIGGER set_updated_at_orcamentos
  BEFORE UPDATE ON orcamentos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- trigger recalcular total orçamento
CREATE OR REPLACE FUNCTION recalcular_total_orcamento()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orcamentos
  SET valor_total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM itens_orcamento
    WHERE orcamento_id = COALESCE(NEW.orcamento_id, OLD.orcamento_id)
  )
  WHERE id = COALESCE(NEW.orcamento_id, OLD.orcamento_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_total_orcamento
  AFTER INSERT OR UPDATE OR DELETE ON itens_orcamento
  FOR EACH ROW EXECUTE FUNCTION recalcular_total_orcamento();

-- ============================================================
-- 4. CATEGORIAS FINANCEIRAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome    TEXT NOT NULL UNIQUE,
  tipo    TEXT NOT NULL CHECK (tipo IN ('receita','despesa','ambos')),
  cor     TEXT DEFAULT '#6366f1'
);
ALTER TABLE categorias_financeiras DISABLE ROW LEVEL SECURITY;

INSERT INTO categorias_financeiras (nome, tipo) VALUES
  ('Peças',              'despesa'),
  ('Mão de Obra',        'receita'),
  ('Serviços',           'receita'),
  ('Aluguel',            'despesa'),
  ('Energia',            'despesa'),
  ('Água',               'despesa'),
  ('Fornecedores',       'despesa'),
  ('Impostos',           'despesa'),
  ('Salários',           'despesa'),
  ('Outros',             'ambos')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- 5. CONTAS A RECEBER
-- ============================================================
CREATE TABLE IF NOT EXISTS contas_receber (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao       TEXT NOT NULL,
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  os_id           UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  categoria_id    UUID REFERENCES categorias_financeiras(id),
  valor_total     NUMERIC(12,2) NOT NULL,
  parcelas        INTEGER NOT NULL DEFAULT 1,
  data_emissao    DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes     TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cr_cliente   ON contas_receber(cliente_id);
CREATE INDEX idx_cr_status    ON contas_receber(status);
CREATE INDEX idx_cr_os_id     ON contas_receber(os_id);
ALTER TABLE contas_receber DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS parcelas_receber (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conta_id        UUID NOT NULL REFERENCES contas_receber(id) ON DELETE CASCADE,
  numero          INTEGER NOT NULL DEFAULT 1,
  valor           NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento  DATE,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','pago','atrasado')),
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro','pix','cartao_debito','cartao_credito','boleto','transferencia')),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_parcr_conta   ON parcelas_receber(conta_id);
CREATE INDEX idx_parcr_venc    ON parcelas_receber(data_vencimento);
CREATE INDEX idx_parcr_status  ON parcelas_receber(status);
ALTER TABLE parcelas_receber DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_contas_receber
  BEFORE UPDATE ON contas_receber
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 6. CONTAS A PAGAR
-- ============================================================
CREATE TABLE IF NOT EXISTS contas_pagar (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao       TEXT NOT NULL,
  fornecedor      TEXT,
  categoria_id    UUID REFERENCES categorias_financeiras(id),
  valor_total     NUMERIC(12,2) NOT NULL,
  parcelas        INTEGER NOT NULL DEFAULT 1,
  data_emissao    DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes     TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cp_status  ON contas_pagar(status);
ALTER TABLE contas_pagar DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS parcelas_pagar (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conta_id        UUID NOT NULL REFERENCES contas_pagar(id) ON DELETE CASCADE,
  numero          INTEGER NOT NULL DEFAULT 1,
  valor           NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento  DATE,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','pago','atrasado')),
  forma_pagamento TEXT,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_parcp_conta  ON parcelas_pagar(conta_id);
CREATE INDEX idx_parcp_venc   ON parcelas_pagar(data_vencimento);
CREATE INDEX idx_parcp_status ON parcelas_pagar(status);
ALTER TABLE parcelas_pagar DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_contas_pagar
  BEFORE UPDATE ON contas_pagar
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 7. CAIXA — abertura, movimentações e fechamento
-- ============================================================
CREATE TABLE IF NOT EXISTS caixa_sessoes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_abertura       TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fechamento     TIMESTAMPTZ,
  saldo_inicial       NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_final         NUMERIC(12,2),
  total_entradas      NUMERIC(12,2) DEFAULT 0,
  total_saidas        NUMERIC(12,2) DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'aberto'
                      CHECK (status IN ('aberto','fechado')),
  observacoes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE caixa_sessoes DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sessao_id       UUID NOT NULL REFERENCES caixa_sessoes(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  valor           NUMERIC(12,2) NOT NULL,
  descricao       TEXT NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro'
                  CHECK (forma_pagamento IN ('dinheiro','pix','cartao_debito','cartao_credito','boleto','transferencia')),
  ref_id          UUID,
  ref_tipo        TEXT,   -- 'os','venda','despesa','manual'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_movcx_sessao  ON movimentacoes_caixa(sessao_id);
CREATE INDEX idx_movcx_tipo    ON movimentacoes_caixa(tipo);
ALTER TABLE movimentacoes_caixa DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. VENDAS (PDV)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          SERIAL UNIQUE,
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  sessao_caixa_id UUID REFERENCES caixa_sessoes(id) ON DELETE SET NULL,
  data_venda      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valor_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto        NUMERIC(12,2) DEFAULT 0,
  valor_pago      NUMERIC(12,2) DEFAULT 0,
  forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro'
                  CHECK (forma_pagamento IN ('dinheiro','pix','cartao_debito','cartao_credito','misto')),
  status          TEXT NOT NULL DEFAULT 'finalizada'
                  CHECK (status IN ('aberta','finalizada','cancelada')),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendas_data    ON vendas(data_venda);
CREATE INDEX idx_vendas_cliente ON vendas(cliente_id);
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS itens_venda (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id        UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  item_id         UUID REFERENCES itens_servicos(id) ON DELETE SET NULL,
  descricao       TEXT NOT NULL,
  categoria       TEXT NOT NULL CHECK (categoria IN ('peca','servico')),
  quantidade      NUMERIC(10,3) NOT NULL DEFAULT 1,
  preco_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_itens_venda_venda_id ON itens_venda(venda_id);
ALTER TABLE itens_venda DISABLE ROW LEVEL SECURITY;

-- trigger recalcular total venda
CREATE OR REPLACE FUNCTION recalcular_total_venda()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vendas
  SET valor_total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM itens_venda
    WHERE venda_id = COALESCE(NEW.venda_id, OLD.venda_id)
  )
  WHERE id = COALESCE(NEW.venda_id, OLD.venda_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_total_venda
  AFTER INSERT OR UPDATE OR DELETE ON itens_venda
  FOR EACH ROW EXECUTE FUNCTION recalcular_total_venda();

-- ============================================================
-- 9. NOTAS FISCAIS (estrutura preparada para futura integração)
-- ============================================================
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          TEXT,
  serie           TEXT DEFAULT '1',
  tipo            TEXT NOT NULL CHECK (tipo IN ('nfe','nfce','nfse')),
  natureza_op     TEXT DEFAULT 'Prestação de Serviço',
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  os_id           UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  venda_id        UUID REFERENCES vendas(id) ON DELETE SET NULL,
  valor_total     NUMERIC(12,2) DEFAULT 0,
  chave_acesso    TEXT UNIQUE,
  xml_path        TEXT,
  pdf_path        TEXT,
  status          TEXT NOT NULL DEFAULT 'rascunho'
                  CHECK (status IN ('rascunho','enviada','autorizada','cancelada','rejeitada')),
  protocolo       TEXT,
  data_emissao    TIMESTAMPTZ,
  data_autorizacao TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  dados_emissao   JSONB,  -- campos para futura API de emissão
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nf_cliente   ON notas_fiscais(cliente_id);
CREATE INDEX idx_nf_status    ON notas_fiscais(status);
CREATE INDEX idx_nf_tipo      ON notas_fiscais(tipo);
ALTER TABLE notas_fiscais DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at_notas_fiscais
  BEFORE UPDATE ON notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 10. ÍNDICES ADICIONAIS para performance de relatórios
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_os_data_venc      ON ordens_servico(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_os_status_data    ON ordens_servico(status_pagamento, data_abertura);
