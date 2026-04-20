# Matriz Operacional de Permissoes e Escopo (Fase 1)

> Baseado em `docs/11-plano-execucao-paridade-total.md` e `docs/12-plano-permissoes-e-escopo-fiel.md`.
> Objetivo: virar checklist executavel por papel e por modulo.

## Regras de preenchimento

- `OK`: paridade validada contra o legado (`vtur-app`).
- `PARCIAL`: implementado, mas sem validacao completa por papel.
- `PENDENTE`: falta implementar ou auditar.
- `BLOQUEIO`: depende de API/migration/contrato ainda divergente.

## Papeis considerados

- `VENDEDOR`
- `GESTOR`
- `MASTER`
- `ADMIN`

## Camadas obrigatorias por tela/modulo

- `Menu`: item aparece/some corretamente.
- `Tela`: filtros, abas e acoes batem por papel.
- `Endpoint`: backend aplica escopo e rejeita bypass.
- `Resultado`: dados/KPIs/listas batem com o legado.

## Matriz inicial

| Modulo | Menu | Tela | Endpoint | Resultado | Status geral | Observacoes |
|---|---|---|---|---|---|---|
| Sidebar / Navegacao global | OK | PARCIAL | N/A | PARCIAL | PARCIAL | Gate por modulo aplicado no desktop e no bottom nav mobile (`canSeeItem` + fallback seguro); falta apenas auditoria final de atalhos/rotas secundarias por papel |
| Dashboard por papel | PENDENTE | PENDENTE | PARCIAL | PENDENTE | PENDENTE | Plano 00 indica gap estrutural `/dashboard/*` |
| Vendas (lista/nova/editar/importar) | PARCIAL | OK | PARCIAL | PARCIAL | PARCIAL | Lista oculta filtro vendedor por papel; nova/editar ocultam campo vendedor quando `can_assign_vendedor=false` (backend-driven); detalhe `[id]` gatea Editar/Cancelar/Excluir por `permissoes.can`; importar já usa `canEdit` via store; backend `cadastro-base` e `[id]` já escopados |
| Comissoes | PARCIAL | PARCIAL | PARCIAL | PARCIAL | PARCIAL | Prioridade alta conforme plano 11 |
| Relatorios | PARCIAL | OK | OK | PARCIAL | PARCIAL | Todos os relatórios (vendas, clientes, produtos, destinos, ranking) agora ocultam filtros empresa/vendedor para vendedor/uso individual; backends já usam `resolveScopedCompanyIds`/`resolveScopedVendedorIds`; falta validação cruzada de KPIs por papel |
| Conciliacao | PARCIAL | PARCIAL | PARCIAL | PARCIAL | PARCIAL | Falta validacao cruzada com comissoes/ranking |
| Clientes e CRM cliente | PARCIAL | PENDENTE | PARCIAL | PENDENTE | PARCIAL | Plano 11 aponta mistura parcial com CRM admin |
| Parametros | PARCIAL | PARCIAL | PARCIAL | PARCIAL | PARCIAL | Revisar escopo por papel em telas de parametros |
| Admin/Master permissoes | PARCIAL | OK | PARCIAL | PARCIAL | PARCIAL | `master/permissoes`, `master/usuarios` e `master/empresas` agora têm listagem/detalhe próprios sem redirect para `/admin/*`, reaproveitando as APIs protegidas já existentes; falta validar paridade fina de resultado/ações vs. legado |

## Checklist tecnico por papel (execucao)

### VENDEDOR

- [ ] Menu sem itens admin/master
- [ ] Sem filtro global de empresa onde legado nao mostra
- [ ] Sem filtro de vendedor fora de si
- [ ] Endpoints ignoram/bloqueiam `empresa_id` externo
- [ ] Endpoints ignoram/bloqueiam `vendedor_id` externo

### GESTOR

- [ ] Menu sem itens admin global
- [ ] Filtro de vendedor limitado a equipe
- [ ] Filtro de empresa limitado ao dominio permitido
- [ ] Endpoints limitam leitura/escrita ao escopo da equipe
- [ ] Relatorios/KPIs sem dados de fora da equipe

### MASTER

- [ ] Menu coerente com legado para visao multiempresa
- [ ] Filtro de empresa apenas empresas aprovadas
- [ ] Sem acesso a empresas fora do vinculo
- [ ] Endpoints limitam escopo a empresas aprovadas
- [ ] Permissoes e admin parcial conforme legado

### ADMIN

- [ ] Menu e telas admin completas conforme legado
- [ ] Endpoints administrativos protegidos por modulo
- [ ] Sem regressao em fluxos de permissoes e tipos
- [ ] Consegue operar modulos de sistema sem quebrar escopo dos demais papeis

## Proxima sequencia (curta)

1. ~~Filtros de relatórios por papel (vendas, clientes, produtos, destinos, ranking)~~ ✅
2. ~~Telas de vendas nova/editar/[id]: vendedor field e action buttons por papel~~ ✅
3. Auditar atalhos rápidos / rotas secundárias por papel além do Sidebar.
4. Comparar KPIs/resultados por papel entre vtur-svelte e vtur-app.
5. Validar diferenças finas de UX/ações entre `master/*` e o legado agora que os redirects foram removidos.
