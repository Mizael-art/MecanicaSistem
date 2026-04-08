-- ============================================================
-- MECÂNICA PAI E FILHO — Schema COMPLETO v3
-- Execute este único arquivo no SQL Editor do Supabase
-- Substitui: schema.sql + patch_v2.sql + patch_v3.sql + hotfix
-- Totalmente idempotente: pode executar múltiplas vezes
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  cnpj        TEXT UNIQUE,
  telefone    TEXT,
  email       TEXT,
  endereco    TEXT,
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS caminhoes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  placa       TEXT NOT NULL UNIQUE,
  marca       TEXT NOT NULL,
  modelo      TEXT NOT NULL,
  ano         INTEGER,
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens_servicos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  categoria       TEXT NOT NULL CHECK (categoria IN ('peca','servico')),
  preco_padrao    NUMERIC(12,2) NOT NULL DEFAULT 0,
  codigo_interno  TEXT UNIQUE,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  -- v2: campos de estoque
  estoque_atual   NUMERIC(10,3) DEFAULT 0,
  estoque_minimo  NUMERIC(10,3) DEFAULT 0,
  custo_medio     NUMERIC(12,2) DEFAULT 0,
  unidade         TEXT DEFAULT 'un',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ordens_servico (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero           SERIAL UNIQUE,
  -- v2: cliente/caminhao tornados opcionais
  cliente_id       UUID REFERENCES clientes(id)  ON DELETE RESTRICT,
  caminhao_id      UUID REFERENCES caminhoes(id) ON DELETE RESTRICT,
  data_abertura    DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento  DATE,
  data_pagamento   DATE,
  observacoes      TEXT,
  valor_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status_pagamento TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status_pagamento IN ('pago','pendente','atrasado')),
  -- v2: modo avulso
  avulsa           BOOLEAN NOT NULL DEFAULT false,
  descricao_avulsa TEXT,
  valor_manual     NUMERIC(12,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ordem_itens (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ordem_id       UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  item_id        UUID REFERENCES itens_servicos(id) ON DELETE SET NULL,
  descricao      TEXT NOT NULL,
  categoria      TEXT NOT NULL CHECK (categoria IN ('peca','servico')),
  quantidade     NUMERIC(10,3) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal       NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS despesas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  valor       NUMERIC(12,2) NOT NULL,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria   TEXT NOT NULL DEFAULT 'outros',
  observacao  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELAS v3: ESTOQUE
-- ============================================================

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id        UUID NOT NULL REFERENCES itens_servicos(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade     NUMERIC(10,3) NOT NULL,
  custo_unitario NUMERIC(12,2) DEFAULT 0,
  motivo         TEXT,
  ref_id         UUID,
  ref_tipo       TEXT,
  saldo_apos     NUMERIC(10,3),
  usuario        TEXT DEFAULT 'sistema',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELAS v3: ORÇAMENTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS orcamentos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero        SERIAL UNIQUE,
  cliente_id    UUID REFERENCES clientes(id)    ON DELETE SET NULL,
  caminhao_id   UUID REFERENCES caminhoes(id)   ON DELETE SET NULL,
  descricao     TEXT,
  data_emissao  DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  valor_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho','enviado','aprovado','reprovado','convertido')),
  os_id         UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  observacoes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens_orcamento (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orcamento_id   UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  item_id        UUID REFERENCES itens_servicos(id) ON DELETE SET NULL,
  descricao      TEXT NOT NULL,
  categoria      TEXT NOT NULL CHECK (categoria IN ('peca','servico')),
  quantidade     NUMERIC(10,3) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELAS v3: FINANCEIRO
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa','ambos')),
  cor  TEXT DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS contas_receber (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao    TEXT NOT NULL,
  cliente_id   UUID REFERENCES clientes(id)      ON DELETE SET NULL,
  os_id        UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  valor_total  NUMERIC(12,2) NOT NULL,
  parcelas     INTEGER NOT NULL DEFAULT 1,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes  TEXT,
  status       TEXT NOT NULL DEFAULT 'pendente'
               CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  data_pagamento DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parcelas_receber (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conta_id        UUID NOT NULL REFERENCES contas_receber(id) ON DELETE CASCADE,
  numero          INTEGER NOT NULL DEFAULT 1,
  valor           NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento  DATE,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','pago','atrasado')),
  forma_pagamento TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contas_pagar (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao    TEXT NOT NULL,
  fornecedor   TEXT,
  categoria_id UUID REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  valor_total  NUMERIC(12,2) NOT NULL,
  parcelas     INTEGER NOT NULL DEFAULT 1,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes  TEXT,
  status       TEXT NOT NULL DEFAULT 'pendente'
               CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  data_pagamento DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELAS v3: CAIXA
-- ============================================================

CREATE TABLE IF NOT EXISTS caixa_sessoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_abertura   TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fechamento TIMESTAMPTZ,
  saldo_inicial   NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_final     NUMERIC(12,2),
  total_entradas  NUMERIC(12,2) DEFAULT 0,
  total_saidas    NUMERIC(12,2) DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'aberto'
                  CHECK (status IN ('aberto','fechado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sessao_id       UUID NOT NULL REFERENCES caixa_sessoes(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  valor           NUMERIC(12,2) NOT NULL,
  descricao       TEXT NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro'
                  CHECK (forma_pagamento IN ('dinheiro','pix','cartao_debito','cartao_credito','boleto','transferencia')),
  ref_id          UUID,
  ref_tipo        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELAS v3: VENDAS (PDV)
-- ============================================================

CREATE TABLE IF NOT EXISTS vendas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          SERIAL UNIQUE,
  cliente_id      UUID REFERENCES clientes(id)      ON DELETE SET NULL,
  sessao_caixa_id UUID REFERENCES caixa_sessoes(id) ON DELETE SET NULL,
  data_venda      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valor_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto        NUMERIC(12,2) DEFAULT 0,
  valor_pago      NUMERIC(12,2) DEFAULT 0,
  forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro'
                  CHECK (forma_pagamento IN ('dinheiro','pix','cartao_debito','cartao_credito','misto')),
  status          TEXT NOT NULL DEFAULT 'finalizada'
                  CHECK (status IN ('aberta','finalizada','cancelada')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens_venda (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id       UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  item_id        UUID REFERENCES itens_servicos(id)  ON DELETE SET NULL,
  descricao      TEXT NOT NULL,
  categoria      TEXT NOT NULL CHECK (categoria IN ('peca','servico')),
  quantidade     NUMERIC(10,3) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELAS v3: FISCAL
-- ============================================================

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            TEXT,
  serie             TEXT NOT NULL DEFAULT '1',
  tipo              TEXT NOT NULL CHECK (tipo IN ('nfe','nfce','nfse')),
  natureza_op       TEXT DEFAULT 'Prestação de Serviços',
  cliente_id        UUID REFERENCES clientes(id)       ON DELETE SET NULL,
  os_id             UUID REFERENCES ordens_servico(id)  ON DELETE SET NULL,
  venda_id          UUID REFERENCES vendas(id)          ON DELETE SET NULL,
  valor_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  chave_acesso      TEXT UNIQUE,
  xml_path          TEXT,
  pdf_path          TEXT,
  status            TEXT NOT NULL DEFAULT 'rascunho'
                    CHECK (status IN ('rascunho','enviada','autorizada','cancelada','rejeitada')),
  protocolo         TEXT,
  data_emissao      TIMESTAMPTZ,
  data_autorizacao  TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  dados_emissao     JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clientes_nome            ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_caminhoes_placa           ON caminhoes(placa);
CREATE INDEX IF NOT EXISTS idx_caminhoes_cliente_id      ON caminhoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_itens_servicos_categoria  ON itens_servicos(categoria);
CREATE INDEX IF NOT EXISTS idx_itens_servicos_nome       ON itens_servicos(nome);
CREATE INDEX IF NOT EXISTS idx_os_cliente_id             ON ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_caminhao_id            ON ordens_servico(caminhao_id);
CREATE INDEX IF NOT EXISTS idx_os_data_abertura          ON ordens_servico(data_abertura);
CREATE INDEX IF NOT EXISTS idx_os_status_pagamento       ON ordens_servico(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_os_data_venc              ON ordens_servico(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_os_status_data            ON ordens_servico(status_pagamento, data_abertura);
CREATE INDEX IF NOT EXISTS idx_os_cliente_status         ON ordens_servico(cliente_id, status_pagamento) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ordem_itens_ordem_id      ON ordem_itens(ordem_id);
CREATE INDEX IF NOT EXISTS idx_despesas_data             ON despesas(data);
CREATE INDEX IF NOT EXISTS idx_movest_item_id            ON movimentacoes_estoque(item_id);
CREATE INDEX IF NOT EXISTS idx_movest_item_created       ON movimentacoes_estoque(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente        ON orcamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status         ON orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_itens_orc_orc_id          ON itens_orcamento(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_cr_cliente                ON contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cr_status                 ON contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_cr_data_emissao           ON contas_receber(data_emissao);
CREATE INDEX IF NOT EXISTS idx_parcr_venc                ON parcelas_receber(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcr_status_venc         ON parcelas_receber(data_vencimento) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_cp_status                 ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_cp_data_emissao           ON contas_pagar(data_emissao);
CREATE INDEX IF NOT EXISTS idx_parcp_venc                ON parcelas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcp_status_venc         ON parcelas_pagar(data_vencimento) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_movcx_sessao              ON movimentacoes_caixa(sessao_id);
CREATE INDEX IF NOT EXISTS idx_movcx_created             ON movimentacoes_caixa(created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_data               ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_sessao             ON vendas(sessao_caixa_id) WHERE sessao_caixa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nf_status                 ON notas_fiscais(status);

-- ── BUG-02 FIX: apenas 1 caixa aberto por vez ────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_caixa_sessao_aberta_unica
  ON caixa_sessoes (status)
  WHERE status = 'aberto';

-- ============================================================
-- CONSTRAINTS DE INTEGRIDADE
-- ============================================================

-- BD-04: estoque não pode ser negativo
ALTER TABLE itens_servicos
  DROP CONSTRAINT IF EXISTS chk_estoque_nao_negativo;
ALTER TABLE itens_servicos
  ADD CONSTRAINT chk_estoque_nao_negativo CHECK (estoque_atual >= 0);

-- Valores de caixa devem ser positivos
ALTER TABLE movimentacoes_caixa
  DROP CONSTRAINT IF EXISTS chk_movcx_valor_positivo;
ALTER TABLE movimentacoes_caixa
  ADD CONSTRAINT chk_movcx_valor_positivo CHECK (valor > 0);

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Função genérica updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_clientes') THEN
    CREATE TRIGGER set_updated_at_clientes BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_caminhoes') THEN
    CREATE TRIGGER set_updated_at_caminhoes BEFORE UPDATE ON caminhoes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_itens_servicos') THEN
    CREATE TRIGGER set_updated_at_itens_servicos BEFORE UPDATE ON itens_servicos FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_ordens_servico') THEN
    CREATE TRIGGER set_updated_at_ordens_servico BEFORE UPDATE ON ordens_servico FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_despesas') THEN
    CREATE TRIGGER set_updated_at_despesas BEFORE UPDATE ON despesas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_orcamentos') THEN
    CREATE TRIGGER set_updated_at_orcamentos BEFORE UPDATE ON orcamentos FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_contas_receber') THEN
    CREATE TRIGGER set_updated_at_contas_receber BEFORE UPDATE ON contas_receber FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_contas_pagar') THEN
    CREATE TRIGGER set_updated_at_contas_pagar BEFORE UPDATE ON contas_pagar FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

-- BD-07 FIX: recalcular total da OS respeitando valor_manual
CREATE OR REPLACE FUNCTION recalcular_total_os()
RETURNS TRIGGER AS $$
DECLARE
  total_itens NUMERIC(12,2);
  vm          NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO total_itens
  FROM ordem_itens
  WHERE ordem_id = COALESCE(NEW.ordem_id, OLD.ordem_id);

  SELECT valor_manual INTO vm
  FROM ordens_servico
  WHERE id = COALESCE(NEW.ordem_id, OLD.ordem_id);

  UPDATE ordens_servico
  SET valor_total = CASE WHEN total_itens > 0 THEN total_itens ELSE COALESCE(vm, 0) END
  WHERE id = COALESCE(NEW.ordem_id, OLD.ordem_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recalcular_total_os') THEN
    CREATE TRIGGER trg_recalcular_total_os
      AFTER INSERT OR UPDATE OR DELETE ON ordem_itens
      FOR EACH ROW EXECUTE FUNCTION recalcular_total_os();
  END IF;
END $$;

-- Recalcular total do orçamento
CREATE OR REPLACE FUNCTION recalcular_total_orcamento()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orcamentos
  SET valor_total = (
    SELECT COALESCE(SUM(quantidade * preco_unitario), 0)
    FROM itens_orcamento
    WHERE orcamento_id = COALESCE(NEW.orcamento_id, OLD.orcamento_id)
  )
  WHERE id = COALESCE(NEW.orcamento_id, OLD.orcamento_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recalcular_total_orcamento') THEN
    CREATE TRIGGER trg_recalcular_total_orcamento
      AFTER INSERT OR UPDATE OR DELETE ON itens_orcamento
      FOR EACH ROW EXECUTE FUNCTION recalcular_total_orcamento();
  END IF;
END $$;

-- Recalcular total da venda
CREATE OR REPLACE FUNCTION recalcular_total_venda()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vendas
  SET valor_total = (
    SELECT COALESCE(SUM(quantidade * preco_unitario), 0)
    FROM itens_venda
    WHERE venda_id = COALESCE(NEW.venda_id, OLD.venda_id)
  )
  WHERE id = COALESCE(NEW.venda_id, OLD.venda_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recalcular_total_venda') THEN
    CREATE TRIGGER trg_recalcular_total_venda
      AFTER INSERT OR UPDATE OR DELETE ON itens_venda
      FOR EACH ROW EXECUTE FUNCTION recalcular_total_venda();
  END IF;
END $$;

-- BUG-04 FIX: função para marcar registros atrasados automaticamente
CREATE OR REPLACE FUNCTION marcar_registros_atrasados()
RETURNS void AS $$
BEGIN
  UPDATE ordens_servico
  SET status_pagamento = 'atrasado'
  WHERE status_pagamento = 'pendente'
    AND data_vencimento IS NOT NULL
    AND data_vencimento < CURRENT_DATE;

  UPDATE parcelas_receber
  SET status = 'atrasado'
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;

  UPDATE parcelas_pagar
  SET status = 'atrasado'
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Executar imediatamente
SELECT marcar_registros_atrasados();

-- ============================================================
-- DESABILITAR RLS (ambiente de desenvolvimento/local)
-- ============================================================
ALTER TABLE clientes              DISABLE ROW LEVEL SECURITY;
ALTER TABLE caminhoes             DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_servicos        DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico        DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_itens           DISABLE ROW LEVEL SECURITY;
ALTER TABLE despesas              DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque DISABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos            DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_orcamento       DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_financeiras DISABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber        DISABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_receber      DISABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar          DISABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_pagar        DISABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_sessoes         DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_caixa   DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendas                DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda           DISABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais         DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED: Dados iniciais (só insere se tabelas estiverem vazias)
-- ============================================================

INSERT INTO itens_servicos (nome, categoria, preco_padrao, descricao, estoque_atual, estoque_minimo, unidade)
SELECT nome, categoria, preco_padrao, descricao, estoque_atual, estoque_minimo, unidade FROM (VALUES
  ('Troca de Óleo Motor',           'servico', 150.00, 'Mão de obra para troca de óleo',       0, 0, 'serv'),
  ('Revisão Geral',                  'servico', 350.00, 'Revisão completa do veículo',           0, 0, 'serv'),
  ('Alinhamento e Balanceamento',    'servico', 120.00, 'Alinhamento e balanceamento de rodas',  0, 0, 'serv'),
  ('Filtro de Óleo',                 'peca',     45.00, 'Filtro de óleo padrão',                 0, 2, 'un'),
  ('Filtro de Ar',                   'peca',     65.00, 'Filtro de ar do motor',                 0, 2, 'un'),
  ('Pastilha de Freio',              'peca',    180.00, 'Jogo de pastilhas dianteiras',          0, 1, 'jg'),
  ('Óleo Lubrificante 15W40 (5L)',   'peca',    120.00, 'Galão óleo motor',                     0, 3, 'gl'),
  ('Correia Dentada',                'peca',    220.00, 'Kit correia dentada',                   0, 1, 'un')
) AS v(nome, categoria, preco_padrao, descricao, estoque_atual, estoque_minimo, unidade)
WHERE NOT EXISTS (SELECT 1 FROM itens_servicos LIMIT 1);

INSERT INTO categorias_financeiras (nome, tipo, cor)
SELECT nome, tipo, cor FROM (VALUES
  ('Peças e Materiais',   'despesa',  '#ef4444'),
  ('Mão de Obra',         'receita',  '#22c55e'),
  ('Combustível',         'despesa',  '#f97316'),
  ('Fornecedores',        'despesa',  '#a855f7'),
  ('Serviços OS',         'receita',  '#3b82f6'),
  ('Vendas PDV',          'receita',  '#06b6d4'),
  ('Impostos',            'despesa',  '#dc2626'),
  ('Aluguel',             'despesa',  '#f59e0b'),
  ('Outros',              'ambos',    '#64748b'),
  ('Salários',            'despesa',  '#8b5cf6')
) AS v(nome, tipo, cor)
WHERE NOT EXISTS (SELECT 1 FROM categorias_financeiras LIMIT 1);

