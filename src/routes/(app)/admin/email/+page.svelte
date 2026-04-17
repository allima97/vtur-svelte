<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/ui';
  import { Send, RefreshCw } from 'lucide-svelte';

  let loading = true;
  let saving = false;
  let sendingTest = false;
  let testEmail = '';
  let form = {
    smtp_host: '',
    smtp_port: '465',
    smtp_secure: true,
    smtp_user: '',
    smtp_pass: '',
    resend_api_key: '',
    alerta_from_email: '',
    admin_from_email: '',
    avisos_from_email: '',
    financeiro_from_email: '',
    suporte_from_email: ''
  };

  async function loadPage() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/email');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      form = {
        smtp_host: payload.settings.smtp_host || '',
        smtp_port: String(payload.settings.smtp_port || '465'),
        smtp_secure: payload.settings.smtp_secure !== false,
        smtp_user: payload.settings.smtp_user || '',
        smtp_pass: payload.settings.smtp_pass || '',
        resend_api_key: payload.settings.resend_api_key || '',
        alerta_from_email: payload.settings.alerta_from_email || '',
        admin_from_email: payload.settings.admin_from_email || '',
        avisos_from_email: payload.settings.avisos_from_email || '',
        financeiro_from_email: payload.settings.financeiro_from_email || '',
        suporte_from_email: payload.settings.suporte_from_email || ''
      };
    } catch (err) {
      console.error(err);
      toast.error('Nao foi possivel carregar as configuracoes de e-mail.');
    } finally {
      loading = false;
    }
  }

  async function saveEmailSettings() {
    saving = true;
    try {
      const response = await fetch('/api/v1/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          smtp_port: Number(form.smtp_port)
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Configuracoes de e-mail salvas.');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configuracoes.');
    } finally {
      saving = false;
    }
  }

  async function sendTestEmail() {
    sendingTest = true;
    try {
      const response = await fetch('/api/v1/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail || form.admin_from_email || form.avisos_from_email })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('E-mail de teste enviado com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar teste.');
    } finally {
      sendingTest = false;
    }
  }

  onMount(loadPage);
</script>

<svelte:head>
  <title>E-mail | VTUR</title>
</svelte:head>

<PageHeader
  title="E-mail"
  subtitle="Configuracoes globais de envio para administracao, avisos, suporte e financeiro."
  breadcrumbs={[
    { label: 'Administracao', href: '/admin' },
    { label: 'E-mail' }
  ]}
  actions={[{ label: 'Atualizar', onClick: loadPage, variant: 'secondary', icon: RefreshCw }]}
/>

<div class="space-y-6">
  <Card color="financeiro" title="Envio principal">
    <div class="grid gap-4 md:grid-cols-2">
      <div class="md:col-span-2">
        <label class="mb-1 block text-sm font-medium text-slate-700" for="resend-key">Resend API key</label>
        <input id="resend-key" bind:value={form.resend_api_key} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="smtp-host">SMTP host</label>
        <input id="smtp-host" bind:value={form.smtp_host} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="smtp-port">SMTP port</label>
        <input id="smtp-port" bind:value={form.smtp_port} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="smtp-user">SMTP user</label>
        <input id="smtp-user" bind:value={form.smtp_user} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="smtp-pass">SMTP password</label>
        <input id="smtp-pass" type="password" bind:value={form.smtp_pass} class="vtur-input w-full" />
      </div>
      <label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
        <input type="checkbox" bind:checked={form.smtp_secure} />
        <div>
          <p class="font-medium text-slate-900">SMTP seguro</p>
          <p class="text-sm text-slate-500">Ativa TLS/SSL quando houver fallback SMTP.</p>
        </div>
      </label>
    </div>
  </Card>

  <Card color="financeiro" title="Remetentes por area">
    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="from-alerta">Alerta</label>
        <input id="from-alerta" bind:value={form.alerta_from_email} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="from-admin">Admin</label>
        <input id="from-admin" bind:value={form.admin_from_email} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="from-avisos">Avisos</label>
        <input id="from-avisos" bind:value={form.avisos_from_email} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="from-financeiro">Financeiro</label>
        <input id="from-financeiro" bind:value={form.financeiro_from_email} class="vtur-input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="from-suporte">Suporte</label>
        <input id="from-suporte" bind:value={form.suporte_from_email} class="vtur-input w-full" />
      </div>
    </div>
  </Card>

  <Card color="financeiro" title="Validacao">
    <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="test-email">Destino do teste</label>
        <input id="test-email" bind:value={testEmail} class="vtur-input w-full" placeholder="email@empresa.com" />
      </div>
      <div class="md:self-end">
        <Button variant="outline" on:click={sendTestEmail} loading={sendingTest}>
          <Send size={16} class="mr-2" />
          Enviar teste
        </Button>
      </div>
    </div>
  </Card>

  <div class="flex flex-wrap gap-3">
    <Button variant="primary" color="financeiro" on:click={saveEmailSettings} loading={saving}>
      Salvar configuracoes
    </Button>
  </div>
</div>
