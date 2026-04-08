-- ============================================================
-- FIX URGENTE — Execute AGORA no SQL Editor do Supabase
-- Resolve os 3 erros reportados:
--   1. "violates foreign key constraint ordens_servico_cliente_id_fkey"
--   2. "Could not find table public.contas_pagar in schema cache"
--   3. "Could not find table public.contas_receber in schema cache"
-- ============================================================

-- ── PASSO 1: Garantir colunas avulsa nas OS (patch_v2) ──────
ALTER TABLE ordens_servico ALTER COLUMN cliente_id  DROP NOT NULL;
ALTER TABLE ordens_servico ALTER COLUMN caminhao_id DROP NOT NULL;
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS avulsa           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS descricao_avulsa TEXT;
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS valor_manual     NUMERIC(12,2);
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS data_pagamento   DATE;

-- ── PASSO 2: Recriar FKs como SET NULL (resolve erro de delete) ─
ALTER TABLE ordens_servico
  DROP CONSTRAINT IF EXISTS ordens_servico_cliente_id_fkey;
ALTER TABLE ordens_servico
  DROP CONSTRAINT IF EXISTS ordens_servico_caminhao_id_fkey;

ALTER TABLE ordens_servico
  ADD CONSTRAINT ordens_servico_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
ALTER TABLE ordens_servico
  ADD CONSTRAINT ordens_servico_caminhao_id_fkey
  FOREIGN KEY (caminhao_id) REFERENCES caminhoes(id) ON DELETE SET NULL;

-- ── PASSO 3: Criar tabelas financeiras caso não existam ─────

CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa','ambos')),
  cor  TEXT DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS contas_receber (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao      TEXT NOT NULL,
  cliente_id     UUID REFERENCES clientes(id) ON DELETE SET NULL,
  os_id          UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  categoria_id   UUID REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  valor_total    NUMERIC(12,2) NOT NULL,
  parcelas       INTEGER NOT NULL DEFAULT 1,
  data_emissao   DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes    TEXT,
  status         TEXT NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  data_pagamento DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
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
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao      TEXT NOT NULL,
  fornecedor     TEXT,
  categoria_id   UUID REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  valor_total    NUMERIC(12,2) NOT NULL,
  parcelas       INTEGER NOT NULL DEFAULT 1,
  data_emissao   DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes    TEXT,
  status         TEXT NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  data_pagamento DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- Caixa
CREATE TABLE IF NOT EXISTS caixa_sessoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_abertura   TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fechamento TIMESTAMPTZ,
  saldo_inicial   NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_final     NUMERIC(12,2),
  total_entradas  NUMERIC(12,2) DEFAULT 0,
  total_saidas    NUMERIC(12,2) DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
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

-- Vendas (PDV)
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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens_venda (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id       UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  item_id        UUID REFERENCES itens_servicos(id) ON DELETE SET NULL,
  descricao      TEXT NOT NULL,
  categoria      TEXT NOT NULL CHECK (categoria IN ('peca','servico')),
  quantidade     NUMERIC(10,3) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estoque
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
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar campos de estoque ao catálogo se não existirem
ALTER TABLE itens_servicos ADD COLUMN IF NOT EXISTS estoque_atual  NUMERIC(10,3) DEFAULT 0;
ALTER TABLE itens_servicos ADD COLUMN IF NOT EXISTS estoque_minimo NUMERIC(10,3) DEFAULT 0;
ALTER TABLE itens_servicos ADD COLUMN IF NOT EXISTS custo_medio    NUMERIC(12,2) DEFAULT 0;
ALTER TABLE itens_servicos ADD COLUMN IF NOT EXISTS unidade        TEXT DEFAULT 'un';

-- Orçamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero        SERIAL UNIQUE,
  cliente_id    UUID REFERENCES clientes(id)  ON DELETE SET NULL,
  caminhao_id   UUID REFERENCES caminhoes(id) ON DELETE SET NULL,
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

-- Notas fiscais
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero           TEXT,
  serie            TEXT NOT NULL DEFAULT '1',
  tipo             TEXT NOT NULL CHECK (tipo IN ('nfe','nfce','nfse')),
  natureza_op      TEXT DEFAULT 'Prestação de Serviços',
  cliente_id       UUID REFERENCES clientes(id) ON DELETE SET NULL,
  os_id            UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  venda_id         UUID REFERENCES vendas(id) ON DELETE SET NULL,
  valor_total      NUMERIC(12,2) NOT NULL DEFAULT 0,
  chave_acesso     TEXT UNIQUE,
  status           TEXT NOT NULL DEFAULT 'rascunho'
                   CHECK (status IN ('rascunho','enviada','autorizada','cancelada','rejeitada')),
  dados_emissao    JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PASSO 4: Desabilitar RLS em todas as tabelas ────────────
ALTER TABLE clientes               DISABLE ROW LEVEL SECURITY;
ALTER TABLE caminhoes              DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_servicos         DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico         DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordem_itens            DISABLE ROW LEVEL SECURITY;
ALTER TABLE despesas               DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque  DISABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos             DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_orcamento        DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_financeiras DISABLE ROW LEVEL SECURITY;
ALTER TABLE contas_receber         DISABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_receber       DISABLE ROW LEVEL SECURITY;
ALTER TABLE contas_pagar           DISABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_pagar         DISABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_sessoes          DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_caixa    DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendas                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda            DISABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais          DISABLE ROW LEVEL SECURITY;

-- ── PASSO 5: Índice único caixa aberto ──────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_caixa_sessao_aberta_unica
  ON caixa_sessoes (status) WHERE status = 'aberto';

-- ── PASSO 6: Forçar reload do schema cache do PostgREST ─────
-- ESSENCIAL para resolver "Could not find table in schema cache"
NOTIFY pgrst, 'reload schema';

-- ── PASSO 7: Confirmar resultado ────────────────────────────
DO $$
DECLARE
  tabelas TEXT[] := ARRAY[
    'clientes','caminhoes','itens_servicos','ordens_servico','ordem_itens',
    'despesas','movimentacoes_estoque','orcamentos','itens_orcamento',
    'categorias_financeiras','contas_receber','parcelas_receber',
    'contas_pagar','parcelas_pagar','caixa_sessoes','movimentacoes_caixa',
    'vendas','itens_venda','notas_fiscais'
  ];
  t TEXT;
  ok INTEGER := 0;
  faltando TEXT[] := '{}';
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t)
    THEN ok := ok + 1;
    ELSE faltando := array_append(faltando, t);
    END IF;
  END LOOP;
  IF array_length(faltando, 1) > 0 THEN
    RAISE NOTICE '⚠️  Tabelas ausentes: %', array_to_string(faltando, ', ');
  ELSE
    RAISE NOTICE '✅ Todas as % tabelas OK. FKs corrigidas. Schema cache recarregado!', ok;
  END IF;
END $$;
