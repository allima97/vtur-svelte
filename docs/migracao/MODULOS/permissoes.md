# Modulo Permissoes / Administracao / Configuracoes — Status de Migracao (`vtur-app` -> `vtur-svelte`)

## Objetivo do modulo

- Espelhar os fluxos administrativos do `vtur-app` no `vtur-svelte` sem simplificar regras de negocio.
- Preservar o padrao UX aprovado no Svelte:
- Sem botoes de acao por linha nas listagens.
- Clique na linha abre o registro quando a listagem representa uma entidade navegavel.
- Manter `Vouchers` fora desta etapa.

## Fonte de verdade utilizada

- `vtur-app/src/pages/admin/usuarios.astro`
- `vtur-app/src/pages/admin/permissoes.astro`
- `vtur-app/src/pages/admin/tipos-usuario.astro`
- `vtur-app/src/pages/admin/empresas.astro`
- `vtur-app/src/pages/admin/email.astro`
- `vtur-app/src/pages/parametros/index.astro`
- `vtur-app/src/pages/parametros/avisos.astro`
- `vtur-app/src/components/islands/MasterUsuariosIsland.tsx`
- `vtur-app/src/components/islands/MasterPermissoesIsland.tsx`
- `vtur-app/src/components/islands/AdminUserTypesIsland.tsx`
- `vtur-app/src/components/islands/EmpresasAdminIsland.tsx`
- `vtur-app/src/components/islands/EmailSettingsAdminIsland.tsx`
- `vtur-app/src/components/islands/ParametrosSistemaIsland.tsx`
- `vtur-app/src/components/islands/ParametrosAvisosIsland.tsx`
- `vtur-app/src/components/islands/MaintenanceAccessIsland.tsx`
- `vtur-app/src/pages/api/users.ts`
- `vtur-app/src/pages/api/v1/parametros/sistema.ts`
- `vtur-app/src/pages/api/admin/auth/set-password.ts`
- `vtur-app/src/pages/api/admin/auth/reset-mfa.ts`
- `vtur-app/src/pages/api/admin/auth/mfa-status.ts`
- `vtur-app/src/pages/api/admin/avisos/send.ts`
- `vtur-app/src/pages/api/admin/email/test.ts`
- `vtur-app/src/config/modulos.ts`
- `vtur-app/src/lib/systemModuleSettings.ts`
- `vtur-app/src/lib/adminAccess.ts`
- `vtur-app/src/lib/comissaoUtils.ts`

## Status geral atual

- Em progresso avancado.
- O eixo administrativo principal do `vtur-svelte` deixou de ser um conjunto de mocks dispersos e passou a operar com:
- dashboard administrativo consolidado;
- usuarios com listagem real, detalhe, criacao, edicao, reset de senha, reset de MFA e disparo de aviso;
- permissao por usuario e disponibilidade global de modulos;
- tipos de usuario com permissao default sincronizada;
- empresas com billing e vinculos master;
- avisos e e-mail administrativos;
- parametros do sistema com metas, operacao, seguranca, exportacoes e regras completas de conciliacao.
- O modulo ainda nao pode ser marcado como concluido porque restam partes administrativas do `vtur-app` fora da UI Svelte desta etapa.

## Checklist de paridade

### 1) Listagens administrativas

- [x] `admin/+page.svelte` refeito como painel consolidado com indicadores reais e entrada para Usuarios, Permissoes, Tipos de usuario, Empresas, Avisos, E-mail e Parametros.
- [x] `admin/usuarios/+page.svelte` refeito com dados reais de usuario, papel, empresa, escopo, status, uso individual, ranking e filtros operacionais.
- [x] `admin/usuarios/+page.svelte` manteve o padrao sem botoes por linha.
- [x] `admin/usuarios/+page.svelte` abre o detalhe por clique na linha.
- [x] `admin/permissoes/+page.svelte` passou a listar usuarios com contagem de modulos ativos e a expor configuracao global de disponibilidade dos modulos.
- [x] `admin/permissoes/+page.svelte` manteve clique na linha para abrir o editor do usuario.
- [x] `admin/tipos-usuario/+page.svelte` lista perfis reais e abre o detalhe por clique na linha.
- [x] `admin/empresas/+page.svelte` lista empresas com billing, status e vinculos master relevantes, sem acoes por linha.
- [x] `admin/empresas/+page.svelte` abre o detalhe por clique na linha.
- [x] `admin/avisos/+page.svelte` usa a listagem para selecionar o template e editar no painel inferior, sem depender de botoes de acao por linha.
- [x] Busca, filtros e KPIs foram ampliados para refletir a leitura operacional do `vtur-app` em vez de tabelas simplificadas.

### 2) Detalhe / edicao

- [x] `admin/usuarios/[id]/+page.svelte` suporta leitura por ID, criacao por `/admin/usuarios/novo`, edicao completa e exibicao de resumo de permissoes efetivas e default.
- [x] `admin/usuarios/[id]/+page.svelte` traz acoes auxiliares do fluxo administrativo:
- envio de aviso;
- redefinicao de senha;
- reset de MFA;
- leitura de status MFA.
- [x] `admin/permissoes/[id]/+page.svelte` implementa matriz agrupada por secao, com nivel de permissao por modulo e toggle de ativacao.
- [x] `admin/tipos-usuario/[id]/+page.svelte` implementa criacao/edicao/exclusao de tipo e a matriz de permissoes default do perfil.
- [x] `admin/empresas/[id]/+page.svelte` implementa criacao/edicao de empresa, billing e gestao dos vinculos `master_empresas`.
- [x] `admin/email/+page.svelte` implementa configuracao global de e-mail e disparo de teste.
- [x] `admin/avisos/+page.svelte` implementa CRUD de templates administrativos e disparo operacional via detalhe do usuario.
- [x] `parametros/+page.svelte` deixou de ser uma home de cards mockada e passou a refletir o formulario real de parametros do sistema do `vtur-app`.

### 3) Papeis, escopos e acesso

- [x] A camada server do modulo administrativo foi centralizada em `src/lib/server/admin.ts`.
- [x] Regras de papel e escopo passaram a respeitar o fluxo real de `master`, `admin`, `gestor` e `vendedor`.
- [x] O acesso por empresa foi normalizado com `getAccessibleCompanyIds`, `ensureTargetUserScope`, `ensureAssignableCompany` e `ensureAssignableUserType`.
- [x] O dashboard administrativo e as APIs passaram a usar `resolveUserScope`, `hasModuloAccess` e permissao por modulo como criterio real de leitura/edicao.
- [x] A sidebar foi atualizada para expor os modulos administrativos coerentes com as permissoes carregadas.
- [x] O editor de permissoes passou a respeitar heranca, alias e agrupamento de modulos definidos a partir do mapa administrativo trazido do `vtur-app`.
- [x] A sincronizacao entre permissao default do tipo de usuario e permissao individual foi adicionada para evitar divergencia operacional.

### 4) Configuracoes e acoes administrativas

- [x] `parametros/+page.svelte` agora cobre:
- metas e faturamento;
- operacao da empresa;
- politica de cancelamento;
- MFA obrigatorio;
- exportacao PDF/Excel;
- conciliacao como fonte principal;
- regra propria de comissao;
- tipo de regra da conciliacao;
- percentuais fixos;
- faixas escalonaveis;
- faixas de comissionamento por loja.
- [x] A API de `parametros/sistema` foi alinhada com o `vtur-app` para normalizar `conciliacao_tiers` e `conciliacao_faixas_loja`, incluindo defaults e saneamento do payload.
- [x] `admin/permissoes/+page.svelte` passou a controlar a disponibilidade global de modulos administrativos.
- [x] `admin/usuarios/[id]/+page.svelte` passou a expor acoes administrativas criticas com confirmacao por modal.
- [x] `admin/email/+page.svelte` passou a refletir os remetentes por area e a validacao via envio de teste.
- [x] `admin/avisos/+page.svelte` passou a centralizar templates e conteudo operacional do fluxo de avisos.

### 5) APIs e persistencia

- [x] `src/routes/api/v1/admin/summary/+server.ts` criado para alimentar o dashboard administrativo.
- [x] `src/routes/api/v1/admin/usuarios/+server.ts` refeito para listagem real e criacao/edicao de usuarios.
- [x] `src/routes/api/v1/admin/usuarios/[id]/+server.ts` criado para detalhe completo do usuario e dados auxiliares.
- [x] `src/routes/api/v1/admin/auth/mfa-status/+server.ts` criado.
- [x] `src/routes/api/v1/admin/auth/reset-mfa/+server.ts` criado.
- [x] `src/routes/api/v1/admin/auth/set-password/+server.ts` criado.
- [x] `src/routes/api/v1/admin/tipos-usuario/+server.ts` criado.
- [x] `src/routes/api/v1/admin/tipos-usuario/[id]/+server.ts` criado.
- [x] `src/routes/api/v1/admin/tipos-usuario/[id]/permissoes/+server.ts` criado.
- [x] `src/routes/api/v1/admin/permissoes/+server.ts` criado.
- [x] `src/routes/api/v1/admin/permissoes/[id]/+server.ts` criado.
- [x] `src/routes/api/v1/admin/empresas/+server.ts` criado.
- [x] `src/routes/api/v1/admin/empresas/[id]/+server.ts` criado.
- [x] `src/routes/api/v1/admin/master-empresas/+server.ts` criado.
- [x] `src/routes/api/v1/admin/email/+server.ts` criado.
- [x] `src/routes/api/v1/admin/email/test/+server.ts` criado.
- [x] `src/routes/api/v1/admin/avisos/+server.ts` criado.
- [x] `src/routes/api/v1/admin/avisos/send/+server.ts` criado.
- [x] `src/routes/api/v1/parametros/sistema/+server.ts` refeito para refletir o fluxo real de configuracao do legado.

## Arquivos relevantes alterados/criados nesta etapa

### Infraestrutura e regras

- `src/lib/admin/modules.ts`
- `src/lib/server/admin.ts`
- `src/lib/utils/conciliacao.ts`
- `src/lib/server/v1.ts`
- `src/lib/components/layout/Sidebar.svelte`
- `src/lib/components/ui/PageHeader.svelte`
- `src/lib/components/ui/Card.svelte`

### Frontend administrativo

- `src/routes/(app)/admin/+page.svelte`
- `src/routes/(app)/admin/usuarios/+page.svelte`
- `src/routes/(app)/admin/usuarios/[id]/+page.svelte`
- `src/routes/(app)/admin/permissoes/+page.svelte`
- `src/routes/(app)/admin/permissoes/[id]/+page.svelte`
- `src/routes/(app)/admin/tipos-usuario/+page.svelte`
- `src/routes/(app)/admin/tipos-usuario/[id]/+page.svelte`
- `src/routes/(app)/admin/empresas/+page.svelte`
- `src/routes/(app)/admin/empresas/[id]/+page.svelte`
- `src/routes/(app)/admin/avisos/+page.svelte`
- `src/routes/(app)/admin/email/+page.svelte`
- `src/routes/(app)/parametros/+page.svelte`

### Backend administrativo

- `src/routes/api/v1/admin/summary/+server.ts`
- `src/routes/api/v1/admin/usuarios/+server.ts`
- `src/routes/api/v1/admin/usuarios/[id]/+server.ts`
- `src/routes/api/v1/admin/auth/mfa-status/+server.ts`
- `src/routes/api/v1/admin/auth/reset-mfa/+server.ts`
- `src/routes/api/v1/admin/auth/set-password/+server.ts`
- `src/routes/api/v1/admin/tipos-usuario/+server.ts`
- `src/routes/api/v1/admin/tipos-usuario/[id]/+server.ts`
- `src/routes/api/v1/admin/tipos-usuario/[id]/permissoes/+server.ts`
- `src/routes/api/v1/admin/permissoes/+server.ts`
- `src/routes/api/v1/admin/permissoes/[id]/+server.ts`
- `src/routes/api/v1/admin/empresas/+server.ts`
- `src/routes/api/v1/admin/empresas/[id]/+server.ts`
- `src/routes/api/v1/admin/master-empresas/+server.ts`
- `src/routes/api/v1/admin/email/+server.ts`
- `src/routes/api/v1/admin/email/test/+server.ts`
- `src/routes/api/v1/admin/avisos/+server.ts`
- `src/routes/api/v1/admin/avisos/send/+server.ts`
- `src/routes/api/v1/parametros/sistema/+server.ts`

## Pendencias reais

- [ ] A UI de manutencao administrativa do `vtur-app` (`MaintenanceAccessIsland.tsx` / `/api/v1/admin/maintenance`) ainda nao foi portada para o `vtur-svelte`.
- [ ] O fluxo de logs administrativos citado na base do `vtur-app` ainda nao ganhou tela dedicada no `vtur-svelte`.
- [ ] As rotas legadas auxiliares de `parametros` fora do eixo principal desta etapa (`metas`, `formas-pagamento`, `tipo-pacotes`, `crm`, `equipe` e correlatas) ainda precisam de revisao especifica se entrarem na fila de migracao.
- [ ] O bloco de assets/configuracao de `Vouchers` existente dentro do `ParametrosSistemaIsland` nao foi migrado nesta etapa por restricao explicita de escopo.
- [ ] O `npm run check` global do repositório continua com ruído de outros modulos; a validacao desta entrega foi feita de forma focada no escopo administrativo.

## Observacoes tecnicas

- A listagem administrativa foi ajustada sem alterar `Vouchers`.
- A API de parametros agora devolve defaults e payload saneado para evitar dependencias do frontend em schemas simplificados.
- A validacao focada com `svelte-check` nao retornou erros para os arquivos administrativos e de parametros alterados nesta etapa.
- A documentacao acima reflete o estado real atual do modulo, sem marcar como concluido o que ainda depende de manutencao, logs e submodulos de parametros fora do escopo.

## Proximo passo recomendado

- Fechar a camada administrativa restante fora deste recorte: manutencao/logs e, se fizer parte da fila, os submodulos auxiliares de `parametros` que ainda nao foram revisitados contra o `vtur-app`.
