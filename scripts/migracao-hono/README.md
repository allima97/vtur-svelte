# Migração das rotas /api/v1 para Hono

Ferramentas usadas na Fase 2 (ver `docs/PROGRESSO-MIGRACAO.md`). Rodar numa cópia de trabalho, **nunca** direto na pasta do projeto.

1. `python3 migrate_domain.py <RAIZ_DO_PROJETO> <SAIDA> <dominio> [<dominio>...]`
   - Move o corpo de cada `src/routes/api/v1/<dominio>/**/+server.ts` **sem alteração** para
     `src/lib/server/api/routes/<dominio>/<segmentos-unidos-por-hifen>.ts` (`root.ts` na raiz).
     Só o nome e a assinatura do handler mudam (`GET` → `handle<Dominio><Rota>Get`), além dos imports relativos,
     que são reescritos para o mesmo arquivo.
   - Gera `index.ts` (router do domínio: rotas estáticas antes de `/:param`) e os `+server.ts` ponte
     (`export const GET = apiHandler`).
   - Confere a identidade de cada arquivo e escreve `report_<dominios>.json` na saída.
     `OK` significa idêntico; `DIF relfix` significa que só o caminho de um import relativo mudou.
2. `python3 gen_routing_test.py <SAIDA>/report_<dominios>.json <SAIDA>`
   gera `routing.test.ts` por domínio: método + URL → handler certo, params e métodos inexistentes → 404.
3. Registrar o router em `src/lib/server/api/app.ts` (`app.route('/<dominio>', <dominio>Routes)`).
4. Rodar `npm test`, `npx svelte-check`, `npm run build`, `npm run api:inventory`.
