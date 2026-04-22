<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { toast } from '$lib/stores/ui';
  import {
    Building2,
    Mail,
    Settings2,
    Shield,
    Users,
    UserRoundCog,
    BellRing,
    CheckCircle2,
    AlertCircle
  } from 'lucide-svelte';

  let loading = true;
  let summary: any = null;

  const modules = [
    {
      title: 'Usuarios',
      description: 'Listagem, detalhe, status, papel, escopo, senha e 2FA.',
      href: '/admin/usuarios',
      icon: Users,
      countKey: 'usuarios_total'
    },
    {
      title: 'Permissoes',
      description: 'Permissoes por usuario e configuracao global de modulos.',
      href: '/admin/permissoes',
      icon: Shield
    },
    {
      title: 'Tipos de usuario',
      description: 'Perfis padrao e permissao default por papel.',
      href: '/admin/tipos-usuario',
      icon: UserRoundCog,
      countKey: 'tipos_total'
    },
    {
      title: 'Empresas',
      description: 'Empresas, billing e vinculos de portfolio master.',
      href: '/admin/empresas',
      icon: Building2,
      countKey: 'empresas_total'
    },
    {
      title: 'Avisos',
      description: 'Templates administrativos e disparos auxiliares.',
      href: '/admin/avisos',
      icon: BellRing,
      countKey: 'avisos_ativos'
    },
    {
      title: 'E-mail',
      description: 'Resend/SMTP, remetentes e validacao operacional.',
      href: '/admin/email',
      icon: Mail
    },
    {
      title: 'Parametros',
      description: 'Configuracoes operacionais, seguranca e conciliacao.',
      href: '/parametros',
      icon: Settings2
    }
  ];

  async function loadSummary() {
    loading = true;
    try {
      const response = await fetch('/api/v1/admin/summary');
      if (!response.ok) throw new Error(await response.text());
      summary = await response.json();
    } catch (err) {
      console.error(err);
      toast.error('Nao foi possivel carregar o resumo administrativo.');
      summary = null;
    } finally {
      loading = false;
    }
  }

  onMount(loadSummary);
</script>

<svelte:head>
  <title>Administracao | VTUR</title>
</svelte:head>

<PageHeader
  title="Administracao"
  subtitle="Painel consolidado de usuarios, permissoes e configuracoes administrativas."
  breadcrumbs={[{ label: 'Administracao' }]}
/>

<div class="space-y-6">
  <Card color="financeiro">
    <div class="flex items-start gap-3">
      <Shield size={22} class="mt-0.5 text-orange-600" />
      <div class="space-y-1">
        <p class="text-sm font-semibold text-slate-900">Area critica do sistema</p>
        <p class="text-sm text-slate-600">
          Este modulo concentra regras de acesso, perfis, escopo por empresa e configuracoes operacionais.
        </p>
      </div>
    </div>
  </Card>

  <div class="vtur-kpi-grid mb-6">
    <div class="vtur-kpi-card border-t-[3px] border-t-blue-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Users size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Usuários ativos</p>
        <p class="text-2xl font-bold text-slate-900">{loading ? '…' : summary?.counts?.usuarios_ativos ?? 0}</p>
        {#if !loading}<p class="text-xs text-slate-400">{summary?.counts?.usuarios_inativos ?? 0} inativos</p>{/if}
      </div>
    </div>
    <div class="vtur-kpi-card border-t-[3px] border-t-orange-400">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Building2 size={20} /></div>
      <div>
        <p class="text-sm font-medium text-slate-500">Empresas no escopo</p>
        <p class="text-2xl font-bold text-slate-900">{loading ? '…' : summary?.counts?.empresas_total ?? 0}</p>
        {#if !loading}<p class="text-xs text-slate-400">{summary?.counts?.empresas_ativas ?? 0} ativas</p>{/if}
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

  <Card color="financeiro" title="Modulos administrativos">
    <div class="grid gap-4 lg:grid-cols-2">
      {#each modules as item}
        <Button
          type="button"
          variant="unstyled"
          class_name="block rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-orange-300 hover:bg-orange-50/40"
          on:click={() => goto(item.href)}
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <div class="rounded-xl bg-orange-100 p-3 text-orange-700">
                <svelte:component this={item.icon} size={20} />
              </div>
              <div class="space-y-1">
                <p class="font-semibold text-slate-900">{item.title}</p>
                <p class="text-sm text-slate-600">{item.description}</p>
              </div>
            </div>

            {#if item.countKey}
              <Badge color="yellow" size="sm">
                {loading ? '...' : summary?.counts?.[item.countKey] ?? 0}
              </Badge>
            {/if}
          </div>
        </Button>
      {/each}
    </div>
  </Card>

  <Card color="financeiro" title="Status operacional">
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center gap-2 text-slate-900">
          <CheckCircle2 size={18} class={summary?.indicators?.email_configurado ? 'text-emerald-600' : 'text-slate-400'} />
          <p class="font-medium">Disparo de e-mail</p>
        </div>
        <p class="mt-2 text-sm text-slate-600">
          {summary?.indicators?.email_configurado
            ? 'Configuracao ativa para testes e avisos administrativos.'
            : 'Ainda sem configuracao completa de e-mail global.'}
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="font-medium text-slate-900">Escopo atual</p>
        <p class="mt-2 text-sm text-slate-600">
          Perfil carregado: <span class="font-semibold">{summary?.indicators?.escopo ?? '-'}</span>
        </p>
        <p class="mt-1 text-sm text-slate-500">
          Empresas em escopo: {summary?.indicators?.scope_company_ids?.length ?? 0}
        </p>
      </div>
    </div>
  </Card>
</div>
