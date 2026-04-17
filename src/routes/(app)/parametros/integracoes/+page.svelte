<script lang="ts">
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { Plug, Save, Check, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  let saving = false;
  let testando = false;

  const integracoes = [
    {
      id: 'supabase',
      nome: 'Supabase',
      descricao: 'Banco de dados e autenticação',
      icone: '🔷',
      status: 'conectado',
      campos: [
        { nome: 'URL', valor: 'https://xyz.supabase.co', tipo: 'text' },
        { nome: 'API Key', valor: '••••••••••••••••', tipo: 'password' }
      ]
    },
    {
      id: 'stripe',
      nome: 'Stripe',
      descricao: 'Gateway de pagamento',
      icone: '💳',
      status: 'conectado',
      campos: [
        { nome: 'Publishable Key', valor: 'pk_live_••••••••••••••••', tipo: 'text' },
        { nome: 'Secret Key', valor: '••••••••••••••••', tipo: 'password' },
        { nome: 'Webhook Secret', valor: '••••••••••••••••', tipo: 'password' }
      ]
    },
    {
      id: 'whatsapp',
      nome: 'WhatsApp Business API',
      descricao: 'Envio de mensagens automatizadas',
      icone: '💬',
      status: 'desconectado',
      campos: [
        { nome: 'Phone Number ID', valor: '', tipo: 'text' },
        { nome: 'Access Token', valor: '', tipo: 'password' },
        { nome: 'Webhook URL', valor: 'https://api.vtur.com/webhooks/whatsapp', tipo: 'text', readonly: true }
      ]
    },
    {
      id: 'sendgrid',
      nome: 'SendGrid',
      descricao: 'Envio de emails transacionais',
      icone: '📧',
      status: 'conectado',
      campos: [
        { nome: 'API Key', valor: '••••••••••••••••', tipo: 'password' },
        { nome: 'From Email', valor: 'contato@vtur.com.br', tipo: 'text' },
        { nome: 'From Name', valor: 'VTUR Viagens', tipo: 'text' }
      ]
    },
    {
      id: 'google',
      nome: 'Google Calendar',
      descricao: 'Sincronização de agenda',
      icone: '📅',
      status: 'configurar',
      campos: [
        { nome: 'Client ID', valor: '', tipo: 'text' },
        { nome: 'Client Secret', valor: '', tipo: 'password' },
        { nome: 'Redirect URI', valor: 'https://vtur.com/auth/google/callback', tipo: 'text', readonly: true }
      ]
    }
  ];

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      conectado: 'bg-green-100 text-green-700',
      desconectado: 'bg-red-100 text-red-700',
      configurar: 'bg-amber-100 text-amber-700',
      erro: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      conectado: 'Conectado',
      desconectado: 'Desconectado',
      configurar: 'Configurar',
      erro: 'Erro'
    };
    return `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${styles[status]}">${labels[status]}</span>`;
  }

  async function testarConexao(id: string) {
    testando = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success(`Conexão com ${id} testada com sucesso!`);
    testando = false;
  }

  async function salvarConfiguracoes() {
    saving = true;
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success('Configurações de integrações salvas!');
    saving = false;
  }
</script>

<svelte:head>
  <title>Integrações | VTUR</title>
</svelte:head>

<PageHeader 
  title="Integrações"
  subtitle="APIs e serviços externos"
  color="financeiro"
  breadcrumbs={[
    { label: 'Parâmetros', href: '/parametros' },
    { label: 'Integrações' }
  ]}
/>

<div class="space-y-6">
  {#each integracoes as int}
    <Card color="financeiro">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
            {int.icone}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-slate-900">{int.nome}</h3>
              {@html getStatusBadge(int.status)}
            </div>
            <p class="text-sm text-slate-500">{int.descricao}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          {#if int.status === 'conectado'}
            <Button variant="secondary" size="sm" on:click={() => testarConexao(int.id)} disabled={testando}>
              <RefreshCw size={16} class="mr-1 {testando ? 'animate-spin' : ''}" />
              Testar
            </Button>
          {/if}
          <a 
            href="#" 
            class="p-2 text-slate-400 hover:text-financeiro-600 hover:bg-financeiro-50 rounded-lg transition-colors"
            title="Documentação"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each int.campos as campo}
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">{campo.nome}</label>
            {#if campo.readonly}
              <div class="flex items-center gap-2">
                <input 
                  type="text" 
                  value={campo.valor}
                  readonly
                  class="vtur-input w-full bg-slate-50 text-slate-500"
                />
                <button 
                  type="button"
                  class="p-2 text-slate-400 hover:text-financeiro-600 rounded-lg"
                  on:click={() => { navigator.clipboard.writeText(campo.valor); toast.success('Copiado!'); }}
                >
                  📋
                </button>
              </div>
            {:else}
              <input 
                type={campo.tipo} 
                value={campo.valor}
                class="vtur-input w-full"
              />
            {/if}
          </div>
        {/each}
      </div>

      {#if int.status === 'desconectado'}
        <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div class="flex items-center gap-2">
            <AlertTriangle size={18} class="text-amber-600" />
            <span class="text-sm text-amber-700">Esta integração não está configurada. Preencha os campos acima para ativar.</span>
          </div>
        </div>
      {/if}
    </Card>
  {/each}
</div>

<!-- Botões -->
<div class="flex items-center justify-end gap-3 mt-6">
  <Button variant="secondary" on:click={() => history.back()}>Cancelar</Button>
  <Button variant="primary" color="financeiro" on:click={salvarConfiguracoes} disabled={saving}>
    {#if saving}
      <span class="animate-spin mr-2">⟳</span>
      Salvando...
    {:else}
      <Save size={18} class="mr-2" />
      Salvar Configurações
    {/if}
  </Button>
</div>
