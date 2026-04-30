-- ============================================================
-- DIAGNOSTICO: Verificar se sync_venda_children existe no banco
-- Execute isto no SQL Editor do Supabase e me envie o resultado
-- ============================================================

-- 1. Verificar se a funcao sync_venda_children existe
select 
  proname as funcao,
  pronamespace::regnamespace as schema,
  pg_get_function_arguments(oid) as argumentos
from pg_proc
where proname = 'sync_venda_children';

-- 2. Verificar se a funcao auxiliar existe
select 
  proname as funcao,
  pronamespace::regnamespace as schema
from pg_proc
where proname = 'is_forma_pagamento_nao_comissionavel';

-- 3. Verificar se a funcao normalize existe
select 
  proname as funcao,
  pronamespace::regnamespace as schema
from pg_proc
where proname = 'normalize';

-- 4. Verificar se a tabela de parametros existe e tem dados
select 
  count(*) as total_termos,
  string_agg(termo, ', ') as termos_ativos
from parametros_pagamentos_nao_comissionaveis
where ativo = true;

-- 5. Testar se a funcao auxiliar funciona
select is_forma_pagamento_nao_comissionavel('credito diversos') as teste_credito_diversos;

-- 6. Testar chamada direta da sync_venda_children (vai falhar se nao existir)
-- Comente a linha abaixo se quiser apenas verificar existencia
-- select sync_venda_children(null, null, null, null, null, '[]'::jsonb, '[]'::jsonb);
