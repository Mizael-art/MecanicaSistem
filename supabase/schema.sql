-- ============================================================
-- MECÂNICA PAI E FILHO - Schema Completo Supabase/PostgreSQL
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT NOT NULL,
  cnpj          TEXT UNIQUE,
  telefone      TEXT,
  email         TEXT,
  endereco      TEXT,
  observacoes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_nome ON clientes(nome);
CREATE INDEX idx_clientes_cnpj ON clientes(cnpj);

-- ============================================================
-- TABELA: caminhoes
-- ============================================================
CREATE TABLE IF NOT EXISTS caminhoes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  placa         TEXT NOT NULL UNIQUE,
  marca         TEXT NOT NULL,
  modelo        TEXT NOT NULL,
  ano           INTEGER,
  observacoes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_caminhoes_placa       ON caminhoes(placa);
CREATE INDEX idx_caminhoes_cliente_id  ON caminhoes(cliente_id);

-- ============================================================
-- TABELA: itens_servicos (catálogo de peças e serviços)
-- ============================================================
CREATE TABLE IF NOT EXISTS itens_servicos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome             TEXT NOT NULL,
  descricao        TEXT,
  categoria        TEXT NOT NULL CHECK (categoria IN ('peca', 'servico')),
  preco_padrao     NUMERIC(12,2) NOT NULL DEFAULT 0,
  codigo_interno   TEXT UNIQUE,
  ativo            BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_itens_servicos_categoria ON itens_servicos(categoria);
CREATE INDEX idx_itens_servicos_nome      ON itens_servicos(nome);

-- ============================================================
-- TABELA: ordens_servico
-- ============================================================
CREATE TABLE IF NOT EXISTS ordens_servico (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero             SERIAL UNIQUE,
  cliente_id         UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  caminhao_id        UUID NOT NULL REFERENCES caminhoes(id) ON DELETE RESTRICT,
  data_abertura      DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento    DATE,
  data_pagamento     DATE,
  observacoes        TEXT,
  valor_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  status_pagamento   TEXT NOT NULL DEFAULT 'pendente'
                     CHECK (status_pagamento IN ('pago', 'pendente', 'atrasado')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_os_cliente_id        ON ordens_servico(cliente_id);
CREATE INDEX idx_os_caminhao_id       ON ordens_servico(caminhao_id);
CREATE INDEX idx_os_data_abertura     ON ordens_servico(data_abertura);
CREATE INDEX idx_os_status_pagamento  ON ordens_servico(status_pagamento);
CREATE INDEX idx_os_numero            ON ordens_servico(numero);

-- ============================================================
-- TABELA: ordem_itens (itens de cada OS)
-- ============================================================
CREATE TABLE IF NOT EXISTS ordem_itens (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ordem_id            UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  item_id             UUID REFERENCES itens_servicos(id) ON DELETE SET NULL,
  descricao           TEXT NOT NULL,
  categoria           TEXT NOT NULL CHECK (categoria IN ('peca', 'servico')),
  quantidade          NUMERIC(10,3) NOT NULL DEFAULT 1,
  preco_unitario      NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal            NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ordem_itens_ordem_id ON ordem_itens(ordem_id);
CREATE INDEX idx_ordem_itens_item_id  ON ordem_itens(item_id);

-- ============================================================
-- TABELA: despesas
-- ============================================================
CREATE TABLE IF NOT EXISTS despesas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT NOT NULL,
  valor         NUMERIC(12,2) NOT NULL,
  data          DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria     TEXT NOT NULL DEFAULT 'outros',
  observacao    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_despesas_data      ON despesas(data);
CREATE INDEX idx_despesas_categoria ON despesas(categoria);

-- ============================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER set_updated_at_clientes
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_caminhoes
  BEFORE UPDATE ON caminhoes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_itens_servicos
  BEFORE UPDATE ON itens_servicos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_ordens_servico
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_despesas
  BEFORE UPDATE ON despesas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- FUNÇÃO: recalcular valor_total da OS automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION recalcular_total_os()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ordens_servico
  SET valor_total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM ordem_itens
    WHERE ordem_id = COALESCE(NEW.ordem_id, OLD.ordem_id)
  )
  WHERE id = COALESCE(NEW.ordem_id, OLD.ordem_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_total_os
  AFTER INSERT OR UPDATE OR DELETE ON ordem_itens
  FOR EACH ROW EXECUTE FUNCTION recalcular_total_os();

-- ============================================================
-- DESABILITAR RLS para ambiente de desenvolvimento
-- ============================================================
ALTER TABLE clientes         DISABLE ROW LEVEL SECURITY;
ALTER TABLE caminhoes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_servicos   DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico   DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_itens      DISABLE ROW LEVEL SECURITY;
ALTER TABLE despesas         DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- DADOS INICIAIS (seed) - categorias de despesas como referência
-- ============================================================
-- Alguns serviços e peças comuns para começar
INSERT INTO itens_servicos (nome, categoria, preco_padrao, descricao) VALUES
  ('Troca de Óleo Motor', 'servico', 150.00, 'Mão de obra para troca de óleo'),
  ('Revisão Geral', 'servico', 350.00, 'Revisão completa do veículo'),
  ('Alinhamento e Balanceamento', 'servico', 120.00, 'Alinhamento e balanceamento de rodas'),
  ('Filtro de Óleo', 'peca', 45.00, 'Filtro de óleo padrão'),
  ('Filtro de Ar', 'peca', 65.00, 'Filtro de ar do motor'),
  ('Pastilha de Freio', 'peca', 180.00, 'Jogo de pastilhas dianteiras'),
  ('Óleo Lubrificante 15W40 (5L)', 'peca', 120.00, 'Galão óleo motor'),
  ('Correia Dentada', 'peca', 220.00, 'Kit correia dentada');
