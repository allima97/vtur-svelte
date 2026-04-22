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

#### 2. Conciliação (`financeiro/conciliacao`) ✅
- **Status**: Implementação completa com paridade funcional ao vtur-app
- **UI**: `financeiro/conciliacao/+page.svelte` já utiliza APIs `/api/v1/conciliacao/*`
- **Funcionalidades implementadas**:
  - Importação de extratos (CSV/TXT/TSV) com parser inteligente e deduplicação
  - Matching automático por número de recibo (`/run`)
  - Atribuição manual de ranking (vendedor + produto) via `/assign`
  - Auditoria de match (total/taxas) com diff
  - Histórico de alterações com reversão (`/changes`, `/revert`)
  - Log de execuções (`/executions`)
  - Cálculo de faixas de comissão (SEGURO_32_35, MAIOR_OU_IGUAL_10, MENOR_10)
  - Flag de Baixa RAC e não-comissionável
  - Edição de valores financeiros (Gestor/Master)
- **Correção aplicada**: Dashboard financeiro (`financeiro/+page.svelte`) agora consome `/api/v1/conciliacao/summary` em vez de `/api/v1/pagamentos`, refletindo dados reais de conciliação nos KPIs

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

### Formulários e Telas Diversas (Onda 5) ✅
- **`FornecedorForm.svelte`**: Inputs (nome, cnpj, cep, telefones, responsável), select de faturamento e textarea de serviços migrados para `FieldInput`, `FieldSelect`, `FieldTextarea`. Autocomplete de cidade e select booleano de status mantidos como nativos.
- **`parametros/empresa/+page.svelte`**: Todos os inputs cadastrais, de contato e endereço migrados para `FieldInput`. Select de estado migrado para `FieldSelect`.
- **`master/empresas/[id]/+page.svelte`**: Inputs, selects (billing status/plano) e checkbox de ativo migrados para `FieldInput`, `FieldSelect`, `FieldCheckbox`. Grids de master links mantidas nativas (densidade inline).
- **`admin/crm/+page.svelte`**: Inputs de busca, nome, saudação, selects de categoria/escopo, textarea de mensagem e checkboxes dos modais migrados para wrappers.
- **`parametros/crm/+page.svelte`**: Input de busca de cliente, input de nome, saudação e textarea de mensagem migrados para `FieldInput`/`FieldTextarea`.

### Padronização Mobile e Responsividade (Onda 6) ✅
- **Tabelas → Cards no mobile**: Todas as tabelas nativas e `SimpleTable` receberam a classe `table-mobile-cards`. O `DataTable` já tinha suporte. CSS ajustado para cards maiores (padding 14px 18px, fonte 0.95rem, border-radius 16px, sombra mais visível).
- **Labels dos cards mobile**: Removido `uppercase`; fonte reduzida para 0.68rem, weight 600; labels agora aparecem como no HTML original (ex: "Recibo", "Produto").
- **Botões dos modais no mobile**: Footer do Dialog ajustado para empilhar botões com largura total (`align-items: stretch` + `width: 100%` nos botões).
- **Menu mobile (bottom nav)**: Fundo alterado de branco para escuro (`linear-gradient(180deg, #0f172a, #1e293b)`), ícones e fontes aumentados (ícones 28px, label 1.15rem).
- **Sidebar desktop**: Ícones aumentados de 17px para 22px, fonte dos itens de 0.9rem para 1.05rem.

### Ajustes de UX nas Vendas (Onda 6) ✅
- **Removido campos de desconto**: Checkbox "Aplicar desconto comercial?" e input "Valor do desconto" removidos das telas `vendas/nova` e `vendas/[id]/editar`.
- **Calculadora movida**: Botão "Calculadora" movido do corpo do formulário para o header do `FormPanel` "Dados da venda", via novo slot `header-actions`.
- **Border-radius dos inputs padronizado**: `.vtur-input` alterado de 14px para 8px (`0.5rem`), alinhado com o padrão Flowbite dos componentes wrappers.

### Migrações de Wrappers Restantes (Onda 6) ✅
- **`relatorios/+page.svelte`**: Inputs de data e selects de empresa/vendedor migrados para `FieldInput`/`FieldSelect`.
- **`operacao/controle-sac/+page.svelte`**: Input de busca, select de status, 7 inputs do dialog, textarea e select do dialog migrados para `FieldInput`, `FieldSelect`, `FieldTextarea`. Botão de exclusão no DataTable migrado para `Button`.
- **`perfil/+page.svelte`**: Input de e-mail desabilitado migrado para `FieldInput` com `disabled` e `icon`.
- **`operacao/minhas-preferencias/+page.svelte`**: Modal com input de nome, selects de tipo/classificação, input de localização e textarea de observação migrados para wrappers. Autocomplete de cidade mantido como nativo (caso legítimo).
- **`operacao/agenda/+page.svelte`**: Input de busca com ícone, inputs de título/data/hora e textarea do modal de evento migrados para `FieldInput`/`FieldTextarea`. Checkbox "Dia inteiro" migrado para `FieldCheckbox`.
- **`operacao/tarefas/+page.svelte`**: Filtros de busca, coluna, prioridade e categoria migrados para `FieldInput`/`FieldSelect`. Modal de tarefa com título, descrição, categoria, prioridade e status migrados para wrappers. Modal de categoria com input de nome migrado para `FieldInput`. Botões toggle Kanban/Lista, cards de categoria e grid de swatches de cor mantidos como nativos (casos legítimos).
- **`cadastros/circuitos/novo/+page.svelte`**: Formulário completo migrado — código, nome, tipo, dias, noites, preço base (com prefixo R$), vagas, saídas, descrição, selects de destino, inputs e textareas do roteiro diário. Botões de remoção migrados para `Button`. Radios booleanos (guia/status) mantidos nativos.
- **`cadastros/circuitos/[id]/editar/+page.svelte`**: Mesma padronização do formulário de novo circuito aplicada.
- **`orcamentos/[id]/editar/+page.svelte`**: Grid de itens do orçamento migrada — descrição, tipo, destino, quantidade, valor unitário para `FieldInput`/`FieldSelect`. Botão de remoção migrado para `Button`.
- **`financeiro/ajustes-vendas/+page.svelte`**: Filtros de data/vendedor/busca e modal de rateio (vendedor destino, percentual, observação) migrados para wrappers.
- **`operacao/campanhas/+page.svelte`**: Filtro de status, botão de exclusão na tabela e modal completo (título, datas, status, URLs, regras) migrados para wrappers.

### Relatórios e Cadastros (Onda 7) ✅
- **`relatorios/destinos/+page.svelte`**: Filtros de data, empresa, vendedor, ordenação e recorte migrados para `FieldInput`/`FieldSelect`.
- **`relatorios/produtos/+page.svelte`**: Filtros de data, empresa, vendedor, tipo e ordenação migrados para wrappers.
- **`relatorios/ranking/+page.svelte`**: Filtros de data, empresa e vendedor migrados para wrappers.
- **`comissoes/fechamento/+page.svelte`**: Filtros de mês, ano, status e vendedor migrados para `FieldInput`/`FieldSelect`.
- **`consultoria-online/+page.svelte`**: Botões de ação (editar, reabrir/fechar) migrados para `Button`. Modal completo (cliente, data/hora, lembrete, quantidade, destino, taxa, notas) migrado para wrappers.
- **`cadastros/cidades/+page.svelte`**: Input de busca, select de estado no filtro, e modal (nome, estado, descrição) migrados para wrappers.
- **`cadastros/estados/+page.svelte`**: Select de país no filtro, e modal (nome, país, código, tipo) migrados para wrappers.
- **`cadastros/paises/+page.svelte`**: Modal (nome, código ISO, continente) migrado para wrappers.
- **`admin/parametros-importacao/+page.svelte`**: Modal (termo, descrição, checkbox ativo) migrado para `FieldInput`/`FieldCheckbox`.
- **`operacao/documentos-viagens/+page.svelte`**: Input de busca migrado para `FieldInput` com ícone.

### Melhorias nos Wrappers (Onda 6)
- **`FieldInput`**: Adicionadas props `prefix` e `suffix` para texto posicionado dentro do input (ex: "R$" no preço base). Prop `value` ampliada para aceitar `string | number`.
- **`FieldSelect`**: Adicionada prop `srLabel` para labels acessíveis mas visualmente ocultos.

### Correções de UX (Onda 6)
- **Menu sidebar — duplo destaque corrigido**: Função `isActive()` alterada para computar `activeHref` entre todos os itens do menu, preferindo o href mais específico (mais longo). Isso evita que `/orcamentos` e `/orcamentos/roteiros` fiquem ambos destacados quando o usuário navega para roteiros.

### Regra vigente
Não introduzir imports diretos de `flowbite-svelte` em páginas de negócio; sempre usar wrappers de `src/lib/components/ui`. Manter HTML nativo apenas em grids densas inline e elementos estruturais customizados (wizard steps, accordion headers, KPI cards).

## Próximos Passos Gerais

1. **Corrigir auth sync**: Garantir que tokens sejam salvos em cookies após login
2. **Reimplementar conciliação**: UI deve usar APIs de `/api/v1/conciliacao/*`
3. **Expandir comissões**: Implementar templates e faixas de comissão
4. **Verificar viagens**: Comparar CRUD de viagens entre sistemas
