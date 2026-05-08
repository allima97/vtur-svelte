-- ============================================================
-- SCRIPT DE MIGRATIONS PENDENTES — VTUR PRODUÇÃO
-- Gerado em: 2026-05-05
--
-- SEGURO para rodar: usa IF NOT EXISTS em todos os lugares.
-- Rode este script inteiro no SQL Editor do Supabase.
-- ============================================================


-- ============================================================
-- 1. vendas_recibos — colunas faltando
--    (migrations: 20260204, 20260219, 20260220, 20260304,
--     20260319, 20260409, 20260420)
-- ============================================================

ALTER TABLE IF EXISTS public.vendas_recibos
  ADD COLUMN IF NOT EXISTS numero_reserva text,
  ADD COLUMN IF NOT EXISTS contrato_path text,
  ADD COLUMN IF NOT EXISTS contrato_url text,
  ADD COLUMN IF NOT EXISTS valor_rav numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_du numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_venda date,
  ADD COLUMN IF NOT EXISTS cancelado_por_conciliacao_em date,
  ADD COLUMN IF NOT EXISTS cancelado_por_conciliacao_observacao text,
  ADD COLUMN IF NOT EXISTS numero_recibo_normalizado text,
  ADD COLUMN IF NOT EXISTS destino_cidade_id uuid REFERENCES public.cidades(id) ON DELETE SET NULL;

-- Backfill numero_recibo_normalizado
UPDATE public.vendas_recibos
SET numero_recibo_normalizado = upper(regexp_replace(numero_recibo, '[^A-Z0-9]', '', 'gi'))
WHERE numero_recibo IS NOT NULL
  AND (numero_recibo_normalizado IS NULL OR numero_recibo_normalizado = '');

-- Índices vendas_recibos
CREATE INDEX IF NOT EXISTS idx_vendas_recibos_data_venda
  ON public.vendas_recibos (data_venda);

CREATE INDEX IF NOT EXISTS idx_vendas_recibos_cancelado_conciliacao
  ON public.vendas_recibos (cancelado_por_conciliacao_em)
  WHERE cancelado_por_conciliacao_em IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_recibos_numero_normalizado
  ON public.vendas_recibos (numero_recibo_normalizado)
  WHERE numero_recibo_normalizado IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_recibos_numero_reserva
  ON public.vendas_recibos (numero_reserva)
  WHERE numero_reserva IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_recibos_destino_cidade
  ON public.vendas_recibos (destino_cidade_id)
  WHERE destino_cidade_id IS NOT NULL;

-- Trigger para manter numero_recibo_normalizado atualizado
CREATE OR REPLACE FUNCTION public.fn_vendas_recibos_normalize_numero()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF new.numero_recibo IS NOT NULL THEN
    new.numero_recibo_normalizado := upper(regexp_replace(new.numero_recibo, '[^A-Z0-9]', '', 'gi'));
  ELSE
    new.numero_recibo_normalizado := null;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendas_recibos_normalize_numero ON public.vendas_recibos;
CREATE TRIGGER trg_vendas_recibos_normalize_numero
  BEFORE INSERT OR UPDATE OF numero_recibo
  ON public.vendas_recibos
  FOR EACH ROW EXECUTE FUNCTION public.fn_vendas_recibos_normalize_numero();


-- ============================================================
-- 2. conciliacao_recibos — colunas faltando
--    (migrations: 20260319, 20260406, 20260408, 20260502)
-- ============================================================

ALTER TABLE IF EXISTS public.conciliacao_recibos
  ADD COLUMN IF NOT EXISTS ranking_vendedor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ranking_produto_id uuid REFERENCES public.tipo_produtos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ranking_assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ranking_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_baixa_rac boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_nao_comissionavel numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS numero_reserva text,
  ADD COLUMN IF NOT EXISTS is_seguro_viagem boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_venda_real numeric,
  ADD COLUMN IF NOT EXISTS faixa_comissao text,
  ADD COLUMN IF NOT EXISTS valor_comissao_loja numeric,
  ADD COLUMN IF NOT EXISTS percentual_comissao_loja numeric;

COMMENT ON COLUMN public.conciliacao_recibos.valor_nao_comissionavel IS
  'Valor de pagamentos não comissionáveis (vale viagem, carta de crédito, etc). Descontado para obter a base comissionável real.';

COMMENT ON COLUMN public.conciliacao_recibos.numero_reserva IS
  'Localizador/reserva associado ao documento da conciliacao. Para REXTUR, documento = REXTUR e numero_reserva = LOC.';

-- Índices conciliacao_recibos
CREATE INDEX IF NOT EXISTS conciliacao_recibos_ranking_vendedor_idx
  ON public.conciliacao_recibos (ranking_vendedor_id)
  WHERE ranking_vendedor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS conciliacao_recibos_is_baixa_rac_idx
  ON public.conciliacao_recibos (company_id, is_baixa_rac, movimento_data DESC);

CREATE INDEX IF NOT EXISTS conciliacao_recibos_ranking_status_idx
  ON public.conciliacao_recibos (company_id, conciliado, movimento_data DESC)
  WHERE is_baixa_rac = false;

CREATE INDEX IF NOT EXISTS conciliacao_recibos_company_doc_reserva_idx
  ON public.conciliacao_recibos (company_id, documento, numero_reserva, movimento_data DESC)
  WHERE numero_reserva IS NOT NULL;


-- ============================================================
-- 3. users — coluna participa_ranking
--    (migration: 20260306)
-- ============================================================

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS participa_ranking boolean NOT NULL DEFAULT false;


-- ============================================================
-- 4. vendas_recibos_rateio — tabela de rateio
--    (migration: 20260412)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vendas_recibos_rateio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  venda_recibo_id uuid REFERENCES public.vendas_recibos(id) ON DELETE CASCADE,
  conciliacao_recibo_id uuid REFERENCES public.conciliacao_recibos(id) ON DELETE CASCADE,
  vendedor_destino_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  percentual_origem numeric NOT NULL DEFAULT 100,
  percentual_destino numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendas_recibos_rateio_company
  ON public.vendas_recibos_rateio (company_id);

CREATE INDEX IF NOT EXISTS idx_vendas_recibos_rateio_destino
  ON public.vendas_recibos_rateio (vendedor_destino_id);

CREATE INDEX IF NOT EXISTS idx_vendas_recibos_rateio_origem
  ON public.vendas_recibos_rateio (venda_recibo_id)
  WHERE venda_recibo_id IS NOT NULL;


-- ============================================================
-- 5. comissoes — coluna recibo_id
--    (migration: 20260502_comissoes_por_recibo)
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.comissoes') IS NOT NULL THEN
    ALTER TABLE public.comissoes
      ADD COLUMN IF NOT EXISTS recibo_id uuid;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'comissoes_recibo_id_fkey'
        AND conrelid = 'public.comissoes'::regclass
    ) THEN
      ALTER TABLE public.comissoes
        ADD CONSTRAINT comissoes_recibo_id_fkey
        FOREIGN KEY (recibo_id) REFERENCES public.vendas_recibos(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_comissoes_recibo ON public.comissoes(recibo_id);


-- ============================================================
-- 6. ranking_read_model — tabelas do read model
--    (migration: 20260502_ranking_recibo_read_model)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ranking_read_model_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'dirty',
  dirty_at TIMESTAMPTZ,
  rebuilt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ranking_read_model_status_status_chk
    CHECK (status IN ('dirty', 'rebuilding', 'ready', 'error')),
  CONSTRAINT ranking_read_model_status_month_chk
    CHECK (mes = DATE_TRUNC('month', mes)::date),
  CONSTRAINT ranking_read_model_status_unique
    UNIQUE (modelo, company_id, mes)
);

CREATE TABLE IF NOT EXISTS public.ranking_recibo_contribuicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  data_recibo DATE NOT NULL,
  vendedor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  venda_id UUID NULL REFERENCES public.vendas(id) ON DELETE SET NULL,
  recibo_id UUID NULL REFERENCES public.vendas_recibos(id) ON DELETE SET NULL,
  venda_key TEXT NOT NULL,
  recibo_numero TEXT,
  produto_id UUID NULL REFERENCES public.tipo_produtos(id) ON DELETE SET NULL,
  produto_nome TEXT,
  destino_nome TEXT,
  valor_bruto NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_taxas NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_seguro NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_seguro BOOLEAN NOT NULL DEFAULT FALSE,
  fator NUMERIC(12,6) NOT NULL DEFAULT 1,
  source_bruto NUMERIC(15,2) NOT NULL DEFAULT 0,
  source_taxas NUMERIC(15,2) NOT NULL DEFAULT 0,
  origem TEXT NOT NULL DEFAULT 'ranking_ts',
  built_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ranking_recibo_contribuicoes_month_chk
    CHECK (mes = DATE_TRUNC('month', mes)::date)
);

CREATE INDEX IF NOT EXISTS idx_ranking_read_model_status_lookup
  ON public.ranking_read_model_status (modelo, company_id, mes, status);

CREATE INDEX IF NOT EXISTS idx_ranking_recibo_contribuicoes_company_mes
  ON public.ranking_recibo_contribuicoes (company_id, mes);

CREATE INDEX IF NOT EXISTS idx_ranking_recibo_contribuicoes_vendedor_mes
  ON public.ranking_recibo_contribuicoes (company_id, mes, vendedor_id);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
