# AGENTS.md - Migração vtur-app → vtur-svelte

## Contexto Rápido

Projeto: Migração completa do **vtur-app (Astro/React)** para **vtur-svelte (SvelteKit)** com paridade de funcionalidades.

## Status da Migração

### Correções de Auth ✅
- Endpoint `/api/auth/set-session` implementado para sincronizar tokens
- Layout sincroniza tokens ao carregar
- Login salva sessão nos cookies
- `@supabase/ssr` agora usa o storage key correto (`sb-<project-ref>-auth-token`)
- `/api/auth/set-session` passou a usar `supabase.auth.setSession()` no servidor, eliminando o cookie manual incompatível
- O layout principal agora re-sincroniza a sessão também em `TOKEN_REFRESHED`, `USER_UPDATED`, `PASSWORD_RECOVERY` e `MFA_CHALLENGE_VERIFIED`

### Relatórios ✅
- `relatorios/vendas`: Campos `cliente_cpf`, `cidade`, `valor_taxas`, `recibos[]` adicionados
- `relatorios/clientes`: Campo `cpf` adicionado

### Issues Identificados

#### 1. Roteiros (`orcamentos/roteiros`) ⚠️
- **Problema histórico**: Clique na linha redirecionava de volta para a lista
- **Causa observada**: API retornava 401 e a tela tratava isso redirecionando
- **Correção aplicada na raiz**:
  - `set-session` agora grava a sessão no formato esperado pelo `@supabase/ssr`
  - o layout re-sincroniza sessão em refresh de token
- **Próximo passo**: validar em browser se o 401 em `orcamentos/roteiros/[id]` desapareceu

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

#### 2.5. Relatório de Vendas (`relatorios/vendas`) ✅
- **Problema**: Usuário GESTOR só visualizava suas próprias vendas em vez de todas as vendas de sua empresa.
- **Causa**: `resolveScopedVendedorIds` em `src/lib/server/v1.ts` usava `fetchGestorEquipeIdsComGestor`, que retorna apenas a equipe vinculada ao gestor na tabela `gestor_vendedor`.
- **Correção aplicada**:
  - `resolveScopedVendedorIds`: para GESTOR, agora usa `fetchVendedorIdsByCompanyIds(scope.companyIds)`, retornando TODOS os vendedores e gestores ativos da empresa (exceto ADMIN/MASTER e uso_individual).
  - `/api/v1/relatorios/base`: mesma lógica aplicada ao filtro de vendedores no carregamento da base analítica, garantindo que o dropdown de vendedor mostre todos os colaboradores da empresa.

#### 3. Comissões (`financeiro/comissoes`) ⚠️
- **Diagnóstico atualizado**: o motor em `src/lib/server/comissoes.ts` já implementa muito mais do que o diagnóstico antigo indicava
- **Já cobre**:
  - regras `GERAL` e `ESCALONAVEL`
  - tiers/faixas
  - metas de vendedor e metas por produto
  - regras por produto, tipo de pacote e pacote do produto
  - override de conciliação
- **Correções aplicadas**:
  - `/api/v1/financeiro/comissoes/pagamento` agora persiste baixa real na tabela `comissoes`
  - `GET /api/v1/financeiro/comissoes` e `GET /api/v1/financeiro/comissoes/calcular` passaram a sobrepor o cálculo com o estado persistido (`status`, `valor_pago`, `data_pagamento`, `observacoes_pagamento`)
  - `PUT /api/v1/financeiro/comissoes/pagamento` permite editar data e observações de comissão paga
  - `DELETE /api/v1/financeiro/comissoes/pagamento` cancela comissão persistida
  - `financeiro/comissoes/+page.svelte` mostra e mantém esses estados com feedback de sucesso e erro
  - `financeiro/comissoes/calculo/+page.svelte` passou a exibir pendentes, pagas e canceladas no período
- **Achado de ambiente**:
  - o ambiente local validado em `2026-04-22` está sem a tabela `comissoes`
  - a API agora expõe `persistencia_disponivel`
  - `financeiro/comissoes` e `financeiro/comissoes/calculo` mostram aviso explícito quando o ledger não existe
  - ações de pagar/editar/cancelar ficam desabilitadas ou retornam aviso claro, evitando falso positivo de sucesso
- **Próximo passo**: provisionar a tabela `comissoes` no ambiente que ainda não a possui e então validar o fluxo real de baixa/edição/cancelamento ponta a ponta

#### 4. Acompanhamento (`operacao/acompanhamento`) ℹ️
- **Status**: Implementado com follow-ups derivados de viagens
- **Diferença**: vtur-app tem CRUD completo de viagens em `ViagensListaIsland`
- **vtur-svelte**: Foca em follow-ups operacionais

#### 5. Viagens (`operacao/viagens`) ✅
- **Status**: CRUD operacional agora fechado no front principal
- **Implementado**:
  - listagem em `/operacao/viagens`
  - detalhe/edição em `/operacao/viagens/[id]`
  - criação em `/operacao/viagens/nova`
  - `POST /api/v1/viagens/create` agora retorna a viagem criada e resolve `company_id` com segurança a partir do cliente/escopo
  - filtro de status da listagem agora considera os status reais do banco (`planejada`, `confirmada`, `em_viagem`) além dos labels normalizados da UI

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

### Telas de Autenticação (Onda 8) ✅
- **`auth/nova-senha/+page.svelte`**: Inputs de senha (nova e confirmação) migrados para `FieldInput` com `type="password"` e `actionIcon` para toggle eye/eye-off. Icon `Lock` posicionado via `icon` prop.
- **`auth/recuperar-senha/+page.svelte`**: Input de email migrado para `FieldInput` com `type="email"` e `icon={Mail}`.
- **`auth/mfa/+page.svelte`**: Input de código MFA migrado para `FieldInput` com `type="text"`, `icon={KeyRound}`, `maxlength={6}`, classe custom para texto centrado e monospace, e `helper` para instruções.

### Hotspots Restantes (Onda 9) ✅
- **`operacao/tarefas/+page.svelte`**: 10+ botões nativos migrados para `Button` — toggle Kanban/Lista, cards de categoria, cards de tarefa no kanban, botão de expandir tarefas arquivadas, seletor de cores. Restam apenas exceções estruturais (grids densas, swatches de cor como children).

### Máximo Impacto (Onda 10) ✅
- **`orcamentos/+page.svelte`**: 3 botões de toggle (Ver apenas críticos, Ver prontos para venda, Limpar filtro) migrados para `Button` com variant condicional.
- **`financeiro/formas-pagamento/+page.svelte`**: 5 botões de filtro (Todas, Ativas, Inativas, Sem comissão, Com desconto) migrados para `Button` com cores específicas.
- **`vendas/importar/+page.svelte`**: 2 botões de tipo de importação (CVC, Cruzeiro) migrados para `Button` com variant condicional.

### Infraestrutura e Hotspots (Onda 11) ✅
- **`lib/components/ui/PaginationControls.svelte`**: 2 botões Anterior/Próxima migrados para `Button` com icons `ChevronLeft`/`ChevronRight`. CSS selectors obsoletos removidos.
- **`lib/components/ui/ToastContainer.svelte`**: 1 botão de dismissal migrado para `Button` com icon X.
- **`consultoria-online/+page.svelte`**: 3 botões migrados — filtro de status (chips) para `Button` com variant condicional, botão atualizar e exportar iCal para `Button` ghost size xs.
- **`parametros/crm/+page.svelte`**: 4 botões migrados — wizard steps (1. Arte, 2. Mensagem, 3. Prévia) com cores condicionais (primary/outline), chips de filtro de tema, chips de templates rápidos, botão de itálico na assinatura.
- **`negado/+page.svelte`**: 2 botões CTA migrados — "Ir para o início" (primary orange, size lg) e "Voltar" (outline, size lg).
- **`operacao/minhas-preferencias/+page.svelte`**: 1 botão de delete em row-actions migrado para `Button` ghost com icon `Trash2`, suportando `disabled` state.
- **`operacao/viagens/[id]/+page.svelte`**: 2 botões migrados — modal close button (ghost, xs) e link "Ver ficha completa" (ghost, xs, color clientes).

### Hotspots Adicionais (Onda 12) ✅
- **`operacao/viagens/[id]/+page.svelte`**: 1 botão adicional migrado — seletor de status dentro do modal (3 opções com variant condicional).
- **`cadastros/+page.svelte`**: 2 botões migrados — "Consultar" e "Novo" para cada categoria de cadastro, variante ghost com icons.
- **`lib/components/modais/VoucherPreviewModal.svelte`**: 1 botão de close migrado para `Button` ghost, xs.
- **`operacao/documentos-viagens/+page.svelte`**: 1 botão de delete em row-actions migrado para `Button` ghost com icon `Trash2`.
- **`diagnostico/+page.svelte`**: 1 botão "Executar Diagnostico" migrado para `Button` color financeiro.
- **`debug/+page.svelte`**: 1 botão "Atualizar" com icon refresh migrado para `Button` secondary.

### Não Migrados (Exceções Legítimas) ✅
  - KPI card buttons em `vendas/[id]` e `clientes/[id]` — estruturais com lógica visual complexa (cores condicionais, múltiplos ícones/conteúdo).
  - Theme selector gallery em `parametros/crm/+page.svelte` (linha 539) — card seletor visual complexo com imagem + overlay.
  - Autocomplete dropdown items em `parametros/crm/+page.svelte` (linha 628) — padrão aceitável para dropdowns.

### Melhorias nos Wrappers (Onda 6)
- **`FieldInput`**: Adicionadas props `prefix` e `suffix` para texto posicionado dentro do input (ex: "R$" no preço base). Prop `value` ampliada para aceitar `string | number`.
- **`FieldSelect`**: Adicionada prop `srLabel` para labels acessíveis mas visualmente ocultos.

### Correções de UX (Onda 6)
- **Menu sidebar — duplo destaque corrigido**: Função `isActive()` alterada para computar `activeHref` entre todos os itens do menu, preferindo o href mais específico (mais longo). Isso evita que `/orcamentos` e `/orcamentos/roteiros` fiquem ambos destacados quando o usuário navega para roteiros.

### Regra vigente
Não introduzir imports diretos de `flowbite-svelte` em páginas de negócio; sempre usar wrappers de `src/lib/components/ui`. Manter HTML nativo apenas em grids densas inline e elementos estruturais customizados (wizard steps, accordion headers, KPI cards).

## Próximos Passos Gerais

1. **Validar `orcamentos/roteiros/[id]` em browser**: confirmar que o 401 histórico desapareceu após a correção de auth sync
2. **Validar fluxo real de comissões**: pagar, editar, cancelar e recarregar para confirmar persistência ponta a ponta
3. **Decidir modelo contábil de comissão**: confirmar se a tabela `comissoes` já é o ledger canônico ou se ainda falta um extrato separado
4. **Verificar viagens**: Comparar CRUD de viagens entre sistemas
