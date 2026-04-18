# 09 — Extras, Chat, Consultoria, Documentação e Rollout

> Status: ❌ Chat não implementado | ❌ Consultoria Online não implementado | ❌ Documentação admin parcial  
> Referência: [00-plano-geral.md](./00-plano-geral.md)

---

## 1. Consultoria Online

### 1.1 Estado no vtur-app
- Página: `pages/consultoria-online.astro`
- APIs: `/api/v1/dashboard/consultorias` (já portada) + agenda integrada

### 1.2 Estado no vtur-svelte
- ❌ **Não existe rota `/consultoria-online` no vtur-svelte**
- A API de dashboard já retorna dados de consultorias, mas não há página dedicada

### 1.3 O que implementar
```
src/routes/(app)/consultoria-online/+page.svelte
  → Lista de consultorias agendadas
  → Formulário para criar/editar consultoria
  → Integração com agenda (iCal export)
  → Filtros por status (aberta/fechada)
```

**APIs disponíveis:**
- `/api/v1/consultorias` — lista ✅
- `/api/v1/consultorias/ics` — export iCal ✅
- `/api/v1/agenda/*` — criação de eventos ✅

**Tabela:** `consultorias_online`

---

## 2. Chat

### 2.1 Estado no vtur-app
- Página: `pages/chat.astro`
- Integração: **Stream Chat** (Stream Chat React SDK)

### 2.2 Estado no vtur-svelte
- ❌ **Não implementado**

### 2.3 Estratégias de implementação

**Opção A — Stream Chat JS vanilla:**
```typescript
// Usar @stream-io/stream-chat (sem wrapper React)
import StreamChat from '@stream-io/stream-chat';
const client = StreamChat.getInstance(apiKey);
```
Requer reescrever toda a lógica de UI de chat em Svelte.

**Opção B — iframe com vtur-app:**
Montar um iframe apontando para a página de chat do vtur-app enquanto o módulo nativo não está pronto.

**Opção C (recomendada para rollout):** Omitir temporariamente do menu no vtur-svelte e manter link para vtur-app.

**Dependências:** `STREAM_CHAT_API_KEY`, `STREAM_CHAT_SECRET` no `.env`

---

## 3. Documentação do Sistema

### 3.1 Estado no vtur-app
- Página pública: `pages/documentacao/index.astro`
- Admin: `src/pages/api/admin/documentacao.ts` + sub-rotas
- Tabelas: `system_documentation`, `system_documentation_sections`

### 3.2 Estado no vtur-svelte
- ✅ `/documentacao` — página existe
- ❌ APIs admin de documentação faltando (5 endpoints)

### 3.3 Gaps admin/documentacao
| Endpoint | Função |
|---|---|
| `POST /admin/documentacao` | Criar/editar documento |
| `POST /admin/documentacao/imagem` | Upload de imagem inline |
| `GET /admin/documentacao/versoes` | Histórico de versões |
| `POST /admin/documentacao/restaurar` | Restaurar versão |
| `GET /admin/master-docs` | Documentos do master |

---

## 4. `/api/v1/reference-data`

**O que faz no vtur-app:** retorna dados de referência global (tipos de produto, formas de pagamento, destinos mais usados) em uma única chamada para otimizar carregamento inicial.

**Status:** ❌ Não implementado no vtur-svelte

**Impacto:** baixo — dados equivalentes estão disponíveis via endpoints individuais.

---

## 5. `/api/v1/session/bootstrap`

**O que faz no vtur-app:** retorna dados de sessão + perfil + módulos acessíveis em uma única chamada (usado no bootstrap do SPA).

**Status:** ❌ Não implementado

**Equivalente no vtur-svelte:** os dados de sessão já vêm via `hooks.server.ts` + `locals.session`, sem necessidade de chamada REST. Este endpoint pode não ser necessário na arquitetura SvelteKit.

---

## 6. Push Notifications

| Endpoint | Status |
|---|---|
| `/api/v1/push/subscribe` | ✅ |
| `/api/v1/push/unsubscribe` | ✅ |

---

## 7. Cards de Aniversário

| Endpoint | Status |
|---|---|
| `/api/v1/cards/render` | ✅ |
| `/api/v1/cards/render.png` | ✅ |
| `/api/v1/cards/render.svg` | ✅ |
| `/api/v1/cards/aniversario.svg` | ✅ |

---

## 8. Plano de Rollout

### 8.1 Sequência recomendada de pendências

| # | Tarefa | Prioridade | Esforço |
|---|---|---|---|
| 1 | Dashboard por papel (`/dashboard/*`) | 🔴 Alta | Médio |
| 2 | `conciliacao/update-valores` | 🔴 Alta | Baixo |
| 3 | `financeiro/ajustes-vendas/save` | 🟠 Média | Baixo |
| 4 | Roteiros APIs (7 endpoints) | 🟠 Média | Alto |
| 5 | Página `orcamentos/roteiros/[id]` | 🟠 Média | Médio |
| 6 | Consultoria Online página | 🟠 Média | Médio |
| 7 | Docs admin APIs (5 endpoints) | 🟡 Baixa | Médio |
| 8 | Chat (Stream Chat) | 🟡 Baixa | Alto |
| 9 | `reference-data` endpoint | 🟡 Baixa | Baixo |

### 8.2 Checklist de paridade antes de ir ao ar

- [ ] Todos os fluxos de login/logout/MFA testados
- [ ] Cadastro de venda completo (todos os campos)
- [ ] Importação de vendas via planilha
- [ ] Conciliação: import → run → assign → revert
- [ ] Geração de orçamento e conversão em venda
- [ ] Criação de viagem com acompanhantes
- [ ] Dashboard com dados reais por papel
- [ ] Relatório de vendas por período
- [ ] Permissões por módulo respeitadas
- [ ] Onboarding obrigatório funcionando
- [ ] MFA obrigatório por empresa funcionando

### 8.3 Testes de paridade de API

Para cada endpoint, verificar:
1. Mesmos parâmetros aceitos
2. Mesmo shape de resposta (campos e tipos)
3. Mesmas regras de permissão (papel + módulo_acesso)
4. Mesmo comportamento de erro (status codes)

### 8.4 Configuração de ambiente

```env
# .env (Cloudflare Workers via wrangler.toml)
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # para operações admin (revert conciliação, etc.)
STREAM_CHAT_API_KEY=         # para Chat
STREAM_CHAT_SECRET=
```

---

## 9. Módulos sem equivalente no vtur-app (novos no vtur-svelte)

O vtur-svelte tem alguns endpoints e páginas que não existem no vtur-app — foram adicionados durante a migração:

| Recurso | Descrição |
|---|---|
| `/api/v1/debug/permissions` | Debug de permissões por usuário |
| `/api/v1/vendas/complementares` | Recibos complementares |
| `/api/v1/vendas/merge` + `/merge-candidates` | Merge de vendas duplicadas |
| `/diagnostico` | Página de diagnóstico do sistema |
| Sistema de cards v2 | Temas de cards visuais aprimorados |

Estes são melhorias legítimas que não existem no legado — **não removê-los**.
