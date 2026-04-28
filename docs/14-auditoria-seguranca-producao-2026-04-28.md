# Auditoria de segurança aprofundada — vtur-svelte

Data: 2026-04-28  
Revisor: GitHub Copilot (GPT-5.3-Codex)  
Tipo: revisão estática de código (sem pentest dinâmico, sem acesso ao Supabase de produção, sem revisão de RLS em ambiente real)

## Leitura sincera e direta

Não é possível afirmar tecnicamente "todas as vulnerabilidades" apenas com revisão estática. Isso exigiria também:
- teste dinâmico autenticado por perfil
- validação de políticas RLS reais
- teste de infraestrutura (WAF, CDN, DNS, TLS)
- teste de abuso/rate-limit em ambiente executando

Dito isso, há riscos sérios e confirmados no código atual que precisam ser tratados antes da produção.

## Validação do arquivo anexo

A auditoria anexa faz sentido em boa parte. Os pontos mais relevantes estão corretos (arquitetura de auth em APIs, uso massivo de service role, endpoint de ambiente exposto, ausência de controles anti-abuso em alguns endpoints).

Também há pontos que precisam ajuste de precisão:
- Alguns endpoints citados como "sem auth" usam guard indireto por módulos compartilhados (exemplo: preferências via _shared).
- Um endpoint debug citado anteriormente já foi removido: [src/routes/api/v1/debug/viagens-diag/+server.ts](src/routes/api/v1/debug/viagens-diag/+server.ts#L1).
- Há riscos condicionais de RLS em rotas que usam locals.supabase sem requireAuthenticatedUser; o impacto real depende das políticas no banco.

## Superfície de ataque observada

- Endpoints server-side mapeados: 240 arquivos +server.ts.
- Endpoints que usam getAdminClient (service role) diretamente: 203 arquivos (alto acoplamento da segurança à camada de aplicação).
- Endpoints com requireAuthenticatedUser explícito: 204 arquivos (há exceções públicas e indiretas).

## Achados confirmados (priorizados)

## Crítico 1 — APIs ignoram autenticação global por padrão

Evidência:
- [src/hooks.server.ts](src/hooks.server.ts#L151) contém `if (isPublic || isApiRequest)`, liberando qualquer `/api/*` do guard global.
- [src/hooks.server.ts](src/hooks.server.ts#L147) inclui `/api/v1/cards` como público explícito.

Por que deve ser corrigido:
- Com 240 endpoints, segurança por disciplina endpoint-a-endpoint é frágil.
- Um endpoint novo sem check local vira brecha imediata.

Correção recomendada:
- Modelo deny-by-default para `/api/*` no hook.
- Manter lista explícita e curta de APIs públicas.

---

## Crítico 2 — Bug de autorização por coerção booleana em permissões administrativas

Evidência:
- [src/lib/server/admin.ts](src/lib/server/admin.ts#L146) `canManageUsers` usa `Boolean(scope.permissoes.admin)` e `Boolean(scope.permissoes.admin_users)`.
- [src/lib/server/admin.ts](src/lib/server/admin.ts#L157) `canManagePermissions` idem.
- [src/lib/server/admin.ts](src/lib/server/admin.ts#L160) `canManageCompanies` idem.

Impacto:
- String não vazia vira true em JavaScript. Exemplo: permissões como view ou até none (string) podem passar como "tem permissão".
- Isso afeta endpoints sensíveis de gestão de usuário/permissão/empresa, por exemplo:
  - [src/routes/api/v1/admin/usuarios/+server.ts](src/routes/api/v1/admin/usuarios/+server.ts)
  - [src/routes/api/v1/admin/auth/set-password/+server.ts](src/routes/api/v1/admin/auth/set-password/+server.ts#L21)
  - [src/routes/api/v1/admin/empresas/+server.ts](src/routes/api/v1/admin/empresas/+server.ts#L69)

Por que deve ser corrigido:
- É potencial de privilege escalation por erro lógico, não depende de ataque sofisticado.

Correção recomendada:
- Trocar Boolean(...) por comparação de nível (permLevel >= nível mínimo).
- Exemplo: exigir delete/admin para gestão, nunca presença de chave apenas.

---

## Alto 1 — IDOR/multi-tenant bypass em documentos de viagens (update/delete por id sem company_id)

Evidência:
- [src/routes/api/v1/documentos-viagens/update/+server.ts](src/routes/api/v1/documentos-viagens/update/+server.ts#L27) faz update por `.eq('id', id)` sem filtro de company.
- [src/routes/api/v1/documentos-viagens/delete/+server.ts](src/routes/api/v1/documentos-viagens/delete/+server.ts#L24) busca por id sem company.
- [src/routes/api/v1/operacao/documentos-viagens/+server.ts](src/routes/api/v1/operacao/documentos-viagens/+server.ts#L67) DELETE por id sem validar pertencimento da empresa.
- [src/routes/api/v1/documentos-viagens/save-template/+server.ts](src/routes/api/v1/documentos-viagens/save-template/+server.ts#L66) update por id sem company.

Impacto:
- Usuário autorizado da empresa A pode tentar alterar/excluir documento da empresa B se obtiver id válido.

Por que deve ser corrigido:
- Violação direta de isolamento multiempresa.

Correção recomendada:
- Sempre filtrar por `id + company_id` com escopo resolvido.
- Buscar recurso antes e validar `doc.company_id === scope.companyId`.

---

## Alto 2 — Upload de comprovante sem validação de escopo do pagamento

Evidência:
- [src/routes/api/v1/pagamentos/upload/+server.ts](src/routes/api/v1/pagamentos/upload/+server.ts#L54) atualiza pagamento por `id` sem verificar company_id.
- [src/routes/api/v1/pagamentos/upload/+server.ts](src/routes/api/v1/pagamentos/upload/+server.ts#L47) gera URL pública do comprovante (`getPublicUrl`).

Impacto:
- Risco de anexar comprovante a pagamento de outra empresa (IDOR) se id for conhecido.
- Exposição pública de comprovantes sensíveis dependendo do bucket/padrão de acesso.

Correção recomendada:
- Antes de update, buscar pagamento e validar escopo empresa/usuário.
- Evitar URL pública para comprovantes sensíveis; usar bucket privado + signed URL curta.

---

## Alto 3 — Possível SSRF em renderização de cartões

Evidência:
- [src/routes/api/v1/cards/_render.ts](src/routes/api/v1/cards/_render.ts#L415) realiza `fetch(raw)` para URL remota.
- [src/routes/api/v1/cards/_render.ts](src/routes/api/v1/cards/_render.ts#L408) aceita `http/https` sem allowlist.

Impacto:
- Endpoint pode ser usado para fetch server-side de destinos arbitrários.
- Abre vetor de abuso de rede/custo e potencial SSRF, dependendo do runtime e egress.

Correção recomendada:
- Allowlist de hosts de imagem.
- Bloqueio de IP literal, localhost e redes privadas.
- Timeout e limite de bytes no download.

---

## Alto 4 — Endpoint de ambiente sensível exposto

Evidência:
- [src/routes/test-env/+server.ts](src/routes/test-env/+server.ts#L20) expõe `serviceRoleKeyPresent`.
- [src/hooks.server.ts](src/hooks.server.ts#L139) rota `/test-env` está pública.

Impacto:
- Facilita fingerprinting e reconhecimento de ambiente.

Correção recomendada:
- Remover em produção ou restringir a admin + ambiente dev.

---

## Alto 5 — Uso de DataTable com renderização HTML sem sanitização

Evidência:
- [src/lib/components/ui/DataTable.svelte](src/lib/components/ui/DataTable.svelte#L393) usa `{@html cellValue}`.

Impacto:
- Se formatter devolver conteúdo controlado por usuário, há risco de XSS armazenado/refletido.

Correção recomendada:
- Padrão sem HTML.
- Se HTML for obrigatório, sanitizar com whitelist estrita antes de renderizar.

---

## Alto 6 — Regra de escopo de gestor possivelmente permissiva

Evidência:
- [src/lib/server/admin.ts](src/lib/server/admin.ts#L201) retorna `companyId === scope.companyId || isSellerRole(roleName)`.

Impacto:
- A condição com OR pode considerar vendedor fora da empresa do gestor como gerenciável em cenários específicos.

Correção recomendada:
- Para gestor, usar condição com AND (`mesma empresa` e `papel vendedor`) ou vínculo explícito de equipe.

---

## Médio 1 — Ausência de proteção CSRF/Origin centralizada para mutações

Evidência:
- Não há checagem de Origin/Referer no hook nem nas APIs mutáveis.
- Busca de `origin/csrf` em hooks e APIs não encontrou proteção central.

Impacto:
- Dependência excessiva de comportamento de cookie/CORS do browser.
- Em cenários de configuração inadequada de cookie ou integrações cross-site, aumenta risco de CSRF.

Correção recomendada:
- Validar `Origin` para métodos mutáveis (POST/PUT/PATCH/DELETE).
- Aplicar token CSRF para endpoints críticos de admin/financeiro.

---

## Médio 2 — Endpoint público de log suscetível a abuso

Evidência:
- [src/routes/api/v1/client-error/+server.ts](src/routes/api/v1/client-error/+server.ts#L6) aceita payload bruto.
- [src/routes/api/v1/client-error/+server.ts](src/routes/api/v1/client-error/+server.ts#L8) loga payload sem sanitização.

Impacto:
- Flood de logs, custo, ruído operacional e possível vazamento de dados sensíveis enviados pelo cliente.

Correção recomendada:
- Limitar tamanho do body.
- Rate limit por IP.
- Sanitização e schema estrito de campos aceitos.

---

## Médio 3 — Política de senha fraca em rotas administrativas

Evidência:
- [src/routes/api/v1/admin/auth/set-password/+server.ts](src/routes/api/v1/admin/auth/set-password/+server.ts#L28) aceita senha >= 6.
- [src/routes/api/v1/admin/usuarios/+server.ts](src/routes/api/v1/admin/usuarios/+server.ts#L142) também >= 6.

Impacto:
- Segurança de credenciais abaixo do padrão para produção.

Correção recomendada:
- Política mínima de 12+ caracteres, bloqueio de senhas comuns e fluxo de reset seguro.
- Exigir MFA/step-up para ações de reset/gestão de conta.

---

## Médio 4 — Dependência vulnerável xlsx@0.18.5

Evidência:
- [package.json](package.json#L55) usa `xlsx: ^0.18.5`.

Impacto:
- Risco conhecido em parsing de planilhas (DoS/prototype pollution em advisories públicos).

Correção recomendada:
- Atualizar para versão corrigida.
- Tratar importação como entrada hostil (limites de tamanho/linhas/tempo, isolamento de parsing).

Observação:
- Não foi possível rodar npm audit localmente porque o repositório está sem lockfile (ENOLOCK).

---

## Médio 5 — Segurança de cabeçalhos HTTP não centralizada

Evidência:
- Não há definição central de CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.

Impacto:
- Menor resiliência contra XSS/clickjacking/sniffing.

Correção recomendada:
- Injetar headers de segurança no hook global, com CSP compatível com recursos usados.

---

## Médio 6 — Rota pública de ICS por id sem autenticação explícita

Evidência:
- [src/routes/api/v1/consultorias/ics/+server.ts](src/routes/api/v1/consultorias/ics/+server.ts#L11) usa id em query string e não chama requireAuthenticatedUser.
- [src/routes/api/v1/consultorias/ics/+server.ts](src/routes/api/v1/consultorias/ics/+server.ts#L19) consulta `consultorias_online`.

Impacto:
- Se RLS estiver permissiva/ausente para anon, pode expor dados de consultoria.
- Mesmo com RLS rígida, endpoint deveria ser explicitamente classificado como público/privado em política central.

Correção recomendada:
- Tornar autenticado por padrão ou usar token de acesso assinado e de curta duração para download ICS.

---

## Médio 7 — Logs internos detalhados demais em erros

Evidência:
- [src/lib/server/v1.ts](src/lib/server/v1.ts#L479) e linhas seguintes logam estrutura completa de erro (`body`, `message`, etc).

Impacto:
- Pode vazar dados sensíveis para observabilidade/log storage.

Correção recomendada:
- Redaction e logging estruturado por ambiente.
- Evitar dump de body completo em produção.

## Pontos do anexo que estão corretos e devem permanecer como prioridade

- Problema arquitetural de auth em APIs via hook.
- Dependência elevada de service role.
- Endpoint test-env exposto.
- Endpoint client-error sem proteção anti-abuso.
- Possível SSRF em cards.
- `{@html}` em DataTable sem sanitização.
- Ausência de política central de rate limit.

## Pontos do anexo que exigem ajuste de precisão

- "Todos os endpoints listados sem auth" não procede literalmente; alguns usam guard indireto em arquivos compartilhados.
- Alguns debug endpoints já foram removidos/desativados.
- Parte dos riscos depende da configuração real de RLS no Supabase (não validada nesta revisão estática).

## Plano de correção recomendado (prático)

## Fase P0 (antes de produção)

1. Corrigir bug de autorização booleana em [src/lib/server/admin.ts](src/lib/server/admin.ts#L146).
2. Trocar hook para deny-by-default em APIs privadas em [src/hooks.server.ts](src/hooks.server.ts#L151).
3. Corrigir escopo company_id nas rotas de documentos e comprovantes:
   - [src/routes/api/v1/documentos-viagens/update/+server.ts](src/routes/api/v1/documentos-viagens/update/+server.ts#L27)
   - [src/routes/api/v1/documentos-viagens/delete/+server.ts](src/routes/api/v1/documentos-viagens/delete/+server.ts#L24)
   - [src/routes/api/v1/documentos-viagens/save-template/+server.ts](src/routes/api/v1/documentos-viagens/save-template/+server.ts#L66)
   - [src/routes/api/v1/pagamentos/upload/+server.ts](src/routes/api/v1/pagamentos/upload/+server.ts#L54)
4. Remover/fechar [src/routes/test-env/+server.ts](src/routes/test-env/+server.ts#L1).
5. Aplicar hardening em cards SSRF/cache/PII.

## Fase P1 (primeira semana)

1. Implementar origin-check/CSRF para mutações.
2. Implementar rate limit em endpoints críticos (auth, admin e envio de email).
3. Remover/sanitizar HTML em DataTable.
4. Reforçar política de senha e MFA em ações sensíveis.

## Fase P2 (janela seguinte)

1. Headers de segurança globais.
2. Redaction de logs e padronização de erro.
3. Atualização de dependências vulneráveis + lockfile para auditoria reprodutível.

## Check de validação pós-correção

1. Teste automatizado que varre todos os +server.ts e classifica rota como pública/privada/cron.
2. Teste de autorização por papel (admin/master/gestor/vendedor) e por empresa (A vs B).
3. Testes de IDOR para recursos por id (documentos, pagamentos, vouchers, etc.).
4. Testes de CSRF, SSRF e XSS em ambiente staging.
5. Revisão de RLS real no Supabase (obrigatório para fechar auditoria de produção).

## Conclusão

No estado atual, há riscos bloqueantes para produção (especialmente autorização/admin e isolamento multiempresa).  
A base tem boa estrutura para corrigir, mas precisa de endurecimento arquitetural e correções de lógica antes de entrar em produção.
