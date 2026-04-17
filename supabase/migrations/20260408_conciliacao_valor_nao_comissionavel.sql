-- Migration: 20260408_conciliacao_valor_nao_comissionavel
-- Purpose: Adiciona campo valor_nao_comissionavel em conciliacao_recibos.
--          Permite que o gestor/master informe manualmente o valor não
--          comissionável de um recibo (vale viagem, carta de crédito,
--          ficha CVC-recadastro, etc.) diretamente na tela de conciliação.
--          O valor comissionável efetivo por recibo passa a ser:
--            valor_venda_real - valor_nao_comissionavel
--          Esse campo é descontado do bruto em KPIs, dashboards, ranking e relatórios.

ALTER TABLE public.conciliacao_recibos
  ADD COLUMN IF NOT EXISTS valor_nao_comissionavel numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.conciliacao_recibos.valor_nao_comissionavel IS
  'Valor manualmente informado de pagamentos não comissionáveis (vale viagem, carta de crédito, ficha CVC, etc). Descontado de valor_venda_real para obter a base comissionável real do recibo.';
