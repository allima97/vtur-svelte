<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldTextarea } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { Save, RefreshCw, FileText } from 'lucide-svelte';

  let loading = true;
  let saving = false;

  let settings = {
    consultor_nome: '',
    filial_nome: '',
    endereco_linha1: '',
    endereco_linha2: '',
    endereco_linha3: '',
    telefone: '',
    whatsapp: '',
    whatsapp_codigo_pais: '55',
    email: '',
    rodape_texto: ''
  };

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/parametros/orcamentos-pdf');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      if (payload.settings) {
        settings = {
          consultor_nome: payload.settings.consultor_nome || '',
          filial_nome: payload.settings.filial_nome || '',
          endereco_linha1: payload.settings.endereco_linha1 || '',
          endereco_linha2: payload.settings.endereco_linha2 || '',
          endereco_linha3: payload.settings.endereco_linha3 || '',
          telefone: payload.settings.telefone || '',
          whatsapp: payload.settings.whatsapp || '',
          whatsapp_codigo_pais: payload.settings.whatsapp_codigo_pais || '55',
          email: payload.settings.email || '',
          rodape_texto: payload.settings.rodape_texto || ''
        };
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar parâmetros.');
    } finally {
      loading = false;
    }
  }

  async function save() {
    saving = true;
    try {
      const response = await fetch('/api/v1/parametros/orcamentos-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (!response.ok) throw new Error(await response.text());
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

    <Card title="Endereço" color="financeiro">
      <div class="space-y-3">
        <FieldInput id="orc-end1" label="Linha 1" bind:value={settings.endereco_linha1} placeholder="Rua, número, complemento" class_name="w-full" />
        <FieldInput id="orc-end2" label="Linha 2" bind:value={settings.endereco_linha2} placeholder="Bairro, cidade - UF" class_name="w-full" />
        <FieldInput id="orc-end3" label="Linha 3" bind:value={settings.endereco_linha3} placeholder="CEP, informações adicionais" class_name="w-full" />
      </div>
    </Card>

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
