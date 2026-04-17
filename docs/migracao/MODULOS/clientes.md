# Modulo Clientes — Status de Migracao (`vtur-app` -> `vtur-svelte`)

## Objetivo do modulo
- Espelhar o fluxo operacional de Clientes do `vtur-app` no `vtur-svelte`.
- Preservar regras de negocio, compatibilidade com Supabase e o padrao UX aprovado:
- Sem botoes de acao por linha na listagem.
- Clique na linha abre o registro.

## Fonte de verdade utilizada
- `vtur-app/src/components/islands/ClientesConsultaIsland.tsx`
- `vtur-app/src/components/islands/ClientesIsland.tsx`
- `vtur-app/src/pages/clientes/cadastro.astro`
- `vtur-app/src/pages/api/v1/clientes/historico.ts`

## Status geral atual
- Em progresso avancado.
- O modulo de Clientes no `vtur-svelte` deixou de ser um CRUD simplificado e passou a trabalhar com:
- cadastro e edicao com paridade de campos principais do legado;
- historico consolidado de vendas e orcamentos;
- leitura detalhada do cliente;
- CRUD de acompanhantes;
- listagem mais rica, com relacionamento comercial e indicadores.

## Checklist de paridade

### 1) `clientes/+page.svelte`
- [x] Mantido padrao sem acoes por linha.
- [x] Clique na linha abre o detalhe do cliente.
- [x] Colunas ampliadas para refletir o legado:
- nome + e-mail + tags;
- CPF/CNPJ;
- contato;
- cidade/UF;
- tipo PF/PJ + tipo cliente;
- classificacao;
- status;
- total gasto;
- ultima compra + orcamentos.
- [x] KPIs adicionados na tela.
- [x] Filtros ampliados:
- status;
- estado;
- tipo de pessoa;
- classificacao;
- aniversariante do dia.
- [x] Busca agora considera campos operacionais retornados pela API.

### 2) `clientes/novo`
- [x] Validado contra `ClientesIsland.tsx`.
- [x] Campos mantidos no formulario:
- nome;
- nascimento;
- CPF/CNPJ;
- tipo_pessoa;
- telefone;
- whatsapp;
- email;
- classificacao;
- endereco;
- numero;
- complemento;
- bairro;
- cidade;
- estado;
- cep;
- rg;
- genero;
- nacionalidade;
- tags;
- tipo_cliente;
- notas;
- ativo.
- [x] Regras de obrigatoriedade alinhadas ao legado:
- nome obrigatorio;
- CPF/CNPJ obrigatorio;
- telefone obrigatorio;
- e-mail opcional.
- [x] Validacao PF/PJ aplicada.
- [x] Mascaras de telefone, CPF/CNPJ e CEP aplicadas.
- [x] Busca de CEP via ViaCEP adicionada.
- [x] Payload de criacao alinhado ao schema e aos nomes usados no legado (`notas`, `classificacao`, `tipo_cliente`, `tags`, `ativo`, `active`).

### 3) `clientes/[id]`
- [x] Detalhe reestruturado para uso operacional real.
- [x] Carrega dados completos do cliente.
- [x] Exibe informacoes pessoais, contato e endereco.
- [x] Exibe tags e notas.
- [x] Exibe KPIs consolidados.
- [x] Exibe historico de vendas com:
- data de lancamento;
- destino;
- cidade;
- embarque;
- valor;
- taxas;
- vinculo titular/passageiro.
- [x] Exibe historico de orcamentos.
- [x] Exibe acompanhantes vinculados.
- [x] Mantem acao de envio de aviso.

### 4) `clientes/[id]/editar`
- [x] Mesmo conjunto principal de campos do cadastro.
- [x] Coerencia entre `novo` e `editar`.
- [x] PATCH ajustado para persistir os mesmos nomes de campos do cadastro.
- [x] Aba de acompanhantes adicionada na edicao.
- [x] CRUD de acompanhantes implementado no `vtur-svelte`.
- [x] Busca de CEP via ViaCEP adicionada tambem na edicao.

### 5) APIs de Clientes
- [x] `GET /api/v1/clientes/list` enriquecida para suportar listagem operacional.
- [x] `POST /api/v1/clientes/create` alinhada com payload real do modulo.
- [x] `GET /api/v1/clientes/[id]` reescrita com escopo e payload mais completo.
- [x] `PATCH /api/v1/clientes/[id]` reescrita com validacao e persistencia coerentes.
- [x] `GET /api/v1/clientes/historico` criada para espelhar historico do legado.
- [x] CRUD de acompanhantes criado:
- `GET/POST /api/v1/clientes/[id]/acompanhantes`
- `PATCH/DELETE /api/v1/clientes/[id]/acompanhantes/[acompanhanteId]`
- [x] Escopo por perfil respeitado via helpers de acesso do `vtur-svelte`.

## Pendencias reais (nao concluido)
- [ ] Paridade completa do fluxo CRM do `ModalAvisoCliente` com templates reais, themes, preview rico e historico persistido como no legado.
- [ ] Historico de avisos / aniversarios com o mesmo nivel de integracao do `vtur-app`.
- [ ] Regras avancadas de master scope na interface de consulta (empresa/vendedor expostos visualmente como no legado).
- [ ] Possiveis fluxos auxiliares adicionais de cliente que dependem de tabelas/rotas ainda nao migradas do CRM legado.
- [ ] Revisao fina de todos os detalhes visuais e a11y do modulo; o projeto ainda possui warnings preexistentes e alguns avisos residuais de acessibilidade fora do escopo principal.

## Observacoes tecnicas
- O `npm run check` global continua falhando por erros preexistentes em outros modulos do repositório.
- Para Clientes, os erros novos de TypeScript foram eliminados; restam pendencias globais do projeto e avisos de acessibilidade em componentes compartilhados.
- O modulo foi ajustado sem alterar `Vouchers`.

## Proximo passo recomendado
- Fechar a paridade fina do CRM/Avisos de Clientes e, em seguida, revisar o proximo modulo da fila conforme prioridade funcional.
