# Padronização Flowbite no `vtur-svelte`

## Objetivo

Mapear onde o projeto já usa `flowbite-svelte` de forma consistente, onde ainda há HTML nativo espalhado, e quais componentes/wrappers precisamos consolidar para reduzir variação visual, custo de manutenção e bugs de comportamento.

## Resumo executivo

- O projeto **já tem uma base boa de padronização** via wrappers internos em `src/lib/components/ui`.
- O problema atual **não é falta de Flowbite no projeto**; é **uso inconsistente da camada de UI**.
- A frente já avançou bastante: os wrappers-base foram criados, as telas críticas de `financeiro`, `vendas`, `clientes`, `roteiros` e boa parte de `vouchers` já migraram.
- Hoje o sistema mistura:
  - wrappers próprios baseados em `flowbite-svelte`
  - imports diretos de `flowbite-svelte` em poucos arquivos
  - muitos elementos HTML nativos (`input`, `select`, `textarea`, `button`, `table`)
- A padronização mais segura é:
  - **não espalhar imports diretos do Flowbite em todas as páginas**
  - **expandir a camada `src/lib/components/ui`**
  - **migrar telas por ondas**

## O que já existe bem estruturado

Wrappers internos existentes:

- `Button`
- `Card`
- `Dialog`
- `DataTable`
- `Badge`
- `Tabs`
- `Input`
- `FieldInput`
- `FieldTextarea`
- `FieldCheckbox`
- `FieldDatalistInput`
- `FieldToggle`
- `FieldRadioGroup`
- `FieldSelect`
- `FileInput`
- `FileDropzone`
- `SimpleTable`
- `PageHeader`
- `AlertMessage`
- `PaginationControls`
- `FormPanel`
- `FormActions`

Arquivos-base:

- `src/lib/components/ui/index.ts`
- `src/lib/components/ui/Button.svelte`
- `src/lib/components/ui/Input.svelte`
- `src/lib/components/ui/Dialog.svelte`
- `src/lib/components/ui/DataTable.svelte`

## Progresso já consolidado

Ondas já executadas nesta frente:

- `financeiro/conciliacao`
- `financeiro/comissoes`
- `financeiro/formas-pagamento`
- `financeiro/regras`
- `financeiro/comissoes/regras`
- `vendas/importar`
- `vendas/nova`
- `vendas/[id]/editar`
- `clientes/novo`
- `clientes/[id]/editar`
- `orcamentos/roteiros/[id]`
- `parametros/notificacoes`
- `VoucherEditorModal` em seus blocos principais
- `operacao/vouchers/novo` em seus blocos principais
- `FornecedorForm` na maior parte do formulário
- `ProdutoOperacionalForm` na maior parte do formulário, inclusive grade de tarifas
- `parametros/+page.svelte` nos blocos principais e nas grades densas de conciliação
- `parametros/crm/+page.svelte` no formulário de assinatura e ações auxiliares
- `master/empresas/[id]` em blocos de billing e vínculos
- `admin/empresas/[id]` em blocos de billing e portfólio master

Ajustes estruturais já feitos durante a migração:

- `FieldInput` e `Input` corrigidos na raiz para não “sumirem” e para manterem ícones posicionados corretamente
- `operacao/vouchers/+page.svelte` alinhado ao fluxo novo em página, sem reabrir o editor de criação como modal sobreposto

## Inventário rápido

### Uso atual de wrappers

- `<Button>`: 315 ocorrências
- `<Card>`: 257 ocorrências
- `<Dialog>`: 53 ocorrências
- `<DataTable>`: 54 ocorrências
- `<Badge>`: 30 ocorrências
- `<Tabs>`: 3 ocorrências
- `<Input>`: 2 ocorrências
- `<FieldInput>`: 7 ocorrências
- `<FieldSelect>`: 3 ocorrências

### Uso atual de HTML nativo em `.svelte`

- `<input>`: 660 ocorrências
- `<select>`: 185 ocorrências
- `<textarea>`: 66 ocorrências
- `<button>`: 226 ocorrências
- `<table>`: 20 ocorrências

### Sinal mais importante

- Existem **117 arquivos Svelte** com elementos nativos candidatos à padronização.
- Apenas **11 arquivos** fazem import direto de `flowbite-svelte`.

Conclusão:

- O projeto **já opera com a ideia correta de wrappers internos**.
- O gargalo está em **falta de cobertura da biblioteca interna**, principalmente para formulários e controles auxiliares.

## Primitives disponíveis no `flowbite-svelte`

Verificado localmente na dependência instalada:

- `Input`
- `Select`
- `Textarea`
- `Checkbox`
- `Radio`
- `Toggle`
- `Dropzone`
- `Fileupload`
- `Table`
- `Pagination`
- `Tabs`
- `Modal`
- `Badge`
- `Alert`
- `Dropdown`

## Gaps principais na camada interna

Wrappers já cobertos nesta frente:

1. `Textarea`
2. `Checkbox`
3. `Toggle`
4. `Radio`
5. `FileInput`
6. `Dropzone`
7. `Table` simples
8. `Datalist` simples

Gaps ainda relevantes:

1. `Search/filter inputs` especializados
2. wrapper para `autocomplete/datalist` e campos com busca inline
3. estados vazios/helper states para formulários maiores
4. wrappers para grids densos de parametrização/admin
5. wrapper para grupos de escolha em formato “card/segmented”

## Hotspots prioritários

Arquivos que ainda concentram mais HTML cru relevante:

1. `src/lib/components/modais/VoucherEditorModal.svelte`
2. `src/routes/(app)/operacao/vouchers/novo/+page.svelte`
3. `src/lib/components/cadastros/FornecedorForm.svelte`
4. `src/routes/(app)/parametros/empresa/+page.svelte`
5. `src/routes/(app)/financeiro/caixa/+page.svelte`
6. `src/routes/(app)/parametros/tipo-produtos/+page.svelte`
7. `src/routes/(app)/operacao/controle-sac/+page.svelte`
8. `src/routes/(app)/clientes/[id]/+page.svelte`
9. `src/routes/(app)/parametros/avisos/+page.svelte`
10. `src/lib/components/cadastros/ProdutoOperacionalForm.svelte`

## Onde a padronização mais falta

### 1. Checkboxes e toggles

Arquivos representativos:

- `src/routes/(app)/parametros/notificacoes/+page.svelte`
- `src/routes/(app)/admin/usuarios/[id]/+page.svelte`
- `src/routes/(app)/master/usuarios/[id]/+page.svelte`
- `src/routes/(app)/financeiro/conciliacao/+page.svelte`
- `src/routes/(app)/vendas/nova/+page.svelte`
- `src/routes/(app)/vendas/[id]/editar/+page.svelte`
- `src/routes/(app)/parametros/tipo-produtos/+page.svelte`

Problema:

- Muitos checkboxes com classes manuais
- Alguns simulando toggle com HTML puro
- Baixa consistência de acessibilidade, spacing e estados

Status:

- `FieldCheckbox.svelte` criado
- `FieldToggle.svelte` criado
- `parametros/notificacoes`, `financeiro/conciliacao`, `financeiro/comissoes`, `vendas/nova` e `vendas/[id]/editar` já migrados em partes críticas

### 2. Textareas

Arquivos representativos:

- `src/lib/components/modais/VoucherEditorModal.svelte`
- `src/routes/(app)/operacao/vouchers/novo/+page.svelte`
- `src/routes/(app)/orcamentos/roteiros/[id]/+page.svelte`
- `src/routes/(app)/vendas/importar/+page.svelte`
- `src/routes/(app)/financeiro/comissoes/+page.svelte`
- `src/routes/(app)/financeiro/conciliacao/+page.svelte`
- `src/routes/(app)/operacao/controle-sac/+page.svelte`

Problema:

- `textarea` com estilos repetidos (`vtur-input`)
- labels e helpers manuais
- comportamento inconsistente entre modais e páginas

Status:

- `FieldTextarea.svelte` criado com `label`, `helper`, `error`, `rows`, `resize`, `required` e modo `monospace`
- `financeiro/conciliacao`, `financeiro/comissoes`, `orcamentos/roteiros/[id]`, `clientes/novo` e `clientes/[id]/editar` já usam o wrapper

### 3. Selects e formulários ainda fora do wrapper

Mesmo com `FieldSelect`, ainda há `select` nativo em:

- `src/lib/components/modais/VoucherEditorModal.svelte`
- `src/routes/(app)/operacao/vouchers/novo/+page.svelte`
- `src/lib/components/cadastros/FornecedorForm.svelte`
- `src/lib/components/cadastros/ProdutoOperacionalForm.svelte` em pontos remanescentes mais ricos que o `datalist` simples

Recomendação:

- Fortalecer `FieldSelect`
- Criar variantes para `inline`, `dense`, `filter`, `modal`

Status:

- `financeiro/conciliacao`, `financeiro/comissoes`, `financeiro/regras`, `financeiro/comissoes/regras`, `vendas/nova`, `vendas/[id]/editar`, `clientes/*`, `FornecedorForm` e `ProdutoOperacionalForm` já reduziram bastante os `selects` simples
- `parametros/+page.svelte`, `parametros/crm/+page.svelte`, `master/empresas/[id]` e `admin/empresas/[id]` já saíram da faixa crítica
- `parametros/equipe`, `parametros/escalas` e `parametros/metas` já migraram seus blocos de maior valor
- `admin/usuarios/[id]`, `master/usuarios/[id]` e `parametros/tipo-pacotes` já saíram da faixa crítica
- `parametros/avisos` já saiu da faixa crítica
- `FieldDatalistInput.svelte` já cobre os casos simples e foi aplicado em `ProdutoOperacionalForm`
- o que sobra com mais valor agora está concentrado em `VoucherEditorModal`, `operacao/vouchers/novo`, `FornecedorForm` e nos fluxos com `autocomplete` mais ricos

### 4. Upload de arquivos

Arquivos:

- `src/routes/(app)/vendas/importar/+page.svelte`
- `src/routes/(app)/financeiro/conciliacao/+page.svelte`

Status:

- `FileInput.svelte` criado
- `FileDropzone.svelte` criado
- `financeiro/conciliacao` já migrado
- `vendas/importar` já migrado para `FileDropzone`, `FieldTextarea`, `FieldInput`, `FieldSelect`, `FieldCheckbox` e `FieldRadioGroup`

Próximo passo:

- reutilizar `FileDropzone.svelte` em outros fluxos de importação
- centralizar validação visual, loading e mensagens de erro

### 5. Tabelas avulsas

Arquivos representativos:

- `src/routes/(app)/parametros/equipe/+page.svelte`
- `src/routes/(app)/financeiro/regras/+page.svelte`
- `src/routes/(app)/financeiro/comissoes/regras/+page.svelte`
- `src/routes/(app)/financeiro/caixa/+page.svelte`
- `src/routes/(app)/clientes/[id]/+page.svelte`
- `src/routes/(app)/vendas/[id]/+page.svelte`
- `src/routes/(app)/relatorios/+page.svelte`

Problema:

- Algumas telas usam `DataTable`
- Outras usam `<table>` puro com estilos locais
- Isso aumenta divergência de headers, zebra striping, densidade e responsividade

Status:

- `SimpleTable.svelte` criado
- `financeiro/regras` e `financeiro/comissoes/regras` já usam o wrapper

Próximo passo:

- quando houver listagem genérica: migrar para `DataTable`
- quando for tabela semântica/detail view: manter `SimpleTable.svelte`

### 5. Radios e grupos de escolha

Arquivos já migrados:

- `src/routes/(app)/clientes/novo/+page.svelte`
- `src/routes/(app)/clientes/[id]/editar/+page.svelte`

Status:

- `FieldRadioGroup.svelte` criado para evitar repetição de radios nativos em cadastros

### 6. Botões nativos ainda espalhados

Ainda existem muitos `<button>`, mas uma parte relevante é legítima e estrutural.

Exemplos que ainda merecem revisão:

- `src/routes/(app)/admin/usuarios/[id]/+page.svelte`
- `src/routes/(app)/master/usuarios/[id]/+page.svelte`
- `src/lib/components/modais/VoucherEditorModal.svelte`
- `src/routes/(app)/operacao/vouchers/novo/+page.svelte`
- `src/routes/(app)/parametros/equipe/+page.svelte`
- `src/routes/(app)/parametros/metas/+page.svelte`

Recomendação:

- Manter `<button>` nativo apenas quando:
  - o botão é estrutural e muito customizado
  - há necessidade de `class="contents"`
  - existe comportamento de item clicável sem semântica visual de botão padrão
- Nos demais casos, migrar para `Button`

## Estratégia segura de padronização

### Regra principal

**Padronizar via wrappers internos, não via imports diretos em massa do Flowbite.**

Isso preserva:

- consistência visual
- tipagem centralizada
- correções globais em um ponto só
- menor custo de manutenção futura

### Ordem sugerida

#### Onda 1: expandir a camada base

Status: concluída

Entregas:

- `FieldTextarea.svelte`
- `FieldCheckbox.svelte`
- `FieldToggle.svelte`
- `FieldRadioGroup.svelte`
- `FileInput.svelte`
- `FileDropzone.svelte`
- `SimpleTable.svelte`

#### Onda 2: migrar telas com maior retorno

Status: majoritariamente concluída

Entregas principais:

1. `financeiro/conciliacao`
2. `financeiro/comissoes`
3. `financeiro/comissoes/regras`
4. `financeiro/caixa`
5. `vendas/importar`
6. `vendas/nova`
7. `vendas/[id]/editar`
8. `orcamentos/roteiros/[id]`

#### Onda 3: telas administrativas e parametrização

Status: parcialmente concluída

Já migrado:

- `parametros/notificacoes`
- `parametros/+page.svelte` nos blocos principais e nas grades de conciliação
- `parametros/crm/+page.svelte` no formulário de assinatura e ações auxiliares
- partes de `parametros/empresa`, `parametros/avisos`
- `master/empresas/[id]`
- `admin/empresas/[id]`
- `admin/usuarios/[id]`
- `master/usuarios/[id]`
- `parametros/tipo-pacotes/+page.svelte`
- `parametros/avisos/+page.svelte`

Prioridade restante:

- `parametros/empresa`
- `VoucherEditorModal`
- `operacao/vouchers/novo`
- `FornecedorForm`
- `ProdutoOperacionalForm`

#### Onda 4: formulários operacionais grandes

Prioridade:

- `VoucherEditorModal`
- `operacao/vouchers/novo`
- `FornecedorForm`
- `ProdutoOperacionalForm`

Status atual desta onda:

- `VoucherEditorModal` já teve os blocos principais do passo 1 migrados para `FieldInput`, `FieldSelect` e `FieldTextarea`
- `operacao/vouchers/novo` já teve os blocos principais do passo 1 migrados para `FieldInput`, `FieldSelect` e `FieldTextarea`
- `operacao/vouchers/+page.svelte` já foi alinhado para abrir criação em página, não em modal sobreposto
- `FornecedorForm` já está majoritariamente em wrappers, com exceções intencionais em busca/autocomplete de cidade e cartões de localização
- `ProdutoOperacionalForm` já está majoritariamente em wrappers, e os `datalists` simples já migraram para `FieldDatalistInput`
- `financeiro/caixa` já teve filtros e formulário de movimentação migrados para wrappers internos

## Critérios de migração

Ao migrar uma tela, aplicar estes critérios:

1. Não misturar wrapper novo com HTML cru equivalente no mesmo bloco.
2. Preservar `bind:value`, `bind:checked` e eventos atuais.
3. Manter tema VTUR na camada de wrapper, não na página.
4. Centralizar `label`, `helper`, `error`, `required` no componente.
5. Evitar introduzir import direto de `flowbite-svelte` em páginas de negócio quando houver wrapper interno possível.

## Recomendação final

A decisão correta para o projeto é:

- **assumir `flowbite-svelte` como base oficial**
- **assumir `src/lib/components/ui` como a única porta de entrada recomendada**
- **parar de criar novos formulários com HTML cru**

## Próximo passo sugerido

Próxima rodada com melhor custo/benefício:

1. `src/routes/(app)/parametros/empresa/+page.svelte`
2. aplicar `FieldDatalistInput` onde couber em `FornecedorForm`
3. aplicar `FieldDatalistInput` e wrappers estruturais em `VoucherEditorModal`
4. aplicar `FieldDatalistInput` e wrappers estruturais em `operacao/vouchers/novo`
5. decidir se vale um wrapper específico para `autocomplete` rico de cidade/lista remota
