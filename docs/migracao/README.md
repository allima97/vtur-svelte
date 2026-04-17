# Referencia oficial da migracao

A migracao `vtur-app` -> `vtur-svelte` deve preservar exatamente a mesma regra de negocio, os mesmos campos e os mesmos fluxos operacionais do sistema que ja funciona em producao.

## Fonte de verdade

A fonte de verdade principal e o codigo real do `vtur-app`.

Esta pasta serve apenas para registrar:

- cobertura atual da migracao;
- gaps de paridade;
- ordem de execucao dos modulos;
- observacoes tecnicas da adaptacao de tecnologia.

Se qualquer documento desta pasta divergir do comportamento do `vtur-app`, prevalece o `vtur-app`.

## Regras obrigatorias da migracao

- Nao inventar fluxo novo.
- Nao mudar regra de negocio.
- Nao remover campos existentes no legado.
- Nao reinterpretar telas por preferencia tecnica do Svelte.
- A mudanca permitida e somente de tecnologia: Astro/React -> Svelte/SvelteKit/Flowbite-Svelte.

## Documentos atuais

Hoje esta pasta possui:

- `README.md`
- `AUDITORIA_GERAL_2026-04-13.md`
- `MIGRATIONS_COBERTURA.md`
- `MODULOS/*.md`

## Auditorias

- `AUDITORIA_GERAL_2026-04-13.md` registra uma varredura estrutural de paridade entre rotas, migrations e persistencia critica.
- `MIGRATIONS_COBERTURA.md` registra quais migrations do legado ja foram espelhadas no `supabase/migrations` do `vtur-svelte`.
