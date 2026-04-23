CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID,
  vendedor_id UUID,
  regra_id UUID,
  valor_venda NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  valor_comissionavel NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  percentual_aplicado NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  valor_comissao NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  data_pagamento DATE,
  observacoes_pagamento TEXT,
  pago_por UUID,
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  company_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS venda_id UUID;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS vendedor_id UUID;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS regra_id UUID;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS valor_venda NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS valor_comissionavel NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS percentual_aplicado NUMERIC(5,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS valor_comissao NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE';
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS data_pagamento DATE;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS observacoes_pagamento TEXT;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS pago_por UUID;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS mes_referencia INTEGER;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS ano_referencia INTEGER;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.comissoes
SET
  valor_venda = COALESCE(valor_venda, 0),
  valor_comissionavel = COALESCE(valor_comissionavel, 0),
  percentual_aplicado = COALESCE(percentual_aplicado, 0),
  valor_comissao = COALESCE(valor_comissao, 0),
  status = UPPER(COALESCE(NULLIF(TRIM(status), ''), 'PENDENTE')),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE
  valor_venda IS NULL
  OR valor_comissionavel IS NULL
  OR percentual_aplicado IS NULL
  OR valor_comissao IS NULL
  OR status IS NULL
  OR BTRIM(status) = ''
  OR created_at IS NULL
  OR updated_at IS NULL;

ALTER TABLE public.comissoes ALTER COLUMN valor_venda SET DEFAULT 0.00;
ALTER TABLE public.comissoes ALTER COLUMN valor_comissionavel SET DEFAULT 0.00;
ALTER TABLE public.comissoes ALTER COLUMN percentual_aplicado SET DEFAULT 0.00;
ALTER TABLE public.comissoes ALTER COLUMN valor_comissao SET DEFAULT 0.00;
ALTER TABLE public.comissoes ALTER COLUMN status SET DEFAULT 'PENDENTE';
ALTER TABLE public.comissoes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.comissoes ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.comissoes ALTER COLUMN valor_venda SET NOT NULL;
ALTER TABLE public.comissoes ALTER COLUMN valor_comissionavel SET NOT NULL;
ALTER TABLE public.comissoes ALTER COLUMN percentual_aplicado SET NOT NULL;
ALTER TABLE public.comissoes ALTER COLUMN valor_comissao SET NOT NULL;
ALTER TABLE public.comissoes ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.comissoes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.comissoes ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_status_check'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_status_check
      CHECK (status IN ('PENDENTE', 'PROCESSANDO', 'PAGA', 'CANCELADA'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_percentual_aplicado_check'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_percentual_aplicado_check
      CHECK (percentual_aplicado >= 0 AND percentual_aplicado <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_valor_comissao_check'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_valor_comissao_check
      CHECK (valor_comissao >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_valor_comissionavel_check'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_valor_comissionavel_check
      CHECK (valor_comissionavel >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_mes_referencia_check'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_mes_referencia_check
      CHECK (mes_referencia IS NULL OR (mes_referencia >= 1 AND mes_referencia <= 12));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_ano_referencia_check'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_ano_referencia_check
      CHECK (ano_referencia IS NULL OR (ano_referencia >= 2000 AND ano_referencia <= 2100));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.vendas') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comissoes_venda_id_fkey'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_venda_id_fkey
      FOREIGN KEY (venda_id) REFERENCES public.vendas(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.users') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comissoes_vendedor_id_fkey'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_vendedor_id_fkey
      FOREIGN KEY (vendedor_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.users') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comissoes_pago_por_fkey'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_pago_por_fkey
      FOREIGN KEY (pago_por) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.users') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comissoes_created_by_fkey'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.companies') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comissoes_company_id_fkey'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.regras_comissao') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comissoes_regra_id_fkey'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_regra_id_fkey
      FOREIGN KEY (regra_id) REFERENCES public.regras_comissao(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_comissoes_venda ON public.comissoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor ON public.comissoes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_regra ON public.comissoes(regra_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON public.comissoes(status);
CREATE INDEX IF NOT EXISTS idx_comissoes_company ON public.comissoes(company_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_data_pagamento ON public.comissoes(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_comissoes_referencia ON public.comissoes(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_comissoes_lookup ON public.comissoes(company_id, venda_id, vendedor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comissoes_unica_ativa
  ON public.comissoes(venda_id, vendedor_id)
  WHERE venda_id IS NOT NULL
    AND vendedor_id IS NOT NULL
    AND status <> 'CANCELADA';

COMMENT ON TABLE public.comissoes IS 'Ledger canônico de comissões calculadas e baixas de pagamento.';
COMMENT ON COLUMN public.comissoes.valor_venda IS 'Valor bruto da venda usado no snapshot do cálculo.';
COMMENT ON COLUMN public.comissoes.valor_comissionavel IS 'Base comissionável persistida no momento do cálculo.';
COMMENT ON COLUMN public.comissoes.percentual_aplicado IS 'Percentual efetivamente aplicado na comissão persistida.';
COMMENT ON COLUMN public.comissoes.valor_comissao IS 'Valor final da comissão persistida para a venda/vendedor.';
COMMENT ON COLUMN public.comissoes.status IS 'Status operacional: PENDENTE, PROCESSANDO, PAGA ou CANCELADA.';
COMMENT ON COLUMN public.comissoes.observacoes_pagamento IS 'Observações operacionais da baixa, edição ou cancelamento.';

DROP TRIGGER IF EXISTS trg_comissoes_updated_at ON public.comissoes;
CREATE TRIGGER trg_comissoes_updated_at
  BEFORE UPDATE ON public.comissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comissoes'
      AND policyname = 'comissoes_select'
  ) THEN
    CREATE POLICY comissoes_select ON public.comissoes
      FOR SELECT USING (
        vendedor_id = auth.uid()
        OR company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.users u
          JOIN public.user_types ut ON ut.id = u.user_type_id
          WHERE u.id = auth.uid()
            AND ut.name IN ('ADMIN', 'MASTER', 'GESTOR')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comissoes'
      AND policyname = 'comissoes_all'
  ) THEN
    CREATE POLICY comissoes_all ON public.comissoes
      FOR ALL USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          JOIN public.user_types ut ON ut.id = u.user_type_id
          WHERE u.id = auth.uid()
            AND ut.name IN ('ADMIN', 'MASTER', 'GESTOR', 'FINANCEIRO')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users u
          JOIN public.user_types ut ON ut.id = u.user_type_id
          WHERE u.id = auth.uid()
            AND ut.name IN ('ADMIN', 'MASTER', 'GESTOR', 'FINANCEIRO')
        )
      );
  END IF;
END $$;