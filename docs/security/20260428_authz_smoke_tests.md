# Smoke Tests de Autorizacao (papel x empresa)

Objetivo: detectar regressao de permissao antes e apos deploy.

## Perfis de teste

1. Admin global
2. Master com portfolio aprovado (empresa A)
3. Gestor da empresa A
4. Vendedor da empresa A
5. Gestor da empresa B (controle cruzado)

## Dados minimos

1. Empresa A e Empresa B
2. 1 venda e 1 pagamento por empresa
3. 1 documento de viagem por empresa
4. 1 consultoria por empresa

## Casos obrigatorios

## A) API auth

1. Sem sessao chamar endpoint privado -> esperado 401
2. Com sessao valida chamar endpoint privado -> esperado 200/204
3. Endpoint publico permitido continua acessivel (health/cards)

## B) Admin

1. Admin lista/edita empresas -> permitido
2. Nao-admin tenta alterar empresas -> negado (403)
3. Nao-admin tenta ler configuracao admin_system_settings -> negado (403)

## C) Multiempresa em documentos

1. Gestor A atualiza documento da empresa A -> permitido
2. Gestor A atualiza documento da empresa B -> negado (403)
3. Gestor A exclui documento da empresa B -> negado (403)

## D) Multiempresa em pagamentos

1. Gestor A concilia pagamento da empresa A -> permitido
2. Gestor A concilia pagamento da empresa B -> negado (403)
3. Gestor A faz upload comprovante em pagamento da empresa B -> negado (403)

## E) Consultoria iCal

1. Usuario autenticado exporta iCal sem id -> permitido (arquivo com eventos)
2. Usuario autenticado exporta iCal com id valido em escopo -> permitido
3. Usuario sem sessao exporta iCal -> 401

## F) Sanidade de RLS

1. Confirmar FORCE RLS em tabelas criticas via SQL semanal
2. Confirmar mismatch de company em pagamentos = 0

## Evidencias a registrar

1. Status HTTP e payload resumido
2. Usuario/papel usado em cada teste
3. IDs de recursos usados (empresa A/B)
4. Resultado final por caso (PASS/FAIL)

## Criticidade de falha

Bloqueia deploy se falhar:
1. Qualquer caso de acesso cruzado entre empresas
2. Qualquer caso de alteracao administrativa por nao-admin
3. Qualquer endpoint privado acessivel sem sessao
