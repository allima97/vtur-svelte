# Padronização Flowbite no `vtur-svelte`

## Objetivo

Consolidar a camada de UI do projeto sobre wrappers internos em `src/lib/components/ui`, evitando espalhar HTML cru e imports diretos de `flowbite-svelte` pelas páginas de negócio.

## Estado atual

A migração por páginas está, na prática, concluída.

Hoje:

- os formulários e ações das telas de negócio usam a camada `ui`
- os hotspots históricos de `financeiro`, `vendas`, `clientes`, `roteiros`, `vouchers`, `parametros`, `admin` e `master` já foram migrados
- os autocompletes ricos e alguns controles estruturais foram encapsulados em wrappers próprios, em vez de manter HTML cru espalhado
- o contrato visual de input foi centralizado em um helper compartilhado

Contagem atual do recorte de migração (`src/routes`, `src/lib/components`, `src/lib/dashboard`, `src/lib/components/ui`):

- ocorrências restantes de `<input>`, `<select>`, `<textarea>`, `<button>` e `vtur-input`: `1`
- arquivo restante: `src/lib/components/ui/inputContract.ts`

Isso significa que não há mais ocorrência relevante de HTML cru nas páginas e componentes de negócio dentro do escopo desta frente.

## Estratégia consolidada

A padronização adotada no projeto ficou assim:

- não importar `flowbite-svelte` diretamente em páginas de negócio
- usar wrappers de `src/lib/components/ui`
- criar primitives novas quando um caso recorrente aparece mais de uma vez
- tratar autocompletes, listas clicáveis e botões-card como wrappers próprios, em vez de exceções permanentes
- manter HTML nativo apenas quando o elemento for estrutural e estiver encapsulado dentro da própria camada de UI

## Wrappers consolidados

### Base

- `Button`
- `Card`
- `Dialog`
- `Tabs`
- `Badge`
- `AlertMessage`
- `PageHeader`
- `Input`
- `Checkbox`
- `DataTable`
- `SimpleTable`
- `FileInput`
- `FileDropzone`

### Formulários

- `FieldInput`
- `FieldTextarea`
- `FieldCheckbox`
- `FieldToggle`
- `FieldRadioGroup`
- `FieldSelect`
- `FieldDatalistInput`

### Apoio visual

- `FormPanel`
- `FormActions`
- `PaginationControls`
- `inputContract.ts`

## Ondas concluídas

### Onda 1 — camada base

- criação dos wrappers principais de formulário e ação
- normalização do uso de `flowbite-svelte` por trás da camada `ui`

### Onda 2 — telas financeiras e vendas

- `financeiro/conciliacao`
- `financeiro/comissoes`
- `financeiro/comissoes/regras`
- `financeiro/formas-pagamento`
- `financeiro/regras`
- `vendas/importar`
- `vendas/nova`
- `vendas/[id]/editar`

### Onda 3 — clientes, parâmetros e administração

- `clientes/novo`
- `clientes/[id]/editar`
- `parametros/+page`
- `parametros/crm`
- `parametros/notificacoes`
- `parametros/equipe`
- `parametros/escalas`
- `parametros/metas`
- `parametros/tipo-pacotes`
- `parametros/avisos`
- `parametros/orcamentos`
- `parametros/cambios`
- `parametros/integracoes`
- `admin/*`
- `master/*`

### Onda 4 — formulários operacionais

- `VoucherEditorModal`
- `operacao/vouchers/novo`
- `FornecedorForm`
- `ProdutoOperacionalForm`
- `CidadeAutocomplete`
- `ClienteAutocomplete`

### Onda 5 — roteiros, orçamentos e relatórios

- `orcamentos/roteiros/+page`
- `orcamentos/roteiros/[id]`
- `orcamentos/novo`
- `orcamentos/[id]/editar`
- `relatorios/*`
- `UnifiedDashboard`

### Onda 6 — layout, auth e superfícies compartilhadas

- `Header`
- `Sidebar`
- `Topbar`
- `Tabs`
- `AlertMessage`
- `DataTable`
- `TableActions`
- `login`
- `register`
- `convite`
- `perfil/mfa`
- `perfil/onboarding`

## Ajustes estruturais importantes feitos durante a frente

- `FieldInput` e `Input` corrigidos para não esconderem o campo quando há ícone
- ícones reposicionados corretamente com `wrapperClass="relative w-full"`
- placeholders de select padronizados para `Selecione uma opção`
- `Button` expandido para suportar casos estruturais e acessibilidade:
  - `variant="unstyled"`
  - `title`
  - `ariaLabel`
  - `ariaHaspopup`
  - `ariaExpanded`
  - `role`
  - `ariaSelected`
  - `id`
- `FieldInput` expandido para suportar:
  - `prefix`
  - `suffix`
  - `actionIcon`
  - `autocomplete`
  - `list`
  - `min`, `max`, `step`, `maxlength`
- `FieldSelect` ganhou `srLabel`
- o contrato visual `vtur-input` foi centralizado em `src/lib/components/ui/inputContract.ts`

## Exceções que continuam legítimas

As exceções restantes não são mais “dívida de migração”; são decisões conscientes da camada interna:

- helper compartilhado `src/lib/components/ui/inputContract.ts`, que concentra o contrato visual do input
- markup estrutural encapsulado dentro dos próprios wrappers
- integrações pontuais com `Dropdown`/slots do Flowbite quando o wrapper precisa obedecer à API do componente-base

## Regra vigente

Para código novo:

- não introduzir imports diretos de `flowbite-svelte` em páginas de negócio
- reutilizar wrappers de `src/lib/components/ui`
- se surgir um segundo caso parecido, extrair primitive nova em vez de duplicar HTML
- manter HTML nativo apenas quando ele fizer parte da implementação interna da própria camada `ui`

## Próximo passo recomendado

Esta frente pode ser considerada encerrada no nível de páginas e componentes de negócio.

Daqui para frente, os próximos trabalhos mais valiosos são:

1. continuar as frentes funcionais pendentes do projeto, como auth sync, comissões e paridade de regras
2. evoluir a camada `ui` apenas sob demanda, quando aparecer um novo padrão recorrente
3. usar este documento como regra de manutenção, e não mais como backlog de migração em aberto
