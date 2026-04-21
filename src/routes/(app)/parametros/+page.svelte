<script lang="ts">
  import { onMount } from "svelte";
  import PageHeader from "$lib/components/ui/PageHeader.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { FieldCheckbox, FieldInput, FieldSelect } from "$lib/components/ui";
  import { toast } from "$lib/stores/ui";
  import { permissoes } from "$lib/stores/permissoes";
  import {
    createDefaultConciliacaoBandRules,
    createEmptyConciliacaoTier,
    createManualConciliacaoBandRule,
    normalizeConciliacaoTipo,
    sanitizeConciliacaoBandRules,
    sanitizeConciliacaoTiers,
    type ConciliacaoBandRule,
    type ConciliacaoTier,
  } from "$lib/utils/conciliacao";
  import { Percent, RefreshCw, Save, Shield, Trash2 } from "lucide-svelte";

  type ParametrosSistema = {
    id?: string | null;
    company_id: string | null;
    owner_user_id?: string | null;
    owner_user_nome?: string | null;
    usar_taxas_na_meta: boolean;
    foco_valor: "bruto" | "liquido";
    modo_corporativo: boolean;
    politica_cancelamento: "cancelar_venda" | "estornar_recibos";
    foco_faturamento: "bruto" | "liquido";
    conciliacao_sobrepoe_vendas: boolean;
    conciliacao_regra_ativa: boolean;
    conciliacao_tipo: "GERAL" | "ESCALONAVEL";
    conciliacao_meta_nao_atingida: number | null;
    conciliacao_meta_atingida: number | null;
    conciliacao_super_meta: number | null;
    conciliacao_tiers: ConciliacaoTier[];
    conciliacao_faixas_loja: ConciliacaoBandRule[];
    mfa_obrigatorio: boolean;
    exportacao_pdf: boolean;
    exportacao_excel: boolean;
  };

  function createDefaultForm(): ParametrosSistema {
    const base: ParametrosSistema = {
      id: null,
      company_id: null,
      owner_user_id: null,
      owner_user_nome: null,
      usar_taxas_na_meta: false,
      foco_valor: "bruto",
      modo_corporativo: false,
      politica_cancelamento: "cancelar_venda",
      foco_faturamento: "bruto",
      conciliacao_sobrepoe_vendas: false,
      conciliacao_regra_ativa: false,
      conciliacao_tipo: "GERAL",
      conciliacao_meta_nao_atingida: null,
      conciliacao_meta_atingida: null,
      conciliacao_super_meta: null,
      conciliacao_tiers: [],
      conciliacao_faixas_loja: [],
      mfa_obrigatorio: false,
      exportacao_pdf: false,
      exportacao_excel: false,
    };

    return {
      ...base,
      conciliacao_faixas_loja: createDefaultConciliacaoBandRules(base),
    };
  }

  function cloneTier(tier: ConciliacaoTier): ConciliacaoTier {
    return { ...tier };
  }

  function cloneBand(band: ConciliacaoBandRule): ConciliacaoBandRule {
    return {
      ...band,
      tiers: band.tiers.map(cloneTier),
    };
  }

  function hydrateForm(
    payload?: Partial<ParametrosSistema> | null,
  ): ParametrosSistema {
    const base = {
      ...createDefaultForm(),
      ...(payload || {}),
    } as ParametrosSistema;
    const normalized: ParametrosSistema = {
      ...base,
      foco_valor: base.foco_valor === "liquido" ? "liquido" : "bruto",
      foco_faturamento:
        base.foco_faturamento === "liquido" ? "liquido" : "bruto",
      politica_cancelamento:
        base.politica_cancelamento === "estornar_recibos"
          ? "estornar_recibos"
          : "cancelar_venda",
      conciliacao_tipo: normalizeConciliacaoTipo(base.conciliacao_tipo),
      conciliacao_tiers: sanitizeConciliacaoTiers(base.conciliacao_tiers),
      conciliacao_faixas_loja: [],
      usar_taxas_na_meta: Boolean(base.usar_taxas_na_meta),
      modo_corporativo: Boolean(base.modo_corporativo),
      conciliacao_sobrepoe_vendas: Boolean(base.conciliacao_sobrepoe_vendas),
      conciliacao_regra_ativa: Boolean(base.conciliacao_regra_ativa),
      mfa_obrigatorio: Boolean(base.mfa_obrigatorio),
      exportacao_pdf: Boolean(base.exportacao_pdf),
      exportacao_excel: Boolean(base.exportacao_excel),
    };

    normalized.conciliacao_faixas_loja = sanitizeConciliacaoBandRules(
      base.conciliacao_faixas_loja,
      normalized,
    ).map(cloneBand);

    return {
      ...normalized,
      conciliacao_tiers: normalized.conciliacao_tiers.map(cloneTier),
    };
  }

  function parseNumberOrNull(value: string): number | null {
    if (value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function parseNumberOrZero(value: string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatDateTime(value?: string | null) {
    if (!value) return "Ainda nao salvo";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Ainda nao salvo";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  let loading = true;
  let saving = false;
  let accessDenied = false;
  let form = createDefaultForm();
  let ultimaAtualizacao: string | null = null;
  let origemDados: "default" | "banco" = "default";
  let ownerNome: string | null = null;

  $: canEdit =
    !$permissoes.ready ||
    $permissoes.isSystemAdmin ||
    $permissoes.isMaster ||
    permissoes.can("parametros", "edit") ||
    permissoes.can("admin", "edit") ||
    permissoes.can("admin_financeiro", "edit");
  $: readOnly = !canEdit;
  $: bloqueado = loading || saving || accessDenied || readOnly;
  $: bloqueadoConciliacao = bloqueado || !form.conciliacao_regra_ativa;
  $: bandasAtivas = form.conciliacao_faixas_loja.filter(
    (item) => item.ativo,
  ).length;

  async function loadPage() {
    loading = true;
    accessDenied = false;

    try {
      const response = await fetch("/api/v1/parametros/sistema");

      if (response.status === 403) {
        accessDenied = true;
        form = createDefaultForm();
        return;
      }

      if (!response.ok) throw new Error(await response.text());

      const payload = await response.json();
      form = hydrateForm(payload.params);
      ultimaAtualizacao = payload.ultima_atualizacao || null;
      origemDados = payload.origem === "banco" ? "banco" : "default";
      ownerNome = payload.owner_nome || payload.params?.owner_user_nome || null;
    } catch (err) {
      console.error(err);
      toast.error("Nao foi possivel carregar os parametros do sistema.");
    } finally {
      loading = false;
    }
  }

  async function savePage() {
    if (bloqueado) return;

    saving = true;

    try {
      const response = await fetch("/api/v1/parametros/sistema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          conciliacao_tiers: form.conciliacao_tiers.map(cloneTier),
          conciliacao_faixas_loja: form.conciliacao_faixas_loja.map(cloneBand),
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      const payload = await response.json();
      if (payload?.id) {
        form = { ...form, id: payload.id };
      }

      ultimaAtualizacao = new Date().toISOString();
      origemDados = "banco";
      ownerNome = payload?.owner_nome || form.owner_user_nome || ownerNome;
      toast.success("Parametros do sistema salvos com sucesso.");
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar parametros.",
      );
    } finally {
      saving = false;
    }
  }

  function updateTopLevel<K extends keyof ParametrosSistema>(
    key: K,
    value: ParametrosSistema[K],
  ) {
    form = { ...form, [key]: value };
  }

  function addTier(faixa: "PRE" | "POS") {
    form = {
      ...form,
      conciliacao_tiers: [
        ...form.conciliacao_tiers,
        createEmptyConciliacaoTier(faixa),
      ],
    };
  }

  function updateTier(
    index: number,
    field: keyof ConciliacaoTier,
    value: string,
  ) {
    form = {
      ...form,
      conciliacao_tiers: form.conciliacao_tiers.map((tier, currentIndex) =>
        currentIndex === index
          ? {
              ...tier,
              [field]:
                field === "faixa"
                  ? value === "POS"
                    ? "POS"
                    : "PRE"
                  : parseNumberOrZero(value),
            }
          : tier,
      ),
    };
  }

  function removeTier(index: number) {
    form = {
      ...form,
      conciliacao_tiers: form.conciliacao_tiers.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    };
  }

  function addBand() {
    form = {
      ...form,
      conciliacao_faixas_loja: [
        ...form.conciliacao_faixas_loja,
        createManualConciliacaoBandRule(
          form.conciliacao_faixas_loja.length + 1,
        ),
      ],
    };
  }

  function updateBand(index: number, changes: Partial<ConciliacaoBandRule>) {
    form = {
      ...form,
      conciliacao_faixas_loja: form.conciliacao_faixas_loja.map(
        (band, currentIndex) =>
          currentIndex === index ? { ...band, ...changes } : band,
      ),
    };
  }

  function removeBand(index: number) {
    if (form.conciliacao_faixas_loja.length <= 1) return;
    form = {
      ...form,
      conciliacao_faixas_loja: form.conciliacao_faixas_loja.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    };
  }

  function addBandTier(index: number, faixa: "PRE" | "POS") {
    updateBand(index, {
      tiers: [
        ...form.conciliacao_faixas_loja[index].tiers,
        createEmptyConciliacaoTier(faixa),
      ],
    });
  }

  function updateBandTier(
    index: number,
    tierIndex: number,
    field: keyof ConciliacaoTier,
    value: string,
  ) {
    updateBand(index, {
      tiers: form.conciliacao_faixas_loja[index].tiers.map(
        (tier, currentIndex) =>
          currentIndex === tierIndex
            ? {
                ...tier,
                [field]:
                  field === "faixa"
                    ? value === "POS"
                      ? "POS"
                      : "PRE"
                    : parseNumberOrZero(value),
              }
            : tier,
      ),
    });
  }

  function removeBandTier(index: number, tierIndex: number) {
    updateBand(index, {
      tiers: form.conciliacao_faixas_loja[index].tiers.filter(
        (_, currentIndex) => currentIndex !== tierIndex,
      ),
    });
  }

  onMount(loadPage);
</script>

<svelte:head>
  <title>Parametros do Sistema | VTUR</title>
</svelte:head>

<PageHeader
  title="Parametros do Sistema"
  subtitle="Metas, seguranca, conciliacao e regras operacionais alinhadas ao fluxo administrativo do vtur-app."
  color="financeiro"
  breadcrumbs={[{ label: "Parametros" }]}
  actions={[
    {
      label: "Atualizar",
      onClick: loadPage,
      variant: "secondary",
      icon: RefreshCw,
    },
  ]}
/>

{#if accessDenied}
  <Card color="financeiro">
    <div class="flex items-start gap-3">
      <Shield size={22} class="mt-0.5 text-amber-600" />
      <div class="space-y-1">
        <p class="font-semibold text-slate-900">Acesso restrito</p>
        <p class="text-sm text-slate-600">
          Seu perfil nao possui acesso a este conjunto de parametros. As regras
          de leitura e edicao continuam sendo validadas pela API conforme o
          escopo do usuario.
        </p>
      </div>
    </div>
  </Card>
{:else}
  <div class="space-y-6">
    <Card color="financeiro" title="Resumo da configuracao">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Ultima atualizacao
          </p>
          <p class="mt-2 text-sm font-semibold text-slate-900">
            {formatDateTime(ultimaAtualizacao)}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Origem
          </p>
          <p class="mt-2 text-sm font-semibold text-slate-900">
            {origemDados === "banco" ? "Banco de dados" : "Valores padrao"}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Ultima edicao por
          </p>
          <p class="mt-2 text-sm font-semibold text-slate-900">
            {ownerNome || "Sem registro"}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Regra de conciliacao
          </p>
          <p class="mt-2 text-sm font-semibold text-slate-900">
            {form.conciliacao_regra_ativa
              ? form.conciliacao_tipo === "ESCALONAVEL"
                ? "Escalonavel"
                : "Geral"
              : "Desativada"}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Faixas ativas
          </p>
          <p class="mt-2 text-sm font-semibold text-slate-900">
            {bandasAtivas}
          </p>
        </div>
      </div>

      {#if readOnly}
        <div
          class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Seu perfil esta em modo de consulta. A API continua protegendo o
          escopo e as edicoes administrativas.
        </div>
      {/if}
    </Card>

    <div class="grid gap-6 xl:grid-cols-3">
      <Card color="financeiro" title="Metas e faturamento">
        <div class="space-y-4">
          <FieldCheckbox
            label="Meta considera taxas"
            helper="Inclui taxas no calculo da meta geral e no resumo operacional da equipe."
            bind:checked={form.usar_taxas_na_meta}
            disabled={bloqueado}
            color="financeiro"
            class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
          />

          <FieldSelect
            id="foco-valores"
            label="Foco das metas"
            value={form.foco_valor}
            options={[{ value: 'bruto', label: 'Valor bruto' }, { value: 'liquido', label: 'Valor liquido' }]}
            disabled={bloqueado}
            class_name="w-full"
            on:change={(event) => updateTopLevel('foco_valor', (event.currentTarget as HTMLSelectElement).value === 'liquido' ? 'liquido' : 'bruto')}
          />
          <FieldSelect
            id="foco-faturamento"
            label="Foco de faturamento"
            value={form.foco_faturamento}
            options={[{ value: 'bruto', label: 'Valor bruto' }, { value: 'liquido', label: 'Valor liquido' }]}
            disabled={bloqueado}
            class_name="w-full"
            on:change={(event) => updateTopLevel('foco_faturamento', (event.currentTarget as HTMLSelectElement).value === 'liquido' ? 'liquido' : 'bruto')}
          />
        </div>
      </Card>

      <Card color="financeiro" title="Operacao da empresa">
        <div class="space-y-4">
          <FieldCheckbox
            label="Modo corporativo"
            helper="Ativa controles multiempresa e comportamentos extras para estruturas corporativas."
            bind:checked={form.modo_corporativo}
            disabled={bloqueado}
            color="financeiro"
            class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
          />

          <FieldSelect
            id="politica-cancelamento"
            label="Politica de cancelamento"
            value={form.politica_cancelamento}
            options={[
              { value: 'cancelar_venda', label: 'Cancelar venda (exclui venda)' },
              { value: 'estornar_recibos', label: 'Estornar recibos (manter venda)' }
            ]}
            disabled={bloqueado}
            class_name="w-full"
            helper="Define o comportamento padrao do sistema ao cancelar uma venda."
            on:change={(event) => updateTopLevel('politica_cancelamento', (event.currentTarget as HTMLSelectElement).value === 'estornar_recibos' ? 'estornar_recibos' : 'cancelar_venda')}
          />
        </div>
      </Card>

      <Card color="financeiro" title="Seguranca e exportacoes">
        <div class="space-y-4">
          <FieldCheckbox
            label="Exigir verificacao em duas etapas (2FA)"
            helper="Usuarios sem autenticador configurado precisam regularizar o acesso antes de entrar nos modulos."
            bind:checked={form.mfa_obrigatorio}
            disabled={bloqueado}
            color="financeiro"
            class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
          />
          <FieldCheckbox
            label="Exportacao em PDF"
            helper="Libera relatorios e documentos administrativos em PDF."
            bind:checked={form.exportacao_pdf}
            disabled={bloqueado}
            color="financeiro"
            class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
          />
          <FieldCheckbox
            label="Exportacao em Excel"
            helper="Mantem exportacao tabular ativa para relatorios, conciliacao e operacao administrativa."
            bind:checked={form.exportacao_excel}
            disabled={bloqueado}
            color="financeiro"
            class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
          />
        </div>
      </Card>
    </div>

    <Card color="financeiro" title="Conciliacao e comissionamento">
      <div class="space-y-6">
        <div class="grid gap-4 xl:grid-cols-2">
          <FieldCheckbox
            label="Conciliacao como fonte principal"
            helper="Faz a movimentacao conciliada prevalecer sobre a venda lancada manualmente."
            bind:checked={form.conciliacao_sobrepoe_vendas}
            disabled={bloqueado}
            color="financeiro"
            class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
          />
          <FieldCheckbox
            label="Regra propria de comissao"
            helper="Coloca a regra de conciliacao antes do template geral e das regras por produto."
            bind:checked={form.conciliacao_regra_ativa}
            disabled={bloqueado}
            color="financeiro"
            class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
          />
        </div>

        <div class="grid gap-4 xl:grid-cols-4">
          <FieldSelect
            id="conciliacao-tipo"
            label="Tipo da regra"
            value={form.conciliacao_tipo}
            options={[
              { value: 'GERAL', label: 'Geral (percentuais fixos)' },
              { value: 'ESCALONAVEL', label: 'Escalonavel (faixas)' }
            ]}
            disabled={bloqueadoConciliacao}
            class_name="w-full"
            on:change={(event) => updateTopLevel('conciliacao_tipo', (event.currentTarget as HTMLSelectElement).value === 'ESCALONAVEL' ? 'ESCALONAVEL' : 'GERAL')}
          />
          <FieldInput
            id="conciliacao-nao-batida"
            label="% Concil. meta nao batida"
            type="number"
            step="0.01"
            value={form.conciliacao_meta_nao_atingida ?? ''}
            disabled={bloqueadoConciliacao}
            class_name="w-full"
            on:input={(event) => updateTopLevel('conciliacao_meta_nao_atingida', parseNumberOrNull((event.currentTarget as HTMLInputElement).value))}
          />
          <FieldInput
            id="conciliacao-batida"
            label="% Concil. meta batida"
            type="number"
            step="0.01"
            value={form.conciliacao_meta_atingida ?? ''}
            disabled={bloqueadoConciliacao}
            class_name="w-full"
            on:input={(event) => updateTopLevel('conciliacao_meta_atingida', parseNumberOrNull((event.currentTarget as HTMLInputElement).value))}
          />
          <FieldInput
            id="conciliacao-super-meta"
            label="% Concil. super meta"
            type="number"
            step="0.01"
            value={form.conciliacao_super_meta ?? ''}
            disabled={bloqueadoConciliacao}
            class_name="w-full"
            on:input={(event) => updateTopLevel('conciliacao_super_meta', parseNumberOrNull((event.currentTarget as HTMLInputElement).value))}
          />
        </div>

        <p class="text-sm text-slate-500">
          Quando ativa, essa regra entra antes do template geral e das regras
          por produto para recibos conciliados.
        </p>

        {#if form.conciliacao_regra_ativa && form.conciliacao_tipo === "ESCALONAVEL"}
          <div
            class="rounded-[18px] border border-orange-200 bg-orange-50/40 p-4"
          >
            <div
              class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div class="flex items-center gap-2">
                  <Percent size={18} class="text-orange-600" />
                  <h3 class="text-base font-semibold text-slate-900">
                    Faixas escalonaveis da conciliacao
                  </h3>
                </div>
                <p class="text-sm text-slate-500">
                  Reaproveita a logica do legado com faixas PRE e POS para
                  incremento por meta e comissao.
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  on:click={() => addTier("PRE")}
                  disabled={bloqueado}
                >
                  + Faixa PRE
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  color="financeiro"
                  on:click={() => addTier("POS")}
                  disabled={bloqueado}
                >
                  + Faixa POS
                </Button>
              </div>
            </div>

            {#if form.conciliacao_tiers.length === 0}
              <div
                class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500"
              >
                Nenhuma faixa escalonavel cadastrada.
              </div>
            {:else}
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-200 text-sm">
                  <thead class="bg-white/80">
                    <tr class="text-left text-slate-600">
                      <th class="px-3 py-2 font-medium">Faixa</th>
                      <th class="px-3 py-2 font-medium">De (%)</th>
                      <th class="px-3 py-2 font-medium">Ate (%)</th>
                      <th class="px-3 py-2 font-medium">Inc. Meta (%)</th>
                      <th class="px-3 py-2 font-medium">Inc. Comissao (%)</th>
                      <th class="px-3 py-2 text-right font-medium">Acoes</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200 bg-white">
                    {#each form.conciliacao_tiers as tier, index}
                      <tr>
                        <td class="px-3 py-2">
                          <select
                            class="vtur-input min-w-[110px]"
                            value={tier.faixa}
                            disabled={bloqueado}
                            on:change={(event) =>
                              updateTier(
                                index,
                                "faixa",
                                (event.currentTarget as HTMLSelectElement)
                                  .value,
                              )}
                          >
                            <option value="PRE">PRE</option>
                            <option value="POS">POS</option>
                          </select>
                        </td>
                        <td class="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={tier.de_pct}
                            class="vtur-input min-w-[120px]"
                            disabled={bloqueado}
                            on:input={(event) =>
                              updateTier(
                                index,
                                "de_pct",
                                (event.currentTarget as HTMLInputElement).value,
                              )}
                          />
                        </td>
                        <td class="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={tier.ate_pct}
                            class="vtur-input min-w-[120px]"
                            disabled={bloqueado}
                            on:input={(event) =>
                              updateTier(
                                index,
                                "ate_pct",
                                (event.currentTarget as HTMLInputElement).value,
                              )}
                          />
                        </td>
                        <td class="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={tier.inc_pct_meta}
                            class="vtur-input min-w-[140px]"
                            disabled={bloqueado}
                            on:input={(event) =>
                              updateTier(
                                index,
                                "inc_pct_meta",
                                (event.currentTarget as HTMLInputElement).value,
                              )}
                          />
                        </td>
                        <td class="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={tier.inc_pct_comissao}
                            class="vtur-input min-w-[160px]"
                            disabled={bloqueado}
                            on:input={(event) =>
                              updateTier(
                                index,
                                "inc_pct_comissao",
                                (event.currentTarget as HTMLInputElement).value,
                              )}
                          />
                        </td>
                        <td class="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            on:click={() => removeTier(index)}
                            disabled={bloqueado}
                          >
                            Remover
                          </Button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/if}

        <div class="rounded-[18px] border border-slate-200 bg-slate-50/60 p-4">
          <div
            class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h3 class="text-base font-semibold text-slate-900">
                Faixas de comissionamento da loja
              </h3>
              <p class="text-sm text-slate-500">
                Define como a regra de conciliacao deve ser aplicada conforme a
                % de comissao da loja em cada recibo.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              color="financeiro"
              on:click={addBand}
              disabled={bloqueado}
            >
              + Nova faixa
            </Button>
          </div>

          <div class="space-y-4">
            {#each form.conciliacao_faixas_loja as band, bandIndex}
              <div
                class="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div
                  class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div>
                    <p class="text-base font-semibold text-slate-900">
                      {band.nome || `Faixa ${bandIndex + 1}`}
                    </p>
                    <p class="text-sm text-slate-500">
                      Faixa da loja entre
                      <span class="font-medium text-slate-700">
                        {band.percentual_min == null
                          ? " sem minimo"
                          : ` ${band.percentual_min}%`}
                      </span>
                      e
                      <span class="font-medium text-slate-700">
                        {band.percentual_max == null
                          ? " sem maximo"
                          : ` ${band.percentual_max}%`}
                      </span>
                      .
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    on:click={() => removeBand(bandIndex)}
                    disabled={bloqueado ||
                      form.conciliacao_faixas_loja.length <= 1}
                  >
                    <Trash2 size={16} class="mr-1" />
                    Excluir faixa
                  </Button>
                </div>

                <div class="grid gap-4 xl:grid-cols-4">
                  <div>
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700"
                      for={`band-name-${bandIndex}`}
                    >
                      Nome da faixa
                    </label>
                    <input
                      id={`band-name-${bandIndex}`}
                      class="vtur-input w-full"
                      value={band.nome}
                      disabled={bloqueado}
                      on:input={(event) =>
                        updateBand(bandIndex, {
                          nome: (event.currentTarget as HTMLInputElement).value,
                        })}
                    />
                  </div>

                  <div>
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700"
                      for={`band-min-${bandIndex}`}
                    >
                      % minimo
                    </label>
                    <input
                      id={`band-min-${bandIndex}`}
                      type="number"
                      step="0.01"
                      value={band.percentual_min ?? ""}
                      class="vtur-input w-full"
                      disabled={bloqueado}
                      on:input={(event) =>
                        updateBand(bandIndex, {
                          percentual_min: parseNumberOrNull(
                            (event.currentTarget as HTMLInputElement).value,
                          ),
                        })}
                    />
                  </div>

                  <div>
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700"
                      for={`band-max-${bandIndex}`}
                    >
                      % maximo
                    </label>
                    <input
                      id={`band-max-${bandIndex}`}
                      type="number"
                      step="0.01"
                      value={band.percentual_max ?? ""}
                      class="vtur-input w-full"
                      disabled={bloqueado}
                      on:input={(event) =>
                        updateBand(bandIndex, {
                          percentual_max: parseNumberOrNull(
                            (event.currentTarget as HTMLInputElement).value,
                          ),
                        })}
                    />
                  </div>

                  <div>
                    <label
                      class="mb-1 block text-sm font-medium text-slate-700"
                      for={`band-base-${bandIndex}`}
                    >
                      Base do pagamento
                    </label>
                    <select
                      id={`band-base-${bandIndex}`}
                      class="vtur-input w-full"
                      value={band.tipo_calculo}
                      disabled={bloqueadoConciliacao}
                      on:change={(event) =>
                        updateBand(bandIndex, {
                          tipo_calculo:
                            (event.currentTarget as HTMLSelectElement).value ===
                            "PRODUTO_DIFERENCIADO"
                              ? "PRODUTO_DIFERENCIADO"
                              : "CONCILIACAO",
                        })}
                    >
                      <option value="CONCILIACAO">Regra da conciliacao</option>
                      <option value="PRODUTO_DIFERENCIADO"
                        >Produto diferenciado</option
                      >
                    </select>
                  </div>
                </div>

                <label
                  class="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <input
                    type="checkbox"
                    checked={band.ativo}
                    disabled={bloqueadoConciliacao}
                    on:change={(event) =>
                      updateBand(bandIndex, {
                        ativo: (event.currentTarget as HTMLInputElement)
                          .checked,
                      })}
                  />
                  <div>
                    <p class="font-medium text-slate-900">Faixa ativa</p>
                    <p class="text-sm text-slate-500">
                      Quando ativa, essa faixa entra no calculo dos recibos
                      conciliados.
                    </p>
                  </div>
                </label>

                {#if band.tipo_calculo === "CONCILIACAO"}
                  <div class="mt-4 grid gap-4 xl:grid-cols-4">
                    <div>
                      <label
                        class="mb-1 block text-sm font-medium text-slate-700"
                        for={`band-type-${bandIndex}`}
                      >
                        Tipo da regra
                      </label>
                      <select
                        id={`band-type-${bandIndex}`}
                        class="vtur-input w-full"
                        value={band.tipo}
                        disabled={bloqueadoConciliacao || !band.ativo}
                        on:change={(event) =>
                          updateBand(bandIndex, {
                            tipo:
                              (event.currentTarget as HTMLSelectElement)
                                .value === "ESCALONAVEL"
                                ? "ESCALONAVEL"
                                : "GERAL",
                          })}
                      >
                        <option value="GERAL">Geral (percentuais fixos)</option>
                        <option value="ESCALONAVEL">Escalonavel (faixas)</option
                        >
                      </select>
                    </div>

                    <div>
                      <label
                        class="mb-1 block text-sm font-medium text-slate-700"
                        for={`band-nao-${bandIndex}`}
                      >
                        % Meta nao batida
                      </label>
                      <input
                        id={`band-nao-${bandIndex}`}
                        type="number"
                        step="0.01"
                        value={band.meta_nao_atingida ?? ""}
                        class="vtur-input w-full"
                        disabled={bloqueadoConciliacao || !band.ativo}
                        on:input={(event) =>
                          updateBand(bandIndex, {
                            meta_nao_atingida: parseNumberOrNull(
                              (event.currentTarget as HTMLInputElement).value,
                            ),
                          })}
                      />
                    </div>

                    <div>
                      <label
                        class="mb-1 block text-sm font-medium text-slate-700"
                        for={`band-sim-${bandIndex}`}
                      >
                        % Meta batida
                      </label>
                      <input
                        id={`band-sim-${bandIndex}`}
                        type="number"
                        step="0.01"
                        value={band.meta_atingida ?? ""}
                        class="vtur-input w-full"
                        disabled={bloqueadoConciliacao || !band.ativo}
                        on:input={(event) =>
                          updateBand(bandIndex, {
                            meta_atingida: parseNumberOrNull(
                              (event.currentTarget as HTMLInputElement).value,
                            ),
                          })}
                      />
                    </div>

                    <div>
                      <label
                        class="mb-1 block text-sm font-medium text-slate-700"
                        for={`band-super-${bandIndex}`}
                      >
                        % Super meta
                      </label>
                      <input
                        id={`band-super-${bandIndex}`}
                        type="number"
                        step="0.01"
                        value={band.super_meta ?? ""}
                        class="vtur-input w-full"
                        disabled={bloqueadoConciliacao || !band.ativo}
                        on:input={(event) =>
                          updateBand(bandIndex, {
                            super_meta: parseNumberOrNull(
                              (event.currentTarget as HTMLInputElement).value,
                            ),
                          })}
                      />
                    </div>
                  </div>

                  <p class="mt-3 text-sm text-slate-500">
                    Use produto diferenciado somente quando esta faixa precisa
                    obedecer as regras especificas ja cadastradas para produtos
                    especiais.
                  </p>

                  {#if band.tipo === "ESCALONAVEL"}
                    <div
                      class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div
                        class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p class="font-medium text-slate-900">
                            Faixas escalonaveis desta banda
                          </p>
                          <p class="text-sm text-slate-500">
                            Monte o comportamento PRE/POS que sera aplicado so
                            para esta faixa da loja.
                          </p>
                        </div>

                        <div class="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            on:click={() => addBandTier(bandIndex, "PRE")}
                            disabled={bloqueadoConciliacao || !band.ativo}
                          >
                            + Faixa PRE
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            color="financeiro"
                            on:click={() => addBandTier(bandIndex, "POS")}
                            disabled={bloqueadoConciliacao || !band.ativo}
                          >
                            + Faixa POS
                          </Button>
                        </div>
                      </div>

                      {#if band.tiers.length === 0}
                        <div
                          class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500"
                        >
                          Nenhuma faixa escalonavel cadastrada para esta banda.
                        </div>
                      {:else}
                        <div class="overflow-x-auto">
                          <table
                            class="min-w-full divide-y divide-slate-200 text-sm"
                          >
                            <thead class="bg-white/80">
                              <tr class="text-left text-slate-600">
                                <th class="px-3 py-2 font-medium">Faixa</th>
                                <th class="px-3 py-2 font-medium">De (%)</th>
                                <th class="px-3 py-2 font-medium">Ate (%)</th>
                                <th class="px-3 py-2 font-medium"
                                  >Inc. Meta (%)</th
                                >
                                <th class="px-3 py-2 font-medium"
                                  >Inc. Comissao (%)</th
                                >
                                <th class="px-3 py-2 text-right font-medium"
                                  >Acoes</th
                                >
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200 bg-white">
                              {#each band.tiers as tier, tierIndex}
                                <tr>
                                  <td class="px-3 py-2">
                                    <select
                                      class="vtur-input min-w-[110px]"
                                      value={tier.faixa}
                                      disabled={bloqueadoConciliacao ||
                                        !band.ativo}
                                      on:change={(event) =>
                                        updateBandTier(
                                          bandIndex,
                                          tierIndex,
                                          "faixa",
                                          (
                                            event.currentTarget as HTMLSelectElement
                                          ).value,
                                        )}
                                    >
                                      <option value="PRE">PRE</option>
                                      <option value="POS">POS</option>
                                    </select>
                                  </td>
                                  <td class="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={tier.de_pct}
                                      class="vtur-input min-w-[120px]"
                                      disabled={bloqueadoConciliacao ||
                                        !band.ativo}
                                      on:input={(event) =>
                                        updateBandTier(
                                          bandIndex,
                                          tierIndex,
                                          "de_pct",
                                          (
                                            event.currentTarget as HTMLInputElement
                                          ).value,
                                        )}
                                    />
                                  </td>
                                  <td class="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={tier.ate_pct}
                                      class="vtur-input min-w-[120px]"
                                      disabled={bloqueadoConciliacao ||
                                        !band.ativo}
                                      on:input={(event) =>
                                        updateBandTier(
                                          bandIndex,
                                          tierIndex,
                                          "ate_pct",
                                          (
                                            event.currentTarget as HTMLInputElement
                                          ).value,
                                        )}
                                    />
                                  </td>
                                  <td class="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={tier.inc_pct_meta}
                                      class="vtur-input min-w-[140px]"
                                      disabled={bloqueadoConciliacao ||
                                        !band.ativo}
                                      on:input={(event) =>
                                        updateBandTier(
                                          bandIndex,
                                          tierIndex,
                                          "inc_pct_meta",
                                          (
                                            event.currentTarget as HTMLInputElement
                                          ).value,
                                        )}
                                    />
                                  </td>
                                  <td class="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={tier.inc_pct_comissao}
                                      class="vtur-input min-w-[160px]"
                                      disabled={bloqueadoConciliacao ||
                                        !band.ativo}
                                      on:input={(event) =>
                                        updateBandTier(
                                          bandIndex,
                                          tierIndex,
                                          "inc_pct_comissao",
                                          (
                                            event.currentTarget as HTMLInputElement
                                          ).value,
                                        )}
                                    />
                                  </td>
                                  <td class="px-3 py-2 text-right">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="danger"
                                      on:click={() =>
                                        removeBandTier(bandIndex, tierIndex)}
                                      disabled={bloqueadoConciliacao ||
                                        !band.ativo}
                                    >
                                      Remover
                                    </Button>
                                  </td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      {/if}
                    </div>
                  {/if}
                {:else}
                  <div
                    class="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
                  >
                    Esta faixa usara as regras de produto diferenciado ja
                    cadastradas no sistema.
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </Card>

    <Card color="financeiro" title="Acoes">
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <p class="text-sm text-slate-600">
          Revise cada bloco antes de salvar para manter metas, seguranca e
          conciliacao consistentes para toda a empresa.
        </p>

        <div class="flex flex-wrap gap-3">
          <Button variant="secondary" on:click={loadPage} disabled={saving}>
            <RefreshCw size={16} class="mr-2" />
            Recarregar
          </Button>
          <Button
            variant="primary"
            color="financeiro"
            on:click={savePage}
            loading={saving}
            disabled={bloqueado}
          >
            <Save size={16} class="mr-2" />
            Salvar parametros
          </Button>
        </div>
      </div>
    </Card>
  </div>
{/if}
