-- ============================================================
-- PATCH v2 — Mecânica Pai e Filho
-- Execute este script APÓS o schema.sql inicial
-- ============================================================

-- 1. Tornar cliente_id e caminhao_id opcionais (nullable)
ALTER TABLE ordens_servico
  ALTER COLUMN cliente_id DROP NOT NULL,
  ALTER COLUMN caminhao_id DROP NOT NULL;

-- 2. Adicionar campo avulsa
ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS avulsa BOOLEAN NOT NULL DEFAULT false;

-- 3. Adicionar campo descricao_avulsa para texto livre
ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS descricao_avulsa TEXT;

-- 4. Adicionar valor_manual para OS sem itens
ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS valor_manual NUMERIC(12,2);

-- 5. Atualizar o trigger de recálculo para respeitar valor_manual
CREATE OR REPLACE FUNCTION recalcular_total_os()
RETURNS TRIGGER AS $$
DECLARE
  v_manual NUMERIC(12,2);
  v_avulsa BOOLEAN;
BEGIN
  SELECT valor_manual, avulsa INTO v_manual, v_avulsa
  FROM ordens_servico
  WHERE id = COALESCE(NEW.ordem_id, OLD.ordem_id);

  -- Se avulsa com valor manual, não recalcula pelo itens
  IF v_avulsa AND v_manual IS NOT NULL THEN
    RETURN NEW;
  END IF;

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

-- Índice para avulsa
CREATE INDEX IF NOT EXISTS idx_os_avulsa ON ordens_servico(avulsa);
