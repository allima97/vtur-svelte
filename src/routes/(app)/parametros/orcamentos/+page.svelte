<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldTextarea } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { createSupabaseBrowserClient } from '$lib/db/supabase';
  import { Save, RefreshCw, FileText, Upload, ImageIcon, X } from 'lucide-svelte';

  const LOGO_BUCKET = 'quotes';

  let loading = true;
  let saving = false;

  let settings = {
    id: null as string | null,
    consultor_nome: '',
    filial_nome: '',
    endereco_linha1: '',
    endereco_linha2: '',
    endereco_linha3: '',
    telefone: '',
    whatsapp: '',
    whatsapp_codigo_pais: '55',
    email: '',
    rodape_texto: '',
    logo_url: null as string | null,
    logo_path: null as string | null,
    imagem_complementar_url: null as string | null,
    imagem_complementar_path: null as string | null
  };

  // Arquivos selecionados para upload
  let logoFile: File | null = null;
  let complementoFile: File | null = null;

  // URLs de preview (signed URL ou blob URL)
  let logoPreview: string | null = null;
  let complementoPreview: string | null = null;

  // Referências dos inputs de arquivo
  let logoInput: HTMLInputElement;
  let complementoInput: HTMLInputElement;

  function getFileExtension(file: File): string {
    const match = file.name.match(/\.([a-z0-9]+)$/i);
    if (match?.[1]) return match[1].toLowerCase();
    if (file.type.startsWith('image/')) return file.type.split('/')[1] || 'png';
    return 'png';
  }

  function extractStoragePath(value?: string | null): string | null {
    if (!value) return null;
    const marker = '/quotes/';
    const index = value.indexOf(marker);
    if (index === -1) return null;
    return value.slice(index + marker.length);
  }

  function onLogoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] || null;
    logoFile = file;
    if (file) {
      if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
      logoPreview = URL.createObjectURL(file);
    }
  }

  function onComplementoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] || null;
    complementoFile = file;
    if (file) {
      if (complementoPreview && complementoPreview.startsWith('blob:')) URL.revokeObjectURL(complementoPreview);
      complementoPreview = URL.createObjectURL(file);
    }
  }

  function removeLogo() {
    logoFile = null;
    if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    logoPreview = null;
    settings.logo_url = null;
    settings.logo_path = null;
    if (logoInput) logoInput.value = '';
  }

  function removeComplemento() {
    complementoFile = null;
    if (complementoPreview && complementoPreview.startsWith('blob:')) URL.revokeObjectURL(complementoPreview);
    complementoPreview = null;
    settings.imagem_complementar_url = null;
    settings.imagem_complementar_path = null;
    if (complementoInput) complementoInput.value = '';
  }

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/parametros/orcamentos-pdf');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      if (payload.settings) {
        const s = payload.settings;
        settings = {
          id: s.id || null,
          consultor_nome: s.consultor_nome || '',
          filial_nome: s.filial_nome || '',
          endereco_linha1: s.endereco_linha1 || '',
          endereco_linha2: s.endereco_linha2 || '',
          endereco_linha3: s.endereco_linha3 || '',
          telefone: s.telefone || '',
          whatsapp: s.whatsapp || '',
          whatsapp_codigo_pais: s.whatsapp_codigo_pais || '55',
          email: s.email || '',
          rodape_texto: s.rodape_texto || '',
          logo_url: s.logo_url || null,
          logo_path: s.logo_path || null,
          imagem_complementar_url: s.imagem_complementar_url || null,
          imagem_complementar_path: s.imagem_complementar_path || null
        };

        // Gera URLs assinadas para preview (imagens privadas no storage)
        const supabase = createSupabaseBrowserClient();

        if (s.logo_path) {
          const { data } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(s.logo_path, 3600);
          logoPreview = data?.signedUrl || s.logo_url || null;
        } else if (s.logo_url) {
          logoPreview = s.logo_url;
        }

        if (s.imagem_complementar_path) {
          const { data } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(s.imagem_complementar_path, 3600);
          complementoPreview = data?.signedUrl || s.imagem_complementar_url || null;
        } else if (s.imagem_complementar_url) {
          complementoPreview = s.imagem_complementar_url;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar parâmetros.');
    } finally {
      loading = false;
    }
  }

  async function uploadImagem(
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
    userId: string,
    file: File | null,
    existingUrl: string | null,
    existingPath: string | null,
    storageName: 'logo' | 'imagem-complementar'
  ): Promise<{ url: string | null; path: string | null }> {
    if (!file) {
      return {
        url: existingUrl,
        path: existingPath || extractStoragePath(existingUrl)
      };
    }

    const ext = getFileExtension(file);
    const path = `branding/${userId}/${storageName}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/png',
        cacheControl: '3600'
      });

    if (uploadErr) throw uploadErr;

    const publicUrl = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
    return { url: publicUrl || null, path };
  }

  async function save() {
    saving = true;
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado.');

      // Faz upload das imagens se houver arquivo novo
      const logoInfo = await uploadImagem(supabase, userId, logoFile, settings.logo_url, settings.logo_path, 'logo');
      const complementoInfo = await uploadImagem(supabase, userId, complementoFile, settings.imagem_complementar_url, settings.imagem_complementar_path, 'imagem-complementar');

      const response = await fetch('/api/v1/parametros/orcamentos-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...settings,
            logo_url: logoInfo.url,
            logo_path: logoInfo.path,
            imagem_complementar_url: complementoInfo.url,
            imagem_complementar_path: complementoInfo.path
          }
        })
      });
      if (!response.ok) throw new Error(await response.text());

      // Atualiza preview com URL assinada após salvar
      if (logoInfo.path) {
        const { data } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(logoInfo.path, 3600);
        logoPreview = data?.signedUrl || logoInfo.url || null;
      }
      if (complementoInfo.path) {
        const { data } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(complementoInfo.path, 3600);
        complementoPreview = data?.signedUrl || complementoInfo.url || null;
      }

      // Atualiza settings com os paths salvos
      settings.logo_url = logoInfo.url;
      settings.logo_path = logoInfo.path;
      settings.imagem_complementar_url = complementoInfo.url;
      settings.imagem_complementar_path = complementoInfo.path;

      // Limpa arquivos selecionados
      logoFile = null;
      complementoFile = null;
      if (logoInput) logoInput.value = '';
      if (complementoInput) complementoInput.value = '';

      toast.success('Parâmetros de orçamento salvos.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      saving = false;
    }
  }

  onMount(load);
</script>

<svelte:head>
  <title>Parâmetros de Orçamentos | VTUR</title>
</svelte:head>

<PageHeader
  title="Parâmetros de Orçamentos"
  subtitle="Configure os dados do consultor, endereço e rodapé que aparecem nos PDFs de orçamento."
  color="financeiro"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Orçamentos' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw }
  ]}
/>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>
{:else}
  <form on:submit|preventDefault={save} class="space-y-6">

    <!-- Logo e Imagem Complementar -->
    <Card title="Imagens do PDF" color="financeiro">
      <div class="grid grid-cols-1 gap-8 md:grid-cols-2">

        <!-- Logo -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <ImageIcon size={16} class="text-slate-400" />
            <p class="text-sm font-medium text-slate-700">Logo da Empresa</p>
          </div>
          <p class="text-xs text-slate-500">Aparece no cabeçalho do PDF. Formatos aceitos: PNG, JPG, WEBP.</p>

          {#if logoPreview}
            <div class="relative inline-block">
              <img
                src={logoPreview}
                alt="Logo do orçamento"
                class="max-h-20 max-w-full rounded border border-slate-200 bg-white object-contain p-1"
              />
              <button
                type="button"
                on:click={removeLogo}
                class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                title="Remover logo"
              >
                <X size={12} />
              </button>
            </div>
          {:else}
            <div class="flex h-20 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
              <div class="flex flex-col items-center gap-1 text-xs">
                <ImageIcon size={20} />
                <span>Nenhum logo definido</span>
              </div>
            </div>
          {/if}

          <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 w-fit">
            <Upload size={14} />
            {logoFile ? logoFile.name : 'Escolher imagem'}
            <input
              bind:this={logoInput}
              type="file"
              accept="image/*"
              class="hidden"
              on:change={onLogoChange}
            />
          </label>
        </div>

        <!-- Imagem Complementar -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <ImageIcon size={16} class="text-slate-400" />
            <p class="text-sm font-medium text-slate-700">Imagem Complementar</p>
          </div>
          <p class="text-xs text-slate-500">Exibida após as informações importantes no rodapé do PDF.</p>

          {#if complementoPreview}
            <div class="relative inline-block">
              <img
                src={complementoPreview}
                alt="Imagem complementar do orçamento"
                class="max-h-28 max-w-full rounded border border-slate-200 bg-white object-contain p-1"
              />
              <button
                type="button"
                on:click={removeComplemento}
                class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                title="Remover imagem"
              >
                <X size={12} />
              </button>
            </div>
          {:else}
            <div class="flex h-28 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
              <div class="flex flex-col items-center gap-1 text-xs">
                <ImageIcon size={20} />
                <span>Nenhuma imagem definida</span>
              </div>
            </div>
          {/if}

          <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 w-fit">
            <Upload size={14} />
            {complementoFile ? complementoFile.name : 'Escolher imagem'}
            <input
              bind:this={complementoInput}
              type="file"
              accept="image/*"
              class="hidden"
              on:change={onComplementoChange}
            />
          </label>
        </div>

      </div>
    </Card>

    <!-- Dados do Consultor -->
    <Card title="Dados do Consultor" color="financeiro">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldInput id="orc-consultor" label="Nome do Consultor" bind:value={settings.consultor_nome} placeholder="Seu nome completo" class_name="w-full" />
        <FieldInput id="orc-filial" label="Filial / Agência" bind:value={settings.filial_nome} placeholder="Nome da filial ou agência" class_name="w-full" />
        <FieldInput id="orc-email" label="E-mail" type="email" bind:value={settings.email} placeholder="consultor@agencia.com.br" class_name="w-full" />
        <FieldInput id="orc-telefone" label="Telefone" bind:value={settings.telefone} placeholder="(00) 0000-0000" mask="phone" class_name="w-full" />
        <div class="space-y-2">
          <p class="text-sm font-medium text-slate-700">WhatsApp</p>
          <div class="grid grid-cols-[88px,1fr] gap-2">
            <FieldInput
              id="orc-whatsapp-codigo"
              label="DDI"
              bind:value={settings.whatsapp_codigo_pais}
              placeholder="55"
              maxlength={4}
              class_name="w-full"
            />
            <FieldInput
              id="orc-whatsapp"
              label="Número"
              bind:value={settings.whatsapp}
              placeholder="(00) 00000-0000"
              helper="Código do país + número (ex: 55 + 11 99999-9999)"
              class_name="w-full"
            />
          </div>
        </div>
      </div>
    </Card>

    <!-- Endereço -->
    <Card title="Endereço" color="financeiro">
      <div class="space-y-3">
        <FieldInput id="orc-end1" label="Linha 1" bind:value={settings.endereco_linha1} placeholder="Rua, número, complemento" class_name="w-full" />
        <FieldInput id="orc-end2" label="Linha 2" bind:value={settings.endereco_linha2} placeholder="Bairro, cidade - UF" class_name="w-full" />
        <FieldInput id="orc-end3" label="Linha 3" bind:value={settings.endereco_linha3} placeholder="CEP, informações adicionais" class_name="w-full" />
      </div>
    </Card>

    <!-- Rodapé -->
    <Card title="Rodapé do PDF" color="financeiro">
      <div class="flex items-start gap-2 mb-2">
        <FileText size={16} class="mt-0.5 text-slate-400" />
        <p class="text-sm text-slate-500">Texto exibido no rodapé dos PDFs de orçamento. Inclui condições gerais, política de cancelamento, etc.</p>
      </div>
      <FieldTextarea
        bind:value={settings.rodape_texto}
        rows={8}
        placeholder="Texto do rodapé..."
        class_name="w-full font-mono text-xs"
      />
    </Card>

    <div class="flex justify-end gap-3">
      <Button type="submit" variant="primary" color="financeiro" loading={saving}>
        <Save size={16} class="mr-2" />
        Salvar Parâmetros
      </Button>
    </div>
  </form>
{/if}
