# Fornecedores / Parceiros / Apoio Operacional

## Status
- Parcialmente espelhado

## Validado
- O `vtur-app` usa `FornecedoresIsland` como fonte principal de verdade para o módulo.
- O fluxo legado é orientado por:
  - `nome_completo`
  - `nome_fantasia`
  - `localizacao`
  - `cidade` / `estado`
  - `telefone`
  - `whatsapp`
  - `telefone_emergencia`
  - `responsavel`
  - `tipo_faturamento`
  - `principais_servicos`
- A exclusão no legado é bloqueada quando há produtos vinculados ao fornecedor.
- Produtos e vouchers consomem esse cadastro como apoio operacional.

## Corrigido nesta etapa
- Refeito backend de fornecedores para refletir o shape operacional do legado, com leitura compatível de campos novos e antigos.
- Refeito `GET /api/v1/fornecedores` com:
  - escopo por empresa/perfil
  - payload operacional
  - contagem de produtos vinculados
- Refeito `GET/PUT/DELETE /api/v1/fornecedores/[id]` com:
  - detalhe completo
  - atualização real
  - bloqueio de exclusão por vínculos em produtos
  - exposição de produtos e vouchers relacionados
- Refeito `POST /api/v1/fornecedores/create` com validações alinhadas ao legado.
- Refeita a listagem no Svelte para:
  - remover ações por linha
  - abrir detalhe no clique da linha
  - mostrar nome fantasia, local, faturamento, telefones e serviços
  - permitir busca por múltiplos campos
  - aplicar filtros por status, localização e faturamento
- Refeito o formulário/detalhe para:
  - separar Brasil x Exterior
  - validar CNPJ/CEP quando aplicável
  - usar busca de cidade com preenchimento automático de estado
  - centralizar contato, faturamento e serviços
  - mostrar vínculos com produtos e vouchers
  - excluir apenas no detalhe
- Ajustado o lookup de fornecedores em viagens para usar `nome_fantasia` / `nome_completo` antes do campo legado `nome`.

## Ainda falta
- Validar se existe no `vtur-app` algum submódulo separado de parceiros/prestadores além de `fornecedores` que também precise virar tela própria no Svelte.
- Revisar integrações consumidas por Financeiro quando esse módulo for tratado em profundidade.
- Revisar usos de fornecedor em roteiros/dossiês/importações para garantir paridade total dos campos derivados.

## Observações
- O módulo foi alinhado ao fluxo operacional do legado sem mexer em Vouchers.
- O ruído global de `svelte-check` continua existindo em `viagens` e outros módulos fora deste escopo.
