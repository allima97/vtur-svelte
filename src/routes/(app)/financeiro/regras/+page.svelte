<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldCheckbox, FieldInput, FieldSelect, FieldTextarea, SimpleTable } from '$lib/components/ui';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import {
    CheckCircle2,
    CircleOff,
    Edit2,
    GitBranch,
    Loader2,
    Percent,
    Plus,
    Trash2
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  type RuleType = 'GERAL' | 'ESCALONAVEL';
  type FaixaType = 'PRE' | 'POS';

  interface Tier {
    id?: string;
    faixa: FaixaType;
    de_pct: number;
    ate_pct: number;
    inc_pct_meta: number;
    inc_pct_comissao: number;
    ativo?: boolean;
  }

  interface Rule {
    id: string;
    nome: string;
    descricao: string | null;
    tipo: RuleType;
    meta_nao_atingida: number | null;
    meta_atingida: number | null;
    super_meta: number | null;
    ativo: boolean;
    commission_tier?: Tier[];
  }

  interface RuleForm {
    nome: string;
    descricao: string;
    tipo: RuleType;
    meta_nao_atingida: number;
    meta_atingida: number;
    super_meta: number;
    ativo: boolean;
    tiers: Tier[];
  }

  const percentFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const faixas: FaixaType[] = ['PRE', 'POS'];

  const emptyForm = (): RuleForm => ({
    nome: '',
    descricao: '',
    tipo: 'GERAL',
    meta_nao_atingida: 0,
    meta_atingida: 0,
    super_meta: 0,
    ativo: true,
    tiers: []
  });

  let rules: Rule[] = [];
  let loading = true;
  let saving = false;
  let actionLoading = false;
  let showForm = false;
  let editId: string | null = null;
  let errorMessage = '';
  let validationError = '';
  let form: RuleForm = emptyForm();
  let confirmOpen = false;
  let confirmMode: 'inativar' | 'excluir' = 'inativar';
  let selectedRule: Rule | null = null;
  const ruleTypeOptions = [
    { value: 'GERAL', label: 'Geral (percentuais fixos)' },
    { value: 'ESCALONAVEL', label: 'Escalonável (faixas PRE/POS)' }
  ];
  const faixaOptions = [
    { value: 'PRE', label: 'PRE' },
    { value: 'POS', label: 'POS' }
  ];

  function normalizeNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function cloneTiers(tiers?: Tier[]): Tier[] {
    return (tiers || []).map((tier): Tier => ({
      id: tier.id,
      faixa: tier.faixa === 'POS' ? 'POS' : 'PRE',
      de_pct: normalizeNumber(tier.de_pct),
      ate_pct: normalizeNumber(tier.ate_pct),
      inc_pct_meta: normalizeNumber(tier.inc_pct_meta),
      inc_pct_comissao: normalizeNumber(tier.inc_pct_comissao)
    }));
  }

  function normalizeRule(raw: any): Rule {
    return {
      id: String(raw?.id || ''),
      nome: String(raw?.nome || ''),
      descricao: raw?.descricao ? String(raw.descricao) : null,
      tipo: raw?.tipo === 'ESCALONAVEL' ? 'ESCALONAVEL' : 'GERAL',
      meta_nao_atingida: normalizeNumber(raw?.meta_nao_atingida),
      meta_atingida: normalizeNumber(raw?.meta_atingida),
      super_meta: normalizeNumber(raw?.super_meta),
      ativo: Boolean(raw?.ativo),
      commission_tier: cloneTiers(raw?.commission_tier)
    };
  }

  async function requestApi<T = any>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: Record<string, unknown>
  ): Promise<T | null> {
    const response = await fetch('/api/v1/parametros/commission-rules', {
      method,
      headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body || {})
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || 'Erro ao processar regras de comissão.');
    }

    return text ? (JSON.parse(text) as T) : null;
  }

  async function loadRules() {
    loading = true;
    errorMessage = '';

    try {
      const data = await requestApi<Rule[]>('GET');
      rules = Array.isArray(data) ? data.map((rule) => normalizeRule(rule)) : [];
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar regras de comissão.';
      errorMessage = message;
      rules = [];
      toast.error(message);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadRules();
  });

  $: activeRules = rules.filter((rule) => rule.ativo).length;
  $: inactiveRules = rules.filter((rule) => !rule.ativo).length;
  $: escalonaveis = rules.filter((rule) => rule.tipo === 'ESCALONAVEL').length;
  $: totalTiers = rules.reduce((total, rule) => total + (rule.commission_tier?.length || 0), 0);

  function formatPercent(value: number | null | undefined) {
    return percentFormatter.format(normalizeNumber(value));
  }

  function resetForm() {
    form = emptyForm();
    editId = null;
    validationError = '';
    errorMessage = '';
  }

  function openCreateForm() {
    resetForm();
    showForm = true;
  }

  function cancelForm() {
    showForm = false;
    resetForm();
  }

  function editRule(rule: Rule) {
    form = {
      nome: rule.nome,
      descricao: rule.descricao || '',
      tipo: rule.tipo,
      meta_nao_atingida: normalizeNumber(rule.meta_nao_atingida),
      meta_atingida: normalizeNumber(rule.meta_atingida),
      super_meta: normalizeNumber(rule.super_meta),
      ativo: Boolean(rule.ativo),
      tiers: cloneTiers(rule.commission_tier)
    };
    editId = rule.id;
    showForm = true;
    validationError = '';
    errorMessage = '';
  }

  function addTier(faixa: FaixaType) {
    form = {
      ...form,
      tiers: [
        ...form.tiers,
        {
          faixa,
          de_pct: 0,
          ate_pct: 0,
          inc_pct_meta: 0,
          inc_pct_comissao: 0
        }
      ]
    };
  }

  function updateTier(
    index: number,
    field: 'faixa' | 'de_pct' | 'ate_pct' | 'inc_pct_meta' | 'inc_pct_comissao',
    value: string
  ) {
    form = {
      ...form,
      tiers: form.tiers.map((tier, tierIndex) => {
        if (tierIndex !== index) return tier;

        if (field === 'faixa') {
          return {
            ...tier,
            faixa: value === 'POS' ? 'POS' : 'PRE'
          };
        }

        return {
          ...tier,
          [field]: normalizeNumber(value)
        };
      })
    };
  }

  function removeTier(index: number) {
    form = {
      ...form,
      tiers: form.tiers.filter((_, tierIndex) => tierIndex !== index)
    };
  }

  function handleTierInput(
    index: number,
    field: 'de_pct' | 'ate_pct' | 'inc_pct_meta' | 'inc_pct_comissao',
    event: Event
  ) {
    const input = event.currentTarget as HTMLInputElement | null;
    updateTier(index, field, input?.value || '0');
  }

  function handleTierFaixaChange(index: number, event: Event) {
    const select = event.currentTarget as HTMLSelectElement | null;
    updateTier(index, 'faixa', select?.value || 'PRE');
  }

  function handleMetaInput(
    field: 'meta_nao_atingida' | 'meta_atingida' | 'super_meta',
    event: Event
  ) {
    const input = event.currentTarget as HTMLInputElement | null;
    form = {
      ...form,
      [field]: normalizeNumber(input?.value)
    };
  }

  function validateForm() {
    if (!form.nome.trim()) {
      return 'Informe o nome da regra.';
    }

    if (form.tipo !== 'ESCALONAVEL') {
      return null;
    }

    if (form.tiers.length === 0) {
      return 'Adicione pelo menos uma faixa PRE ou POS.';
    }

    for (const tier of form.tiers) {
      if (tier.de_pct > tier.ate_pct) {
        return 'Em uma faixa, o valor inicial não pode ser maior que o final.';
      }
    }

    for (const faixa of faixas) {
      const list = form.tiers
        .filter((tier) => tier.faixa === faixa)
        .sort((left, right) => left.de_pct - right.de_pct);

      for (let index = 1; index < list.length; index += 1) {
        const previous = list[index - 1];
        const current = list[index];

        if (previous.ate_pct > current.de_pct) {
          return `Faixas ${faixa} sobrepostas: finalize a faixa anterior em ${formatPercent(previous.ate_pct)}% antes de iniciar ${formatPercent(current.de_pct)}%.`;
        }
      }
    }

    return null;
  }

  async function saveRule() {
    if (saving) return;

    validationError = '';
    const validation = validateForm();

    if (validation) {
      validationError = validation;
      toast.error(validation);
      return;
    }

    saving = true;
    errorMessage = '';

    try {
      await requestApi('POST', {
        id: editId || undefined,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        tipo: form.tipo,
        meta_nao_atingida: form.meta_nao_atingida,
        meta_atingida: form.meta_atingida,
        super_meta: form.super_meta,
        ativo: form.ativo,
        tiers: form.tipo === 'ESCALONAVEL' ? form.tiers : []
      });

      toast.success(editId ? 'Regra atualizada com sucesso.' : 'Regra criada com sucesso.');
      await loadRules();
      cancelForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar regra.';
      errorMessage = message;
      toast.error(message);
    } finally {
      saving = false;
    }
  }

  function askInactivate(rule: Rule) {
    selectedRule = rule;
    confirmMode = 'inativar';
    confirmOpen = true;
  }

  function askDelete(rule: Rule) {
    selectedRule = rule;
    confirmMode = 'excluir';
    confirmOpen = true;
  }

  function closeConfirm() {
    confirmOpen = false;
    selectedRule = null;
    actionLoading = false;
  }

  async function confirmRuleAction() {
    if (!selectedRule || actionLoading) return;

    actionLoading = true;

    try {
      if (confirmMode === 'inativar') {
        await requestApi('PATCH', { id: selectedRule.id, ativo: false });
        toast.success('Regra inativada com sucesso.');
      } else {
        await requestApi('DELETE', { id: selectedRule.id });
        toast.success('Regra excluída com sucesso.');
      }

      await loadRules();
      closeConfirm();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : confirmMode === 'inativar'
            ? 'Erro ao inativar regra.'
            : 'Erro ao excluir regra.';
      errorMessage = message;
      toast.error(message);
      actionLoading = false;
    }
  }

  function getSortedTiers(rule: Rule, faixa: FaixaType) {
    return cloneTiers(rule.commission_tier)
      .filter((tier) => tier.faixa === faixa)
      .sort((left, right) => left.de_pct - right.de_pct);
  }
</script>

<svelte:head>
  <title>Regras de Comissão | VTUR</title>
</svelte:head>

<PageHeader
  title="Regras de Comissão"
  subtitle="Defina percentuais fixos ou faixas escalonáveis compartilhadas pela operação."
  color="financeiro"
  breadcrumbs={[
    { label: 'Financeiro', href: '/financeiro' },
    { label: 'Regras' }
  ]}
  actions={
    showForm
      ? []
      : [
          {
            label: 'Nova Regra',
            onClick: openCreateForm,
            variant: 'primary',
            icon: Plus
          }
        ]
  }
/>

<div class="vtur-kpi-grid mb-6">
  <div class="vtur-kpi-card border-t-[3px] border-t-green-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">
      <CheckCircle2 size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Regras Ativas</p>
      <p class="text-2xl font-bold text-slate-900">{activeRules}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
      <CircleOff size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Regras Inativas</p>
      <p class="text-2xl font-bold text-slate-900">{inactiveRules}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-teal-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">
      <GitBranch size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Escalonáveis</p>
      <p class="text-2xl font-bold text-slate-900">{escalonaveis}</p>
    </div>
  </div>

  <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
      <Percent size={20} />
    </div>
    <div>
      <p class="text-sm font-medium text-slate-500">Faixas Cadastradas</p>
      <p class="text-2xl font-bold text-slate-900">{totalTiers}</p>
    </div>
  </div>
</div>

{#if errorMessage}
  <div class="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {errorMessage}
  </div>
{/if}

{#if showForm}
  <Card title={editId ? 'Editar regra de comissão' : 'Nova regra de comissão'} color="financeiro" class="mb-6">
    <form
      class="space-y-5"
      on:submit|preventDefault={saveRule}
    >
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <FieldInput
          id="regra-nome"
          label="Nome"
          bind:value={form.nome}
          required={true}
          class_name="xl:col-span-2"
          placeholder="Ex: Comissão padrão comercial"
        />

        <FieldSelect
          id="regra-tipo"
          label="Tipo"
          bind:value={form.tipo}
          options={ruleTypeOptions}
          class_name="w-full"
        />

        <div class="flex items-end">
          <FieldCheckbox
            label="Regra ativa"
            bind:checked={form.ativo}
            color="financeiro"
            class_name="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
          />
        </div>

        <FieldInput
          id="meta-nao-atingida"
          label="Meta não atingida (%)"
          type="number"
          value={String(form.meta_nao_atingida)}
          step="0.01"
          class_name="w-full"
          on:input={(event) => handleMetaInput('meta_nao_atingida', event)}
        />

        <FieldInput
          id="meta-atingida"
          label="Meta atingida (%)"
          type="number"
          value={String(form.meta_atingida)}
          step="0.01"
          class_name="w-full"
          on:input={(event) => handleMetaInput('meta_atingida', event)}
        />

        <FieldInput
          id="super-meta"
          label="Super meta (%)"
          type="number"
          value={String(form.super_meta)}
          step="0.01"
          class_name="w-full"
          on:input={(event) => handleMetaInput('super_meta', event)}
        />

        <FieldTextarea
          id="regra-descricao"
          label="Descrição"
          rows={3}
          bind:value={form.descricao}
          class_name="xl:col-span-4"
          placeholder="Contexto de uso, equipe atendida e observações da regra."
        />
      </div>

      {#if validationError}
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError}
        </div>
      {/if}

      {#if form.tipo === 'ESCALONAVEL'}
        <div class="rounded-[18px] border border-financeiro-200 bg-financeiro-50/40 p-4">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-base font-semibold text-slate-900">Faixas escalonáveis</h3>
              <p class="text-sm text-slate-500">
                Monte faixas PRE e POS sem sobreposição de intervalos.
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" on:click={() => addTier('PRE')}>
                + Faixa PRE
              </Button>
              <Button type="button" size="sm" variant="primary" on:click={() => addTier('POS')}>
                + Faixa POS
              </Button>
            </div>
          </div>

          {#if form.tiers.length === 0}
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Nenhuma faixa adicionada ainda.
            </div>
          {:else}
            <SimpleTable tableClass="min-w-full divide-y divide-slate-200" color="financeiro">
                <thead class="bg-white/70">
                  <tr class="text-left text-slate-600">
                    <th class="px-3 py-2 font-medium">Faixa</th>
                    <th class="px-3 py-2 font-medium">De (%)</th>
                    <th class="px-3 py-2 font-medium">Até (%)</th>
                    <th class="px-3 py-2 font-medium">Inc. Meta (%)</th>
                    <th class="px-3 py-2 font-medium">Inc. Comissão (%)</th>
                    <th class="px-3 py-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 bg-white">
                  {#each form.tiers as tier, index}
                    <tr>
                      <td class="px-3 py-2">
                        <FieldSelect
                          class_name="min-w-[110px]"
                          value={tier.faixa}
                          options={faixaOptions}
                          on:change={(event) => handleTierFaixaChange(index, event)}
                        />
                      </td>
                      <td class="px-3 py-2">
                        <FieldInput
                          type="number"
                          step="0.01"
                          value={String(tier.de_pct)}
                          on:input={(event) => handleTierInput(index, 'de_pct', event)}
                          class_name="min-w-[120px]"
                        />
                      </td>
                      <td class="px-3 py-2">
                        <FieldInput
                          type="number"
                          step="0.01"
                          value={String(tier.ate_pct)}
                          on:input={(event) => handleTierInput(index, 'ate_pct', event)}
                          class_name="min-w-[120px]"
                        />
                      </td>
                      <td class="px-3 py-2">
                        <FieldInput
                          type="number"
                          step="0.01"
                          value={String(tier.inc_pct_meta)}
                          on:input={(event) => handleTierInput(index, 'inc_pct_meta', event)}
                          class_name="min-w-[140px]"
                        />
                      </td>
                      <td class="px-3 py-2">
                        <FieldInput
                          type="number"
                          step="0.01"
                          value={String(tier.inc_pct_comissao)}
                          on:input={(event) => handleTierInput(index, 'inc_pct_comissao', event)}
                          class_name="min-w-[160px]"
                        />
                      </td>
                      <td class="px-3 py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          on:click={() => removeTier(index)}
                        >
                          Remover
                        </Button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
            </SimpleTable>
          {/if}
        </div>
      {/if}

      <div class="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" on:click={cancelForm} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {editId ? 'Salvar alterações' : 'Salvar regra'}
        </Button>
      </div>
    </form>
  </Card>
{/if}

<Card
  title="Regras cadastradas"
  color="financeiro"
>
  {#if loading}
    <div class="flex items-center justify-center gap-3 py-10 text-slate-500">
      <Loader2 size={20} class="animate-spin" />
      Carregando regras...
    </div>
  {:else if rules.length === 0}
    <div class="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500">
      <Percent size={42} class="mx-auto mb-3 opacity-40" />
      <p class="font-medium text-slate-700">Nenhuma regra cadastrada</p>
      <p class="mt-1 text-sm">Crie a primeira regra para estruturar percentuais e faixas da operação.</p>
      {#if !showForm}
        <div class="mt-4">
          <Button type="button" variant="primary" on:click={openCreateForm}>
            Criar primeira regra
          </Button>
        </div>
      {/if}
    </div>
  {:else}
    <div class="space-y-4">
      {#each rules as rule}
        <div class="rounded-[18px] border border-slate-200 bg-slate-50/60 p-4">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div class="min-w-0 flex-1 space-y-4">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-semibold text-slate-900">{rule.nome}</h3>
                <span class="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                  {rule.tipo === 'ESCALONAVEL' ? 'Escalonável' : 'Geral'}
                </span>
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium {rule.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}"
                >
                  {rule.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              {#if rule.descricao}
                <p class="text-sm text-slate-600">{rule.descricao}</p>
              {/if}

              <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Meta não atingida</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">
                    {formatPercent(rule.meta_nao_atingida)}%
                  </p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Meta atingida</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">
                    {formatPercent(rule.meta_atingida)}%
                  </p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Super meta</p>
                  <p class="mt-1 text-lg font-semibold text-slate-900">
                    {formatPercent(rule.super_meta)}%
                  </p>
                </div>
              </div>

              {#if rule.tipo === 'ESCALONAVEL'}
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {#each faixas as faixa}
                    <div class="rounded-xl border border-slate-200 bg-white p-3">
                      <div class="mb-2 flex items-center justify-between">
                        <p class="text-sm font-semibold text-slate-900">Faixas {faixa}</p>
                        <span class="text-xs text-slate-500">
                          {getSortedTiers(rule, faixa).length} faixa(s)
                        </span>
                      </div>

                      {#if getSortedTiers(rule, faixa).length === 0}
                        <p class="text-sm text-slate-500">Nenhuma faixa {faixa} cadastrada.</p>
                      {:else}
                        <div class="space-y-2">
                          {#each getSortedTiers(rule, faixa) as tier}
                            <div class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              <div class="flex flex-wrap items-center justify-between gap-2">
                                <span class="font-medium">
                                  {formatPercent(tier.de_pct)}% até {formatPercent(tier.ate_pct)}%
                                </span>
                                <span class="text-slate-500">
                                  Meta +{formatPercent(tier.inc_pct_meta)}% | Comissão +{formatPercent(tier.inc_pct_comissao)}%
                                </span>
                              </div>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <div class="flex flex-wrap gap-2 xl:justify-end">
              <Button type="button" size="sm" variant="secondary" on:click={() => editRule(rule)}>
                <Edit2 size={16} class="mr-1" />
                Editar
              </Button>

              {#if rule.ativo}
                <Button type="button" size="sm" variant="outline" on:click={() => askInactivate(rule)}>
                  <CircleOff size={16} class="mr-1" />
                  Inativar
                </Button>
              {/if}

              <Button type="button" size="sm" variant="danger" on:click={() => askDelete(rule)}>
                <Trash2 size={16} class="mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</Card>

<Dialog
  bind:open={confirmOpen}
  title={confirmMode === 'inativar' ? 'Inativar regra' : 'Excluir regra'}
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText={confirmMode === 'inativar' ? 'Inativar' : 'Excluir'}
  confirmVariant="danger"
  loading={actionLoading}
  onCancel={closeConfirm}
  onConfirm={confirmRuleAction}
>
  {#if selectedRule}
    <div class="space-y-3 text-sm text-slate-600">
      <p>
        {#if confirmMode === 'inativar'}
          A regra <strong class="text-slate-900">{selectedRule.nome}</strong> será marcada como inativa e deixará de ser considerada na operação.
        {:else}
          A regra <strong class="text-slate-900">{selectedRule.nome}</strong> e suas faixas vinculadas serão removidas permanentemente.
        {/if}
      </p>
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <p><strong>Tipo:</strong> {selectedRule.tipo === 'ESCALONAVEL' ? 'Escalonável' : 'Geral'}</p>
        <p><strong>Faixas:</strong> {selectedRule.commission_tier?.length || 0}</p>
      </div>
    </div>
  {/if}
</Dialog>
