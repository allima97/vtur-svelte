# AGENTS.md - Migração vtur-app → vtur-svelte

## Contexto Rápido

Projeto: Migração completa do **vtur-app (Astro/React)** para **vtur-svelte (SvelteKit)** com paridade de funcionalidades.

## Status da Migração

### Correções de Auth ✅
- Endpoint `/api/auth/set-session` implementado para sincronizar tokens
- Layout sincroniza tokens ao carregar
- Login salva sessão nos cookies

### Relatórios ✅
- `relatorios/vendas`: Campos `cliente_cpf`, `cidade`, `valor_taxas`, `recibos[]` adicionados
- `relatorios/clientes`: Campo `cpf` adicionado

### Issues Identificados

#### 1. Roteiros (`orcamentos/roteiros`) ⚠️
- **Problema**: Clique na linha redireciona de volta para a lista
- **Causa**: API retorna 401 (não autenticado) e o erro redireciona para lista
- **Raiz**: Tokens não estão sendo sincronizados corretamente para chamadas de API
- **Solução**: Verificar se `/api/auth/set-session` está sendo chamado corretamente após login

#### 2. Conciliação (`financeiro/conciliacao`) ⚠️
- **Problema**: UI usa API simplificada (`/api/v1/pagamentos`)
- **Causa**: A API de conciliação completa existe em `/api/v1/conciliacao/*` mas UI não a utiliza
- **Diferenças**:
  - vtur-app: Usa `conciliacao_recibos` com matching, ranking, importação de extratos
  - vtur-svelte: Usa `pagamentos` com workflow simplificado
- **Solução**: Reimplemenar UI para usar `/api/v1/conciliacao/*`

#### 3. Comissões (`financeiro/comissoes`) ⚠️
- **Problema**: Cálculo básico sem templates/regras complexas
- **Diferenças**:
  - vtur-app: Templates (FIXO/ESCALONAVEL), metas de vendedores, faixas de comissão, conciliação override
  - vtur-svelte: Cálculo simples `valor * percentual_padrao / 100`
- **APIs existem**: `/api/v1/financeiro/comissoes/*` mas são básicas
- **Solução**: Implementar lógica de templates e faixas de comissão

#### 4. Acompanhamento (`operacao/acompanhamento`) ℹ️
- **Status**: Implementado com follow-ups derivados de viagens
- **Diferença**: vtur-app tem CRUD completo de viagens em `ViagensListaIsland`
- **vtur-svelte**: Foca em follow-ups operacionais

## APIs Disponíveis

### Conciliação
- `/api/v1/conciliacao` - Listagem principal
- `/api/v1/conciliacao/list` - Listagem alternativa com dedupe
- `/api/v1/conciliacao/run` - Execução de reconciliação
- `/api/v1/conciliacao/import` - Importação de extratos
- `/api/v1/conciliacao/assign` - Atribuição de ranking
- `/api/v1/conciliacao/changes` - Histórico de alterações
- `/api/v1/conciliacao/executions` - Execuções anteriores

### Comissões
- `/api/v1/financeiro/comissoes` - Lista comissionável
- `/api/v1/financeiro/comissoes/calcular` - Cálculo de comissões
- `/api/v1/financeiro/comissoes/pagamento` - Registro de pagamento
- `/api/v1/financeiro/comissoes/regras` - CRUD de regras

## Padronização de UI (Flowbite)

### Camada Base (Onda 1) ✅
Wrappers consolidados em `src/lib/components/ui`:
- `FieldInput`, `FieldTextarea`, `FieldCheckbox`, `FieldToggle`, `FieldRadioGroup`, `FieldSelect`
- `FileInput`, `FileDropzone`
- `SimpleTable`, `DataTable`
- `Button`, `Card`, `Dialog`, `Tabs`, `Badge`, `PageHeader`

### Telas Prioritárias (Onda 2) ✅
- **`financeiro/conciliacao`**: Inputs nativos do FilterPanel migrados para `FieldInput`. Restam apenas `<button class="contents">` estruturais nos KPIs (caso legítimo).
- **`financeiro/comissoes`**: Filtro rápido de backlog migrado de `<button>` nativo para `Button`. Restam apenas KPI cards estruturais.
- **`financeiro/comissoes/regras`**: Botão de remover faixa migrado de `<button>` nativo para `Button`. Tabela de vendedores já usa `SimpleTable`.

### Telas Administrativas e Parametrização (Onda 3) ✅
- **`parametros/+page.svelte`**: Checkboxes, selects e inputs principais migrados para `FieldCheckbox`, `FieldSelect`, `FieldInput`. Tabelas inline de tiers/bandas mantidas como nativas (grid densa).
- **`parametros/tipo-produtos`**: Inputs, selects, checkboxes e botão de exclusão migrados para wrappers.
- **`admin/usuarios/[id]`** e **`master/usuarios/[id]`**: Inputs, selects, checkboxes e dialogs migrados para `FieldInput`, `FieldSelect`, `FieldCheckbox`.
- **`admin/empresas/[id]`**: Inputs, selects, checkbox e dates migrados para wrappers.
- **`admin/planos`**: Inputs, textarea, select, checkbox e botão de exclusão migrados para wrappers.

### Formulários Operacionais (Onda 4) ✅
- **`ProdutoOperacionalForm`**: Campos principais (inputs, selects, textarea) migrados para `FieldInput`, `FieldSelect`, `FieldTextarea`. Botão de remover tarifa migrado para `Button`. Grid densa de tarifas mantida como nativa.
- **`VoucherEditorModal`**: Inputs/textareas nos accordions de dia, hotel, traslados, informações, apps e emergência migrados para wrappers. Botões de remover passageiro/app migrados para `Button`.
- **`operacao/vouchers/novo`**: Mesma padronização do `VoucherEditorModal` aplicada (accordion dia, hotel, traslados, informações, apps, emergência).

### Regra vigente
Não introduzir imports diretos de `flowbite-svelte` em páginas de negócio; sempre usar wrappers de `src/lib/components/ui`. Manter HTML nativo apenas em grids densas inline e elementos estruturais customizados (wizard steps, accordion headers, KPI cards).

## Próximos Passos Gerais

1. **Corrigir auth sync**: Garantir que tokens sejam salvos em cookies após login
2. **Reimplementar conciliação**: UI deve usar APIs de `/api/v1/conciliacao/*`
3. **Expandir comissões**: Implementar templates e faixas de comissão
4. **Verificar viagens**: Comparar CRUD de viagens entre sistemas
