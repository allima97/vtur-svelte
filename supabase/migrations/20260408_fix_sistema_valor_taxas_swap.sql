-- 2026-04-08: Corrigir sistema_valor_total e sistema_valor_taxas que foram populados incorretamente
-- 
-- PROBLEMA RAIZ:
--   1. Função calcularValorVendaReal() estava subtraindo valor_taxas (ERRADO)
--      Isto causou valor_venda_real = 2.207,17 - 158,50 - 52,93 = 1.995,74
--   2. Essa valor (1.995,74) foi usado para atualizar vendas_recibos.valor_total
--   3. Agora sistema_valor_total = 1.995,74 (lê do vendas_recibos.valor_total corrompido)
--
-- SOLUÇÃO:
--   1. Corrigir vendas_recibos.valor_total = valor_lancamentos (bruto correto)
--   2. Corrigir sistema_valor_total baseado no valor_lancamentos
--   3. Verificar sistema_valor_taxas também

BEGIN;

-- PASSO 1: Corrigir vendas_recibos.valor_total que foi atualizado com valor errado
-- valor_total deve ser = valor_lancamentos (bruto completo, não descontos), não valor_venda_real
WITH recibos_venda_fix AS (
  SELECT
    vr.id as recibo_id,
    cr.valor_lancamentos as valor_total_correto
  FROM public.vendas_recibos vr
  INNER JOIN public.conciliacao_recibos cr ON cr.venda_recibo_id = vr.id
  WHERE cr.conciliado = true
    AND cr.venda_recibo_id = vr.id
    -- Detectar quando valor_total foi corrompido com (valor_venda_real - valor_taxas)
    AND ABS(vr.valor_total - cr.valor_venda_real) > 0.01
    AND ABS(vr.valor_total - (cr.valor_venda_real - cr.valor_taxas)) < 0.01
)
UPDATE public.vendas_recibos vr
SET
  valor_total = recibos_venda_fix.valor_total_correto,
  updated_at = NOW()
FROM recibos_venda_fix
WHERE vr.id = recibos_venda_fix.recibo_id;

-- PASSO 2: Recalcular sistema_valor_total e sistema_valor_taxas
-- Devem ser atualizados para refletir valores ATUAIS em vendas_recibos
WITH conciliacao_fix AS (
  SELECT
    cr.id as conciliacao_id,
    vr.valor_total as sistema_valor_total_correto,
    vr.valor_taxas as sistema_valor_taxas_correto
  FROM public.conciliacao_recibos cr
  INNER JOIN public.vendas_recibos vr ON vr.id = cr.venda_recibo_id
  WHERE cr.conciliado = true
    AND cr.venda_recibo_id IS NOT NULL
)
UPDATE public.conciliacao_recibos cr
SET
  sistema_valor_total = conciliacao_fix.sistema_valor_total_correto,
  sistema_valor_taxas = conciliacao_fix.sistema_valor_taxas_correto,
  last_checked_at = NOW(),
  updated_at = NOW()
FROM conciliacao_fix
WHERE cr.id = conciliacao_fix.conciliacao_id;

COMMIT;
