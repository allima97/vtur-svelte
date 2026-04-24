<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldCheckbox, FieldTextarea } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import {
    AlertCircle,
    BellRing,
    BookOpen,
    Building2,
    CreditCard,
    FileText,
    Mail,
    Megaphone,
    Settings2,
    Shield,
    Users
  } from 'lucide-svelte';

  type SummaryPayload = {
    counts?: {
      usuarios_total?: number;
      usuarios_ativos?: number;
      usuarios_inativos?: number;
      empresas_total?: number;
      empresas_ativas?: number;
      tipos_total?: number;
      avisos_ativos?: number;
      vinculos_master_pendentes?: number;
    };
    indicators?: {
      email_configurado?: boolean;
      escopo?: string;
      scope_company_ids?: string[];
    };
  };

  type MaintenancePayload = {
    maintenance_enabled: boolean;
    maintenance_message: string | null;
    updated_at: string | null;
  };

  let loading = true;
  let saving = false;
  let summary: SummaryPayload | null = null;
  let maintenance: MaintenancePayload = {
    maintenance_enabled: false,
    maintenance_message: null,
    updated_at: null
  };

  const atalhos = [
    { title: 'Empresas', href: '/admin/empresas', icon: Building2, description: 'Cadastro e status de contas' },
    { title: 'Usuários', href: '/admin/usuarios', icon: Users, description: 'Perfis, cargos e acesso' },
    { title: 'Planos', href: '/admin/planos', icon: CreditCard, description: 'Catálogo e valores' },
    { title: 'Financeiro', href: '/admin/financeiro', icon: CreditCard, description: 'Status e cobranças' },
    { title: 'Permissões', href: '/admin/permissoes', icon: Shield, description: 'Módulos e níveis de acesso' },
    { title: 'Avisos', href: '/admin/avisos', icon: Megaphone, description: 'Templates e notificações' },
    { title: 'E-mail', href: '/admin/email', icon: Mail, description: 'Configurar envio' },
    { title: 'Logs', href: '/dashboard/logs', icon: FileText, description: 'Auditoria do sistema' },
    { title: 'Documentação', href: '/documentacao', icon: BookOpen, description: 'Guias e instruções' }
  ];

  function formatDateTime(value: string | null | undefined) {
    if (!value) return 'Sem registro';
    return new Date(value).toLocaleString('pt-BR');
  }

  async function loadSummary() {
    const response = await fetch('/api/v1/admin/summary');
    if (!response.ok) throw new Error(await response.text());
    summary = await response.json();
  }

  async function loadMaintenance() {
    const response = await fetch('/api/v1/admin/maintenance');
    if (!response.ok) throw new Error(await response.text());
    maintenance = await response.json();
  }

  async function loadDashboard() {
    loading = true;
    try {
      await Promise.all([loadSummary(), loadMaintenance()]);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar o dashboard administrativo.');
    } finally {
      loading = false;
    }
  }

  async function saveMaintenance() {
    saving = true;
    try {
      const response = await fetch('/api/v1/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenance)
      });

      if (!response.ok) throw new Error(await response.text());
      toast.success('Modo de manutenção atualizado.');
      await loadMaintenance();
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível salvar a manutenção.');
    } finally {
      saving = false;
    }
  }

  onMount(loadDashboard);
</script>

<svelte:head>
  <title>Dashboard administrativo | VTUR</title>
</svelte:head>

<PageHeader
  title="Dashboard administrativo"
  subtitle="Controle geral do sistema, manutenção, cobranças e atalhos operacionais."
  breadcrumbs={[{ label: 'Dashboard' }, { label: 'Admin' }]}
  actions={[{ label: 'Atualizar', onClick: loadDashboard, variant: 'secondary', icon: Settings2 }]}
/>

<div class="space-y-6">
  <Card color="financeiro" title="Modo de manutenção" subtitle="Suspende o acesso do sistema e exibe a página de manutenção para todos os usuários.">
    <div class="space-y-4">
      <FieldCheckbox
        id="maintenance-enabled"
        label={maintenance.maintenance_enabled ? 'Manutenção ativa' : 'Manutenção desativada'}
        checked={maintenance.maintenance_enabled}
        onCheckedChange={(value) => (maintenance = { ...maintenance, maintenance_enabled: value })}
      />
      <FieldTextarea
        id="maintenance-message"
        label="Mensagem de manutenção"
        bind:value={maintenance.maintenance_message}
        rows={5}
        helper={`Última atualização: ${formatDateTime(maintenance.updated_at)}`}
      />
      <div class="flex flex-wrap gap-3">
        <Button variant="primary" color="financeiro" on:click={saveMaintenance} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button variant="outline" color="financeiro" href="/manutencao">Abrir página de manutenção</Button>
      </div>
    </div>
  </Card>

  <div class="vtur-kpi-grid mb-6">
    <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Building2 size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Empresas</p>
        <p class="text-2xl font-bold text-slate-900">{loading ? '…' : summary?.counts?.empresas_total ?? 0}</p>
        <p class="text-xs text-slate-400">Ativas: {summary?.counts?.empresas_ativas ?? 0}</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-indigo-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500"><Users size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Usuários</p>
        <p class="text-2xl font-bold text-slate-900">{loading ? '…' : summary?.counts?.usuarios_total ?? 0}</p>
        <p class="text-xs text-slate-400">Ativos: {summary?.counts?.usuarios_ativos ?? 0}</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-amber-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500"><BellRing size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Avisos ativos</p>
        <p class="text-2xl font-bold text-slate-900">{loading ? '…' : summary?.counts?.avisos_ativos ?? 0}</p>
        <p class="text-xs text-slate-400">Templates prontos para uso</p>
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-red-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"><AlertCircle size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Vínculos master pendentes</p>
        <p class="text-2xl font-bold text-slate-900">{loading ? '…' : summary?.counts?.vinculos_master_pendentes ?? 0}</p>
        <p class="text-xs text-slate-400">Pendências de portfólio</p>
      </div>
    </div>
  </div>

  <Card color="financeiro" title="Atalhos rápidos" subtitle="Acesso direto aos painéis administrativos mais usados.">
    <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {#each atalhos as item}
        <Button href={item.href} variant="unstyled" class_name="block rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-orange-300 hover:bg-orange-50/40">
          <div class="flex items-start gap-3">
            <div class="rounded-xl bg-orange-100 p-3 text-orange-700">
              <svelte:component this={item.icon} size={20} />
            </div>
            <div>
              <p class="font-semibold text-slate-900">{item.title}</p>
              <p class="text-sm text-slate-600">{item.description}</p>
            </div>
          </div>
        </Button>
      {/each}
    </div>
  </Card>

  <Card color="financeiro" title="Status operacional">
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center gap-2 text-slate-900">
          <Mail size={18} class={summary?.indicators?.email_configurado ? 'text-emerald-600' : 'text-slate-400'} />
          <p class="font-medium">Disparo de e-mail</p>
        </div>
        <p class="mt-2 text-sm text-slate-600">
          {summary?.indicators?.email_configurado
            ? 'Configuração ativa para testes e avisos administrativos.'
            : 'Ainda sem configuração completa de e-mail global.'}
        </p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="font-medium text-slate-900">Escopo atual</p>
        <p class="mt-2 text-sm text-slate-600">Perfil carregado: <span class="font-semibold">{summary?.indicators?.escopo ?? '-'}</span></p>
        <p class="mt-1 text-sm text-slate-500">Empresas em escopo: {summary?.indicators?.scope_company_ids?.length ?? 0}</p>
      </div>
    </div>
  </Card>
</div>