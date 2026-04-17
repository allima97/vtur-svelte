# Cadastros Base Operacionais

## Status
- Parcialmente espelhado

## Validado
- `cadastros/produtos` e `cadastros/destinos` no `vtur-app` usam o mesmo fluxo operacional (`ProdutosIsland`).
- O payload legado depende de `/api/v1/produtos/base`, com `produtos`, `tipos`, `cidades`, `subdivisoes`, `paises`, `fornecedores` e sugestões de destino/atração/melhor época.
- O fluxo legado usa tarifas por produto em `/api/v1/produtos/tarifas`.
- Vendas dependem de `produtos.nome`, `destino`, `cidade_id`, `tipo_produto` e `todas_as_cidades`.

## Corrigido nesta etapa
- Criado `/api/v1/produtos/base` no Svelte para expor a base operacional rica consumida por produtos/destinos.
- Criado `/api/v1/produtos/tarifas` com leitura e persistência de tarifas por produto.
- Refeito `/api/v1/produtos`, `/api/v1/produtos/[id]` e `/api/v1/produtos/create` para usar payload compatível com o fluxo operacional em vez do CRUD simplificado anterior.
- Refeitas as listagens de `produtos` e `destinos` para:
  - remover ações por linha
  - abrir o registro no clique da linha
  - mostrar colunas operacionais reais
  - aplicar busca/filtro por tipo, status e abrangência
- Refeitos os formulários de novo/edição de `produtos` e `destinos` com:
  - tipo de produto
  - destino
  - cidade
  - abrangência global vs por cidade
  - fornecedor
  - atração principal
  - melhor época
  - duração sugerida
  - nível de preço
  - imagem
  - informações importantes
  - status
  - valores base
  - grade de tarifas
- Ajustado `vendas/cadastro-base` para consumir produtos ativos com `todas_as_cidades`, `informacoes_importantes` e `fornecedor_id`.

## Ainda falta
- Validar e corrigir `circuitos` com a mesma profundidade do `vtur-app`, incluindo sincronização com produto e estrutura de dias/cidades/datas.
- Validar e corrigir `fornecedores` com a mesma profundidade do `vtur-app`, incluindo campos operacionais adicionais e regras de exclusão por vínculo.
- Confirmar se `cidades`, `estados` e `paises` precisam ganhar telas equivalentes próprias no Svelte além do uso indireto em produtos/destinos.
- Validar o consumo equivalente em Orçamentos quando esse módulo for tratado.

## Observações
- `destinos` no legado não é um CRUD separado de cidades; ele reaproveita o mesmo cadastro operacional de produtos.
- Vouchers não foram alterados.
