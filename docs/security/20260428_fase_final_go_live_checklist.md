# Fase Final - Go-Live Security Checklist (vtur-svelte)

Data base: 2026-04-28
Objetivo: garantir entrada em producao com seguranca reforcada sem regressao funcional.

## 1) Backend/API

1. Confirmar modelo deny-by-default para APIs em [src/hooks.server.ts](src/hooks.server.ts).
2. Revisar allowlist de APIs publicas e manter apenas o estritamente necessario.
3. Validar que rotas sensiveis exigem sessao e escopo por empresa.
4. Confirmar endpoints de debug desabilitados em producao.
5. Confirmar respostas 401 padronizadas para APIs sem sessao.

## 2) Autorizacao de Negocio

1. Validar checks de permissao em fluxos administrativos (usuarios, empresas, permissoes).
2. Validar escopo multiempresa em update/delete por id.
3. Validar que gestor so opera usuarios da propria empresa e papel permitido.
4. Validar conciliacao e pagamentos com controle de escopo.

## 3) Banco/Supabase

1. Confirmar RLS habilitado nas tabelas criticas.
2. Confirmar FORCE RLS em tabelas administrativas e sensiveis.
3. Confirmar ausencia de mismatch company_id em entidades-filhas (pagamentos x venda).
4. Confirmar bucket de documentos privado.
5. Confirmar ausencia de policy aberta indevida (qual/with_check = true sem justificativa).

## 4) Segredos e Infra

1. Confirmar CRON secrets rotacionados e nao reutilizados.
2. Confirmar variaveis criticas definidas apenas no ambiente correto.
3. Confirmar logs sem dump de payload sensivel.
4. Confirmar URLs publicas de anexos sensiveis substituidas por acesso controlado quando aplicavel.

## 5) Validacao Funcional Minima

1. Login/logout e refresh token sem erro.
2. Fluxo admin de manutencao e email funcionando.
3. Fluxo de documentos de viagem (upload/list/update/delete) funcionando por papel.
4. Fluxo de pagamentos (listar/criar/editar/conciliar/excluir) funcionando por papel.
5. Exportacao iCal de consultorias funcionando para usuario autenticado.

## 6) Gate de Liberacao

Liberar producao apenas se:
1. Todos os checks SQL de auditoria retornarem sem bloqueios criticos.
2. Smoke tests de autorizacao por papel/empresa passarem.
3. Build e checks passarem sem erros (warnings conhecidos documentados).
4. Plano de rollback estiver pronto (migracoes e toggles de reversao).

## 7) Rollback Rapido

1. Manter SQL de rollback para policies alteradas na janela de deploy.
2. Ter snapshot das policies anteriores antes de alterar tabelas criticas.
3. Monitorar erros 401/403/500 por 2 horas apos deploy.
4. Se regressao funcional critica, reverter ultima fase de hardening e reavaliar.
