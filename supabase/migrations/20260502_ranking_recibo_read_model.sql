-- 2026-05-02: camada canônica de leitura para ranking/KPIs por recibo.
-- A aplicação calcula a contribuição correta uma vez e persiste o resultado
-- por mês/empresa. As telas passam a ler esta tabela em vez de recomputar
-- vendas, conciliação, rateios e pagamentos não comissionáveis a cada abertura.

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
  ON public.ranking_read_model_status(modelo, company_id, mes, status);

CREATE INDEX IF NOT EXISTS idx_ranking_recibo_contribuicoes_company_mes
  ON public.ranking_recibo_contribuicoes(company_id, mes);

CREATE INDEX IF NOT EXISTS idx_ranking_recibo_contribuicoes_vendedor_mes
  ON public.ranking_recibo_contribuicoes(company_id, mes, vendedor_id);

CREATE INDEX IF NOT EXISTS idx_ranking_recibo_contribuicoes_data
  ON public.ranking_recibo_contribuicoes(company_id, data_recibo);

CREATE INDEX IF NOT EXISTS idx_ranking_recibo_contribuicoes_cliente
  ON public.ranking_recibo_contribuicoes(cliente_id)
  WHERE cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ranking_recibo_contribuicoes_recibo
  ON public.ranking_recibo_contribuicoes(recibo_id)
  WHERE recibo_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_ranking_read_model_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ranking_read_model_status_updated_at
  ON public.ranking_read_model_status;
CREATE TRIGGER trg_ranking_read_model_status_updated_at
  BEFORE UPDATE ON public.ranking_read_model_status
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ranking_read_model_updated_at();

DROP TRIGGER IF EXISTS trg_ranking_recibo_contribuicoes_updated_at
  ON public.ranking_recibo_contribuicoes;
CREATE TRIGGER trg_ranking_recibo_contribuicoes_updated_at
  BEFORE UPDATE ON public.ranking_recibo_contribuicoes
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ranking_read_model_updated_at();

CREATE OR REPLACE FUNCTION public.fn_mark_ranking_read_model_dirty(
  p_company_id UUID,
  p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes DATE;
BEGIN
  IF p_company_id IS NULL OR p_date IS NULL THEN
    RETURN;
  END IF;

  v_mes := DATE_TRUNC('month', p_date)::date;

  INSERT INTO public.ranking_read_model_status (
    modelo,
    company_id,
    mes,
    status,
    dirty_at,
    last_error
  )
  VALUES (
    'recibo_contribuicoes_v1',
    p_company_id,
    v_mes,
    'dirty',
    NOW(),
    NULL
  )
  ON CONFLICT (modelo, company_id, mes)
  DO UPDATE SET
    status = 'dirty',
    dirty_at = NOW(),
    last_error = NULL,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_dirty_read_model_vendas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.fn_mark_ranking_read_model_dirty(
      OLD.company_id,
      COALESCE(OLD.data_venda, CURRENT_DATE)
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.fn_mark_ranking_read_model_dirty(
      NEW.company_id,
      COALESCE(NEW.data_venda, CURRENT_DATE)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_dirty_read_model_vendas_recibos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT v.company_id INTO v_company_id
    FROM public.vendas v
    WHERE v.id = OLD.venda_id;

    PERFORM public.fn_mark_ranking_read_model_dirty(
      v_company_id,
      COALESCE(OLD.data_venda, CURRENT_DATE)
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT v.company_id INTO v_company_id
    FROM public.vendas v
    WHERE v.id = NEW.venda_id;

    PERFORM public.fn_mark_ranking_read_model_dirty(
      v_company_id,
      COALESCE(NEW.data_venda, CURRENT_DATE)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_dirty_read_model_conciliacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.fn_mark_ranking_read_model_dirty(
      OLD.company_id,
      COALESCE(OLD.movimento_data, CURRENT_DATE)
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.fn_mark_ranking_read_model_dirty(
      NEW.company_id,
      COALESCE(NEW.movimento_data, CURRENT_DATE)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_dirty_read_model_rateio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_data DATE;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_company_id := OLD.company_id;
    v_data := NULL;

    IF OLD.venda_recibo_id IS NOT NULL THEN
      SELECT v.company_id, COALESCE(vr.data_venda, v.data_venda)
      INTO v_company_id, v_data
      FROM public.vendas_recibos vr
      JOIN public.vendas v ON v.id = vr.venda_id
      WHERE vr.id = OLD.venda_recibo_id;
    ELSIF OLD.conciliacao_recibo_id IS NOT NULL THEN
      SELECT cr.company_id, cr.movimento_data
      INTO v_company_id, v_data
      FROM public.conciliacao_recibos cr
      WHERE cr.id = OLD.conciliacao_recibo_id;
    END IF;

    PERFORM public.fn_mark_ranking_read_model_dirty(v_company_id, v_data);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_company_id := NEW.company_id;
    v_data := NULL;

    IF NEW.venda_recibo_id IS NOT NULL THEN
      SELECT v.company_id, COALESCE(vr.data_venda, v.data_venda)
      INTO v_company_id, v_data
      FROM public.vendas_recibos vr
      JOIN public.vendas v ON v.id = vr.venda_id
      WHERE vr.id = NEW.venda_recibo_id;
    ELSIF NEW.conciliacao_recibo_id IS NOT NULL THEN
      SELECT cr.company_id, cr.movimento_data
      INTO v_company_id, v_data
      FROM public.conciliacao_recibos cr
      WHERE cr.id = NEW.conciliacao_recibo_id;
    END IF;

    PERFORM public.fn_mark_ranking_read_model_dirty(v_company_id, v_data);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_dirty_read_model_vendas ON public.vendas;
CREATE TRIGGER trg_dirty_read_model_vendas
  AFTER INSERT OR UPDATE OR DELETE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dirty_read_model_vendas();

DROP TRIGGER IF EXISTS trg_dirty_read_model_vendas_recibos ON public.vendas_recibos;
CREATE TRIGGER trg_dirty_read_model_vendas_recibos
  AFTER INSERT OR UPDATE OR DELETE ON public.vendas_recibos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dirty_read_model_vendas_recibos();

DROP TRIGGER IF EXISTS trg_dirty_read_model_conciliacao ON public.conciliacao_recibos;
CREATE TRIGGER trg_dirty_read_model_conciliacao
  AFTER INSERT OR UPDATE OR DELETE ON public.conciliacao_recibos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dirty_read_model_conciliacao();

DROP TRIGGER IF EXISTS trg_dirty_read_model_rateio ON public.vendas_recibos_rateio;
CREATE TRIGGER trg_dirty_read_model_rateio
  AFTER INSERT OR UPDATE OR DELETE ON public.vendas_recibos_rateio
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dirty_read_model_rateio();

ALTER TABLE public.ranking_read_model_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_recibo_contribuicoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ranking_read_model_status_select ON public.ranking_read_model_status;
DROP POLICY IF EXISTS ranking_recibo_contribuicoes_select ON public.ranking_recibo_contribuicoes;

REVOKE ALL ON public.ranking_read_model_status FROM anon, authenticated;
REVOKE ALL ON public.ranking_recibo_contribuicoes FROM anon, authenticated;
GRANT ALL ON public.ranking_read_model_status TO service_role;
GRANT ALL ON public.ranking_recibo_contribuicoes TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_mark_ranking_read_model_dirty(UUID, DATE) TO service_role;

COMMENT ON TABLE public.ranking_recibo_contribuicoes IS
  'Read model canônico de contribuição por recibo/vendedor para ranking, KPIs e comissões.';

COMMENT ON TABLE public.ranking_read_model_status IS
  'Controle de reconstrução/invalidade dos read models mensais do ranking.';
