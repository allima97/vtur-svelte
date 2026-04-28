<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Button,
    Card,
    DataTable,
    Dialog,
    FieldCheckbox,
    FieldInput,
    FieldSelect,
    FileInput,
    PageHeader
  } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { ImagePlus, Pencil, RefreshCw, Save, Shield, Trash2, X } from 'lucide-svelte';
  import type { VoucherAssetRecord, VoucherAssetKind, VoucherAssetProvider } from '$lib/vouchers/types';

  type AssetForm = {
    id: string | null;
    provider: VoucherAssetProvider;
    asset_kind: VoucherAssetKind;
    label: string;
    ordem: number;
    ativo: boolean;
  };

  const providerOptions = [
    { value: 'cvc', label: 'CVC' },
    { value: 'special_tours', label: 'Special Tours' },
    { value: 'europamundo', label: 'Europamundo' },
    { value: 'sato_tours', label: 'Sato Tours' },
    { value: 'generic', label: 'Genérico' }
  ];

  const assetKindOptions = [
    { value: 'logo', label: 'Logo' },
    { value: 'image', label: 'Imagem' },
    { value: 'app_icon', label: 'Ícone de app' }
  ];

  function createDefaultForm(): AssetForm {
    return {
      id: null,
      provider: 'generic',
      asset_kind: 'image',
      label: '',
      ordem: 0,
      ativo: true
    };
  }

  let assets: VoucherAssetRecord[] = [];
  let loading = true;
  let saving = false;
  let companyId: string | null = null;
  let fileList: FileList | undefined = undefined;
  let form = createDefaultForm();
  let deleteTarget: VoucherAssetRecord | null = null;

  $: showDeleteDialog = !!deleteTarget;
  $: canEdit =
    !$permissoes.ready ||
    $permissoes.isSystemAdmin ||
    permissoes.can('parametros', 'edit') ||
    permissoes.can('parametros', 'admin') ||
    permissoes.can('operacao', 'edit');
  $: canDelete =
    !$permissoes.ready ||
    $permissoes.isSystemAdmin ||
    permissoes.can('parametros', 'delete') ||
    permissoes.can('parametros', 'admin') ||
    permissoes.can('operacao', 'delete');
  $: accessDenied = $permissoes.ready && !canEdit && !canDelete;
  $: selectedAsset = form.id ? assets.find((asset) => asset.id === form.id) || null : null;

  const columns = [
    {
      key: 'preview_url',
      label: 'Preview',
      width: '110px',
      sortable: false,
      formatter: (value: string | null, row: VoucherAssetRecord) =>
        value
          ? `<div class="flex items-center justify-center"><img src="${value}" alt="${row.label || row.provider}" class="h-14 w-14 rounded-xl border border-slate-200 object-contain bg-white p-1" /></div>`
          : '<div class="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">Sem preview</div>'
    },
    {
      key: 'provider',
      label: 'Fornecedor',
      sortable: true,
      formatter: (value: VoucherAssetProvider) => providerOptions.find((item) => item.value === value)?.label || value
    },
    {
      key: 'asset_kind',
      label: 'Tipo',
      sortable: true,
      formatter: (value: VoucherAssetKind) => assetKindOptions.find((item) => item.value === value)?.label || value
    },
    {
      key: 'label',
      label: 'Descrição',
      sortable: true,
      formatter: (value: string | null) => value || '-'
    },
    {
      key: 'ordem',
      label: 'Ordem',
      sortable: true,
      width: '90px'
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '100px',
      formatter: (value: boolean | null) =>
        value
          ? '<span class="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Ativo</span>'
          : '<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Inativo</span>'
    }
  ];

  onMount(async () => {
    await loadUserContext();
    await loadAssets();
  });

  async function loadUserContext() {
    try {
      const response = await fetch('/api/v1/user/context');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      companyId = payload.company_id || null;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar contexto da empresa.');
    }
  }

  async function loadAssets() {
    if (!companyId) {
      loading = false;
      return;
    }

    loading = true;
    try {
      const response = await fetch(`/api/v1/voucher-assets?company_id=${companyId}`);
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      assets = payload.items || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar assets de voucher.');
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    form = createDefaultForm();
    fileList = undefined;
  }

  function editAsset(asset: VoucherAssetRecord) {
    form = {
      id: asset.id,
      provider: asset.provider,
      asset_kind: asset.asset_kind,
      label: asset.label || '',
      ordem: Number(asset.ordem || 0),
      ativo: Boolean(asset.ativo)
    };
    fileList = undefined;
  }

  async function saveAsset() {
    if (!companyId) {
      toast.error('Nenhuma empresa ativa encontrada para salvar o asset.');
      return;
    }

    if (!form.id && (!fileList || fileList.length === 0)) {
      toast.error('Selecione um arquivo para criar o asset.');
      return;
    }

    saving = true;
    try {
      const body = new FormData();
      body.set('company_id', companyId);
      body.set('provider', form.provider);
      body.set('asset_kind', form.asset_kind);
      body.set('label', form.label);
      body.set('ordem', String(form.ordem));
      body.set('ativo', String(form.ativo));
      if (form.id) body.set('id', form.id);
      if (fileList && fileList.length > 0) {
        body.set('file', fileList[0]);
      }

      const response = await fetch('/api/v1/voucher-assets', {
        method: form.id ? 'PATCH' : 'POST',
        body
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Erro ao salvar asset.');
      }

      toast.success(form.id ? 'Asset atualizado com sucesso.' : 'Asset criado com sucesso.');
      resetForm();
      await loadAssets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar asset.');
    } finally {
      saving = false;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !companyId) return;

    try {
      const response = await fetch(`/api/v1/voucher-assets?id=${deleteTarget.id}&company_id=${companyId}`, {
        method: 'DELETE'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Erro ao excluir asset.');
      }

      toast.success('Asset excluído com sucesso.');
      if (form.id === deleteTarget.id) {
        resetForm();
      }
      deleteTarget = null;
      await loadAssets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir asset.');
    }
  }
</script>

<svelte:head>
  <title>Vouchers: Logos, Ícones e Imagens | VTUR</title>
</svelte:head>

<PageHeader
  title="Vouchers: Logos, Ícones e Imagens"
  subtitle="Gerencie os assets usados no preview e na impressão dos vouchers por fornecedor e tipo."
  color="operacao"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Vouchers' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: loadAssets, variant: 'secondary', icon: RefreshCw }
  ]}
/>

{#if accessDenied}
  <Card color="operacao">
    <div class="flex items-start gap-3">
      <Shield size={22} class="mt-0.5 text-amber-600" />
      <div class="space-y-1">
        <p class="font-semibold text-slate-900">Acesso restrito</p>
        <p class="text-sm text-slate-600">
          Seu perfil não possui acesso para gerenciar os assets visuais dos vouchers.
        </p>
      </div>
    </div>
  </Card>
{:else if !companyId}
  <Card color="operacao">
    <p class="text-sm text-slate-600">
      Não foi possível resolver a empresa ativa do seu contexto. Abra esta tela com uma empresa vinculada ao usuário.
    </p>
  </Card>
{:else}
  <div class="grid gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
    <Card color="operacao" title={form.id ? 'Editar asset' : 'Novo asset'}>
      <div class="space-y-4">
        <FieldSelect
          id="voucher-provider"
          label="Fornecedor"
          value={form.provider}
          options={providerOptions}
          disabled={!canEdit || saving}
          on:change={(event) => (form.provider = ((event.currentTarget as HTMLSelectElement).value as VoucherAssetProvider) || 'generic')}
        />

        <FieldSelect
          id="voucher-asset-kind"
          label="Tipo de asset"
          value={form.asset_kind}
          options={assetKindOptions}
          disabled={!canEdit || saving}
          on:change={(event) => (form.asset_kind = ((event.currentTarget as HTMLSelectElement).value as VoucherAssetKind) || 'image')}
        />

        <FieldInput
          id="voucher-asset-label"
          label="Descrição"
          value={form.label}
          placeholder="Ex: Logo horizontal, imagem de capa"
          disabled={!canEdit || saving}
          on:input={(event) => (form.label = (event.currentTarget as HTMLInputElement).value)}
        />

        <FieldInput
          id="voucher-asset-order"
          label="Ordem"
          type="number"
          value={form.ordem}
          disabled={!canEdit || saving}
          helper="Usado para ordenar imagens e ícones no preview dos vouchers."
          on:input={(event) => {
            const parsed = Number.parseInt((event.currentTarget as HTMLInputElement).value, 10);
            form.ordem = Number.isFinite(parsed) ? parsed : 0;
          }}
        />

        <FieldCheckbox
          label="Asset ativo"
          bind:checked={form.ativo}
          disabled={!canEdit || saving}
          color="operacao"
          class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
        />

        <FileInput
          label={form.id ? 'Substituir arquivo' : 'Arquivo'}
          bind:files={fileList}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={!canEdit || saving}
          helper={form.id ? 'Opcional. Se enviar um novo arquivo, o asset atual será substituído.' : 'Envie JPG, PNG, WebP ou SVG com até 8MB.'}
          class_name="w-full"
        />

        {#if selectedAsset?.preview_url}
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview atual</p>
            <div class="flex items-center justify-center rounded-xl bg-white p-4">
              <img
                src={selectedAsset.preview_url}
                alt={selectedAsset.label || selectedAsset.provider}
                class="max-h-40 w-auto object-contain"
              />
            </div>
          </div>
        {/if}

        <div class="flex flex-wrap gap-3 pt-2">
          <Button variant="primary" color="operacao" disabled={!canEdit || saving} on:click={saveAsset}>
            <Save size={18} class="mr-2" />
            {form.id ? 'Salvar alterações' : 'Enviar asset'}
          </Button>

          {#if form.id}
            <Button variant="ghost" color="operacao" disabled={saving} on:click={resetForm}>
              <X size={18} class="mr-2" />
              Cancelar edição
            </Button>
          {/if}
        </div>
      </div>
    </Card>

    <DataTable
      {columns}
      data={assets}
      color="operacao"
      {loading}
      title="Assets cadastrados"
      searchable={true}
      extraSearchKeys={['provider', 'asset_kind', 'label']}
      emptyMessage="Nenhum asset cadastrado para vouchers"
    >
      <svelte:fragment slot="row-actions" let:row>
        <div class="flex items-center gap-1">
          {#if canEdit}
            <Button
              variant="ghost"
              size="xs"
              color="operacao"
              title="Editar"
              on:click={() => editAsset(row)}
            >
              <Pencil size={15} />
            </Button>
          {/if}
          {#if canDelete}
            <Button
              variant="ghost"
              size="xs"
              color="red"
              title="Excluir"
              on:click={() => (deleteTarget = row)}
            >
              <Trash2 size={15} />
            </Button>
          {/if}
        </div>
      </svelte:fragment>
    </DataTable>
  </div>
{/if}

<Dialog
  bind:open={showDeleteDialog}
  title="Excluir asset"
  color="operacao"
  confirmText="Excluir"
  cancelText="Cancelar"
  confirmVariant="danger"
  onConfirm={confirmDelete}
  onCancel={() => (deleteTarget = null)}
>
  <p class="text-sm text-slate-600">
    Tem certeza que deseja excluir este asset? A imagem será removida da tabela e do bucket de storage.
  </p>
</Dialog>
