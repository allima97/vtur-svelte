# 03 — Dashboard por Papel

> Status: ⚠️ **Gap crítico — sem rotas `/dashboard/*` separadas por papel**  
> Referência: [00-plano-geral.md](./00-plano-geral.md)

---

## 1. Estado no vtur-app

O vtur-app tem um sistema de dashboard com **rota separada por papel de usuário**:

| Rota | Papel | Arquivo vtur-app |
|---|---|---|
| `/dashboard/geral` | Vendedor / geral | `pages/dashboard/geral.astro` |
| `/dashboard/vendedor` | Vendedor | `pages/dashboard/vendedor.astro` |
| `/dashboard/gestor` | Gestor | `pages/dashboard/gestor.astro` |
| `/dashboard/financeiro` | Financeiro | `pages/dashboard/financeiro.astro` |
| `/dashboard/admin` | Admin | `pages/dashboard/admin.astro` |
| `/dashboard/master` | Master | `pages/dashboard/master.astro` |
| `/dashboard/logs` | Admin/Master | `pages/dashboard/logs.astro` |
| `/dashboard/permissoes` | Admin | `pages/dashboard/permissoes.astro` |

O **redirect canônico** é feito pela função `resolveDashboardPathByUserType()` em `lib/dashboardRedirect.ts` — verifica o tipo do usuário e redireciona para a rota correta.

---

## 2. Estado no vtur-svelte

O vtur-svelte tem apenas **uma única página** em `src/routes/(app)/+page.svelte` que exibe um dashboard com gráficos e KPIs — mas **não existe** a estrutura de rotas `/dashboard/*` separadas por papel.

---

## 3. APIs de dashboard — todas implementadas

| Endpoint | Status |
|---|---|
| `/api/v1/dashboard/summary` | ✅ |
| `/api/v1/dashboard/aniversariantes` | ✅ |
| `/api/v1/dashboard/follow-ups` | ✅ |
| `/api/v1/dashboard/consultorias` | ✅ |
| `/api/v1/dashboard/viagens` | ✅ |
| `/api/v1/dashboard/widgets` | ✅ |
| `/api/v1/dashboard/debug-aggregates` | ✅ |

---

## 4. O que precisa ser feito

### 4.1 Criar estrutura de rotas
```
src/routes/(app)/dashboard/
  geral/+page.svelte        ← vendedor/geral: KPIs, aniversariantes, follow-ups, viagens
  vendedor/+page.svelte     ← igual ao geral (mesmos widgets)
  gestor/+page.svelte       ← visão de equipe, ranking vendedores
  financeiro/+page.svelte   ← KPIs financeiros, comissões
  admin/+page.svelte        ← visão global, logs, status sistema
  master/+page.svelte       ← visão multi-empresa
  logs/+page.svelte         ← logs de acesso e atividade
  permissoes/+page.svelte   ← visão consolidada de permissões
```

### 4.2 Implementar `resolveDashboardPathByUserType()`
```typescript
// src/lib/dashboardRedirect.ts
export function resolveDashboardPath(userType: string, usoIndividual: boolean): string {
  if (usoIndividual) return '/dashboard/geral';
  const tipo = userType.toUpperCase();
  if (tipo.includes('ADMIN')) return '/dashboard/admin';
  if (tipo.includes('MASTER')) return '/dashboard/master';
  if (tipo.includes('GESTOR')) return '/dashboard/gestor';
  if (tipo.includes('FINANCEIRO')) return '/dashboard/financeiro';
  return '/dashboard/geral';
}
```

### 4.3 Widgets por papel

**Dashboard Geral/Vendedor:**
- KPIs: Qtd. Vendas, Total Bruto, Total Líquido, Ticket Médio
- Aniversariantes do mês
- Follow-ups pendentes
- Próximas viagens (14 dias)
- Consultorias agendadas (30 dias)
- Top Destinos
- Progresso de metas

**Dashboard Gestor:**
- Todos os widgets do geral
- Ranking da equipe
- Vendas por vendedor
- Meta consolidada da equipe

**Dashboard Financeiro:**
- KPIs financeiros
- Comissões do período
- Conciliação pendente (qtd)
- Ajustes de vendas recentes

**Dashboard Admin:**
- Visão global multi-empresa
- Logs de acesso recentes
- Status do sistema
- Usuários ativos

**Dashboard Master:**
- Multi-empresa: seletor de empresa
- KPIs consolidados por empresa
- Ranking de empresas

---

## 5. Dados já disponíveis via API

O endpoint `/api/v1/dashboard/summary?mode=geral&inicio=...&fim=...` já retorna:
```typescript
{
  vendasAgg: { qtdVendas, totalVendas, totalLiquido, ticketMedio, topDestinos },
  orcamentos: [...],
  metas: [...],
  followUps: [...],
  consultorias: [...],
  viagens: [...],
  podeVerOperacao: boolean,
  podeVerConsultoria: boolean,
  userCtx: { papel, companyId, ... }
}
```

Para modo gestor: `?mode=gestor&company_id=...&vendedor_ids=...`

---

## 6. Prioridade

**Alta** — é a primeira tela que o usuário vê após login. Sem dashboard por papel, o redirect pós-login vai para `/` (raiz) sem contexto de papel.
