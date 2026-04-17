<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
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
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="orc-consultor">Nome do Consultor</label>
          <input id="orc-consultor" bind:value={settings.consultor_nome} class="vtur-input w-full" placeholder="Seu nome completo" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="orc-filial">Filial / Agência</label>
          <input id="orc-filial" bind:value={settings.filial_nome} class="vtur-input w-full" placeholder="Nome da filial ou agência" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="orc-email">E-mail</label>
          <input id="orc-email" type="email" bind:value={settings.email} class="vtur-input w-full" placeholder="consultor@agencia.com.br" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="orc-telefone">Telefone</label>
          <input id="orc-telefone" bind:value={settings.telefone} class="vtur-input w-full" placeholder="(00) 0000-0000" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="orc-whatsapp">WhatsApp</label>
          <div class="flex gap-2">
            <input bind:value={settings.whatsapp_codigo_pais} class="vtur-input w-16" placeholder="55" maxlength="4" />
            <input id="orc-whatsapp" bind:value={settings.whatsapp} class="vtur-input flex-1" placeholder="(00) 00000-0000" />
          </div>
          <p class="mt-1 text-xs text-slate-500">Código do país + número (ex: 55 + 11 99999-9999)</p>
        </div>
      </div>
    </Card>

    <Card title="Endereço" color="financeiro">
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="orc-end1">Linha 1</label>
          <input id="orc-end1" bind:value={settings.endereco_linha1} class="vtur-input w-full" placeholder="Rua, número, complemento" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="orc-end2">Linha 2</label>
          <input id="orc-end2" bind:value={settings.endereco_linha2} class="vtur-input w-full" placeholder="Bairro, cidade - UF" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="orc-end3">Linha 3</label>
          <input id="orc-end3" bind:value={settings.endereco_linha3} class="vtur-input w-full" placeholder="CEP, informações adicionais" />
        </div>
      </div>
    </Card>

    <Card title="Rodapé do PDF" color="financeiro">
      <div class="flex items-start gap-2 mb-2">
        <FileText size={16} class="mt-0.5 text-slate-400" />
        <p class="text-sm text-slate-500">Texto exibido no rodapé dos PDFs de orçamento. Inclui condições gerais, política de cancelamento, etc.</p>
      </div>
      <textarea
        bind:value={settings.rodape_texto}
        rows="8"
        class="vtur-input w-full font-mono text-xs"
        placeholder="Texto do rodapé..."
      ></textarea>
    </Card>

    <div class="flex justify-end gap-3">
      <Button type="submit" variant="primary" color="financeiro" loading={saving}>
        <Save size={16} class="mr-2" />
        Salvar Parâmetros
      </Button>
    </div>
  </form>
{/if}
