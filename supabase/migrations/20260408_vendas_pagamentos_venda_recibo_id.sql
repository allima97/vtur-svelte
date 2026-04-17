-- Migration: 20260408_vendas_pagamentos_venda_recibo_id
-- Purpose: Adiciona venda_recibo_id em vendas_pagamentos para permitir
--          cálculo de não-comissionável por recibo (em vez de por venda).
--          Backfill automático para vendas com recibo único.

-- 1. Adiciona coluna
ALTER TABLE public.vendas_pagamentos
  ADD COLUMN IF NOT EXISTS venda_recibo_id uuid NULL
    REFERENCES public.vendas_recibos(id) ON DELETE SET NULL;

-- 2. Índice para join eficiente
CREATE INDEX IF NOT EXISTS idx_vendas_pagamentos_venda_recibo_id
  ON public.vendas_pagamentos (venda_recibo_id);

-- 3. Backfill: vendas com exatamente 1 recibo vinculam todos os pagamentos a ele
WITH recibo_unico AS (
  SELECT
    venda_id,
    (array_agg(id))[1] AS recibo_id,
    COUNT(*) AS total
  FROM public.vendas_recibos
  GROUP BY venda_id
  HAVING COUNT(*) = 1
)
UPDATE public.vendas_pagamentos vp
SET venda_recibo_id = ru.recibo_id
FROM recibo_unico ru
WHERE vp.venda_id = ru.venda_id
  AND vp.venda_recibo_id IS NULL;
