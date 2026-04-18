# 06 — Operação e Viagens

> Status: ✅ **Completo**  
> Referência: [00-plano-geral.md](./00-plano-geral.md)

---

## 1. Viagens

### 1.1 Páginas

| Rota | Status |
|---|---|
| `/operacao/viagens` | ✅ Lista de viagens |
| `/operacao/viagens/[id]` | ✅ Detalhe da viagem + acompanhantes |
| `/operacao/acompanhamento` | ✅ Painel de acompanhamento |

### 1.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/viagens` | GET | ✅ |
| `/api/v1/viagens/list` | GET | ✅ |
| `/api/v1/viagens/[id]` | GET/PATCH | ✅ |
| `/api/v1/viagens/create` | POST | ✅ |
| `/api/v1/viagens/delete` | POST | ✅ |
| `/api/v1/viagens/clientes` | GET | ✅ Busca de clientes para viagem |
| `/api/v1/viagens/cliente/[id]` | GET | ✅ |
| `/api/v1/viagens/cidades-busca` | GET | ✅ |
| `/api/v1/viagens/dossie` | GET | ✅ Gerar dossie PDF |
| `/api/v1/viagens/dossie-batch` | POST | ✅ Dossie em lote |

### 1.3 Regras críticas

- **Acompanhantes de viagem** — tabela `viagem_acompanhantes` vincula `cliente_acompanhantes` à viagem
- **Follow-up automático** — `follow_up_fechado = false` quando `data_fim` passa sem confirmação
- **Agrupamento por passageiro** — dashboards agrupam viagens pelo passageiro principal, não pelo registro
- **Gap de 10 dias** — viagens com menos de 10 dias de diferença são consideradas a mesma viagem para follow-up

---

## 2. Documentos de Viagem

### 2.1 Página

| Rota | Status |
|---|---|
| `/operacao/documentos-viagens` | ✅ |

### 2.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/documentos-viagens/create` | POST | ✅ |
| `/api/v1/documentos-viagens/list` | GET | ✅ |
| `/api/v1/documentos-viagens/update` | POST | ✅ |
| `/api/v1/documentos-viagens/delete` | POST | ✅ |
| `/api/v1/documentos-viagens/save-template` | POST | ✅ |

---

## 3. Vouchers

### 3.1 Páginas

| Rota | Status |
|---|---|
| `/operacao/vouchers` | ✅ |
| `/operacao/vouchers/[id]` | ✅ |
| `/operacao/vouchers/novo` | ✅ |

### 3.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/vouchers` | GET | ✅ |
| `/api/v1/vouchers/[id]` | GET/PATCH | ✅ |
| `/api/v1/vouchers/create` | POST | ✅ |
| `/api/v1/vouchers/delete` | POST | ✅ |
| `/api/v1/voucher-assets` | GET | ✅ Assets de voucher |

---

## 4. Comissionamento Operacional

### 4.1 Página

| Rota | Status |
|---|---|
| `/operacao/comissionamento` | ✅ |

---

## 5. Agenda

### 5.1 Páginas

| Rota | Status |
|---|---|
| `/operacao/agenda` | ✅ Agenda do vendedor |

### 5.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/agenda` | GET | ✅ |
| `/api/v1/agenda/create` | POST | ✅ |
| `/api/v1/agenda/update` | POST | ✅ |
| `/api/v1/agenda/delete` | POST | ✅ |
| `/api/v1/agenda/range` | GET | ✅ |
| `/api/v1/consultorias` | GET | ✅ |
| `/api/v1/consultorias/ics` | GET | ✅ Export iCal |

---

## 6. Tarefas / To-Do

### 6.1 Página

| Rota | Status |
|---|---|
| `/operacao/tarefas` | ✅ |

### 6.2 APIs

| Endpoint | Método | Status |
|---|---|---|
| `/api/v1/todo/board` | GET | ✅ |
| `/api/v1/todo/item` | GET/POST | ✅ |
| `/api/v1/todo/item/[id]` | GET/PATCH/DELETE | ✅ |
| `/api/v1/todo/batch` | POST | ✅ |
| `/api/v1/todo/category` | GET/POST | ✅ |
| `/api/v1/tarefas` | GET/POST | ✅ |
| `/api/v1/tarefas/clientes` | GET | ✅ |
| `/api/v1/tarefas/usuarios` | GET | ✅ |

---

## 7. Outros módulos de operação

| Módulo | Rota | Status |
|---|---|---|
| Controle SAC | `/operacao/controle-sac` | ✅ |
| Campanhas | `/operacao/campanhas` | ✅ |
| Recados/Mural | `/operacao/recados` | ✅ |
| Minhas Preferências | `/operacao/minhas-preferencias` | ✅ |

---

## 8. Gaps / Pendências

Nenhum gap crítico identificado neste módulo. Considerar verificação de paridade para:
- Fluxo de criação de viagem independente (sem orçamento)
- Exportação de dossie para diferentes formatos
