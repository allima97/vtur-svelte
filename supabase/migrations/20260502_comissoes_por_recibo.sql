-- 2026-05-02: comissoes passam a ser controladas por recibo.
-- Mantem compatibilidade com registros antigos por venda, mas a chave nova
-- para baixas individuais usa recibo_id + vendedor_id.

ALTER TABLE public.comissoes
  ADD COLUMN IF NOT EXISTS recibo_id UUID;

DO $$
BEGIN
  IF to_regclass('public.vendas_recibos') IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_recibo_id_fkey'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_recibo_id_fkey
      FOREIGN KEY (recibo_id) REFERENCES public.vendas_recibos(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_comissoes_recibo ON public.comissoes(recibo_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_lookup_recibo ON public.comissoes(company_id, recibo_id, vendedor_id);

DROP INDEX IF EXISTS public.idx_comissoes_unica_ativa;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comissoes_unica_ativa_recibo
  ON public.comissoes(recibo_id, vendedor_id)
  WHERE recibo_id IS NOT NULL
    AND vendedor_id IS NOT NULL
    AND status <> 'CANCELADA';

CREATE UNIQUE INDEX IF NOT EXISTS idx_comissoes_unica_ativa_venda_sem_recibo
  ON public.comissoes(venda_id, vendedor_id)
  WHERE recibo_id IS NULL
    AND venda_id IS NOT NULL
    AND vendedor_id IS NOT NULL
    AND status <> 'CANCELADA';

COMMENT ON COLUMN public.comissoes.recibo_id IS
  'Recibo da venda que originou a comissão. Quando preenchido, a baixa é individual por recibo/vendedor.';
