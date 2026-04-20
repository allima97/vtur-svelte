# Paridade Fiel — vtur-app → vtur-svelte

> Atualizado em 2026-04-19 a partir da releitura guiada pelo produto.
> Fonte de verdade obrigatória: `vtur-app`.

---

## Objetivo desta etapa

Parar de tratar a migração como “telas equivalentes” e passar a tratar como **replicação fiel de fluxo, regra, dependência cruzada e comportamento visual**.

Isso significa que cada módulo do `vtur-svelte` precisa ser validado contra quatro camadas do `vtur-app`:

1. página/UX
2. componentes/islands usados pela tela
3. APIs e payloads envolvidos
4. efeitos indiretos em dashboard, ranking, comissão, CRM, permissões e relatórios

---

## Fase 0 — Shell e base visual

Escopo:

- menu mobile
- topbar e navegação inferior
- modais padronizados com Flowbite-Svelte
- filtros com proporção correta entre campos e botões
- largura útil real das páginas principais
- uploads e inputs no padrão visual do sistema

Critério de aceite:

- o `vtur-svelte` precisa reproduzir o shell do `vtur-app` em desktop e mobile sem “atalhos visuais”
- modais novos e antigos passam pelo mesmo wrapper
- páginas críticas não podem ficar artificialmente estreitas

---

## Fase 1 — Vendas como fonte central

### 1. Importar Vendas

Validar no `vtur-app`:

- criação manual e criação importada
- contrato CVC e reserva de cruzeiro
- extração, edição, validações e salvamento
- definição de recibo principal
- vínculo com cliente, vendedor, produto, pacote, taxas e destino

Aceite:

- mesmo fluxo de importação
- mesmas validações
- mesmo payload final salvo
- nenhum campo importante “simplificado”

### 2. Venda manual / editar venda

Validar:

- calculadora
- descontos
- recibos
- regras de comissão ligadas à venda
- impactos em metas, KPIs e relatórios

---

## Fase 2 — Financeiro com regra de negócio real

### 3. Regras de Comissionamento

Comparar:

- templates
- tipo `FIXO` / `ESCALONAVEL`
- faixas
- metas por vendedor/loja
- parâmetros que influenciam conciliação e override

Aceite:

- cálculo do `vtur-svelte` precisa bater com o `vtur-app`
- nada de percentual linear simplificado quando o legado usa regra escalonada

### 4. Conciliação de vendas

Comparar:

- importação de extrato
- ranking/assign
- mudanças auditadas
- reconcile
- overrides de recibo
- integração com vendas e relatórios

Aceite:

- conciliação precisa impactar o resto do sistema igual ao legado
- não pode existir UI “bonita” com lógica resumida

### 5. Ajustes Vendas

Comparar:

- busca de recibos
- rateio entre vendedores
- flags e rastreabilidade
- reflexo em metas, dashboard, ranking, relatórios e comissionamento

Aceite:

- nunca duplicar recibo real
- mostrar participação para ambos os vendedores
- impedir duplicidade de valor ou comissão

---

## Fase 3 — Cadastros e parâmetros que amarram o sistema

### 6. Parâmetros

Cobrir fielmente:

- comissão
- tipo de produto
- tipo de pacote
- metas
- avisos / CRM

Aceite:

- todas as telas que dependem desses parâmetros precisam refletir a mesma regra do legado

### 7. Permissões

Comparar:

- admin
- master
- leitura por módulo
- efeitos de permissão no menu, nas ações e nos endpoints

Aceite:

- o usuário vê e executa apenas o que o `vtur-app` permite

---

## Fase 4 — CRM e experiência operacional

### 8. CRM do cliente

Problema atual:

- `clientes/[id]` ainda reaproveita o CRM do admin em vez do CRM do cliente

Meta:

- separar o fluxo de CRM do cliente do fluxo administrativo
- manter exatamente os temas, templates, preview, vínculos e ações do legado

### 9. Mural de Recados

Meta:

- reproduzir navegação no estilo WhatsApp do `vtur-app`
- sidebar de conversas, thread ativa, cabeçalho e composição de mensagem

---

## Fase 5 — Dashboard fiel ao papel do usuário

### 10. Dashboard

Comparar:

- componentes por papel
- personalização de widgets
- ordem dos blocos
- persistência do layout
- botão de calculadora
- filtros com proporção correta

Aceite:

- usuário pode escolher o que mostrar e em que ordem, como no `vtur-app`
- KPIs e componentes precisam respeitar as mesmas fontes de dados e regras

---

## Método obrigatório de execução

Para cada módulo/página:

1. localizar a página correspondente no `vtur-app`
2. localizar a island/componente principal
3. mapear APIs chamadas por ela
4. mapear dependências indiretas e efeitos colaterais
5. só então ajustar ou reimplementar no `vtur-svelte`
6. validar visual + regra + impacto cruzado

---

## Ordem prática das próximas entregas

1. shell mobile, modais, importar vendas e filtros do dashboard
2. dashboard com personalização e calculadora
3. mural de recados estilo WhatsApp
4. importar vendas + venda manual
5. regras de comissão
6. conciliação
7. ajustes vendas
8. parâmetros e permissões
9. CRM do cliente separado do admin
10. regressão completa entre ranking, relatórios, dashboard e comissão
