# 05 — Clientes, Orçamentos e Roteiros

> Status: ✅ Clientes completo | ✅ Orçamentos completo | ❌ Roteiros com 7 gaps de API  
> Referência: [00-plano-geral.md](./00-plano-geral.md)

---

## 1. Clientes

### 1.1 Páginas

| Rota | Status |
|---|---|
| `/clientes` | ✅ Lista / busca |
| `/clientes/novo` | ✅ Cadastro |
| `/clientes/[id]` | ✅ Detalhe + histórico |
| `/clientes/[id]/editar` | ✅ Edição |
| `/aniversariantes` | ✅ Lista de aniversariantes |

### 1.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/clientes` | GET | ✅ |
| `/api/v1/clientes/list` | GET | ✅ |
| `/api/v1/clientes/[id]` | GET/PATCH | ✅ |
| `/api/v1/clientes/create` | POST | ✅ |
| `/api/v1/clientes/delete` | POST | ✅ |
| `/api/v1/clientes/historico` | GET | ✅ Histórico de compras |
| `/api/v1/clientes/resolve-import` | POST | ✅ RPC de importação |
| `/api/v1/clientes/[id]/acompanhantes` | GET/POST | ✅ |
| `/api/v1/clientes/[id]/acompanhantes/[acompanhanteId]` | GET/PATCH/DELETE | ✅ |
| `/api/v1/clientes/template-dispatches` | GET | ✅ Histórico CRM |
| `/api/v1/clientes/templates/send` | POST | ✅ Envio de template CRM |
| `/api/v1/users/aniversariantes` | GET | ✅ |
| `/api/v1/tarefas` | GET/POST | ✅ Tarefas por cliente |
| `/api/v1/tarefas/clientes` | GET | ✅ |
| `/api/v1/tarefas/usuarios` | GET | ✅ |

### 1.3 Regras críticas

- **`clientes_resolve_import`** — RPC que faz upsert de clientes via planilha, nunca duplicar manualmente
- **Acompanhantes** — tabela separada `cliente_acompanhantes`, vinculados ao cliente titular
- **CRM** — templates em `user_message_templates`, categorias em `crm_template_categories`
- **Histórico** — busca em `vendas + quote` para montar timeline completa do cliente

---

## 2. Orçamentos

### 2.1 Páginas

| Rota | Status |
|---|---|
| `/orcamentos` | ✅ Lista |
| `/orcamentos/novo` | ✅ Criação |
| `/orcamentos/[id]` | ✅ Detalhe |
| `/orcamentos/[id]/editar` | ✅ Edição |
| `/orcamentos/roteiros` | ✅ Lista de roteiros |
| `/orcamentos/roteiros/[id]` | ❌ **GAP — página faltando** |

### 2.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/orcamentos` | GET | ✅ (via list) |
| `/api/v1/orcamentos/list` | GET | ✅ |
| `/api/v1/orcamentos/create` | POST | ✅ |
| `/api/v1/orcamentos/save` | POST | ✅ |
| `/api/v1/orcamentos/delete` | POST | ✅ |
| `/api/v1/orcamentos/status` | POST | ✅ Mudança de status |
| `/api/v1/orcamentos/interaction` | POST | ✅ Registrar interação |
| `/api/v1/orcamentos/clientes` | GET | ✅ Busca de clientes para orçamento |
| `/api/v1/orcamentos/cliente-create` | POST | ✅ Criar cliente inline |
| `/api/v1/orcamentos/produtos` | GET | ✅ Catálogo de produtos |
| `/api/v1/orcamentos/tipos` | GET | ✅ Tipos de orçamento |
| `/api/v1/orcamentos/cidades-busca` | GET | ✅ |
| `/api/v1/preferencias/base` | GET | ✅ |
| `/api/v1/preferencias/list` | GET | ✅ |
| `/api/v1/preferencias/save` | POST | ✅ |
| `/api/v1/preferencias/delete` | POST | ✅ |
| `/api/v1/preferencias/cidades-busca` | GET | ✅ |
| `/api/v1/preferencias/share` | POST | ✅ |
| `/api/v1/preferencias/share-accept` | POST | ✅ |
| `/api/v1/preferencias/share-revoke` | POST | ✅ |

### 2.3 Tabelas críticas

```
quote           → cabeçalho do orçamento
quote_item      → itens do orçamento
quote_print_settings → configurações de impressão/PDF
```

---

## 3. Roteiros

### 3.1 Páginas

| Rota | Status |
|---|---|
| `/orcamentos/roteiros` | ✅ Lista |
| `/orcamentos/roteiros/[id]` | ❌ **Faltando — página de detalhe/edição** |

### 3.2 APIs — TODOS OS 7 FALTANDO

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/roteiros/list` | GET | ❌ |
| `/api/v1/roteiros/save` | POST | ❌ |
| `/api/v1/roteiros/delete` | POST | ❌ |
| `/api/v1/roteiros/dias-busca` | GET | ❌ Busca de destinos por dia |
| `/api/v1/roteiros/gerar-orcamento` | POST | ❌ Gera orçamento a partir de roteiro |
| `/api/v1/roteiros/sugestoes-busca` | GET | ❌ |
| `/api/v1/roteiros/sugestoes-salvar` | POST | ❌ |
| `/api/v1/roteiros/sugestoes-remover` | POST | ❌ |

**Arquivos de referência em vtur-app:**
```
src/pages/api/v1/roteiros/delete.ts
src/pages/api/v1/roteiros/dias-busca.ts
src/pages/api/v1/roteiros/gerar-orcamento.ts
src/pages/api/v1/roteiros/list.ts
src/pages/api/v1/roteiros/save.ts
src/pages/api/v1/roteiros/sugestoes-busca.ts
src/pages/api/v1/roteiros/sugestoes-remover.ts
src/pages/api/v1/roteiros/sugestoes-salvar.ts
```

**Tabelas envolvidas:**
```
roteiros         → cabeçalho do roteiro
roteiro_dias     → dias do roteiro
roteiro_sugestoes → sugestões de destinos
```

### 3.3 Prioridade

**Média** — roteiros é funcionalidade de criação de orçamentos avançada, usada por uma fração dos usuários. Pode ser implementado após os gaps de dashboard e conciliação.
