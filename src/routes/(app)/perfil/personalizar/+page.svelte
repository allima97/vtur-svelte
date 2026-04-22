<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FieldToggle from '$lib/components/ui/form/FieldToggle.svelte';
  import { toast } from '$lib/stores/ui';
  import { Save, RefreshCw } from 'lucide-svelte';

  const MENU_PREFS_UPDATED_EVENT = 'vtur:menu-prefs-updated';

  // Seções do menu com seus itens
  const SECOES = [
    {
      key: 'informativos',
      label: 'Informativos',
      items: [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'tarefas', label: 'Tarefas' },
        { key: 'agenda', label: 'Agenda' },
        { key: 'acompanhamento', label: 'Acompanhamento' },
        { key: 'recados', label: 'Recados' }
      ]
    },
    {
      key: 'operacao',
      label: 'Operação',
      items: [
        { key: 'vendas', label: 'Vendas' },
        { key: 'clientes', label: 'Clientes' },
        { key: 'viagens', label: 'Viagens' },
        { key: 'orcamentos', label: 'Orçamentos' },
        { key: 'vouchers', label: 'Vouchers' },
        { key: 'controle_sac', label: 'Controle SAC' },
        { key: 'campanhas', label: 'Campanhas' },
        { key: 'documentos', label: 'Documentos' }
      ]
    },
    {
      key: 'financeiro',
      label: 'Financeiro',
      items: [
        { key: 'caixa', label: 'Caixa' },
        { key: 'conciliacao', label: 'Conciliação' },
        { key: 'comissoes', label: 'Comissões' },
        { key: 'formas_pagamento', label: 'Formas de Pagamento' },
        { key: 'regras', label: 'Regras' }
      ]
    },
    {
      key: 'relatorios',
      label: 'Relatórios',
      items: [
        { key: 'rel_vendas', label: 'Vendas' },
        { key: 'rel_produtos', label: 'Por Produto' },
        { key: 'rel_clientes', label: 'Por Cliente' },
        { key: 'rel_destinos', label: 'Por Destino' },
        { key: 'rel_ranking', label: 'Ranking' }
      ]
    }
  ];

  type MenuPrefs = {
    hidden: string[];
  };

  let prefs: MenuPrefs = { hidden: [] };
  let loading = true;
  let saving = false;

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/user/profile');
      if (response.ok) {
        // Tenta carregar preferências salvas (se existir endpoint)
        const stored = localStorage.getItem('vtur:menu-prefs');
        if (stored) {
          prefs = JSON.parse(stored);
        }
      }
    } catch {
      // Usa padrão
    } finally {
      loading = false;
    }
  }

  function toggleItem(key: string) {
    if (prefs.hidden.includes(key)) {
      prefs = { ...prefs, hidden: prefs.hidden.filter((k) => k !== key) };
    } else {
      prefs = { ...prefs, hidden: [...prefs.hidden, key] };
    }
  }

  function isHidden(key: string) {
    return prefs.hidden.includes(key);
  }

  function setItemVisible(key: string, visible: boolean) {
    const currentlyHidden = isHidden(key);
    if (visible && currentlyHidden) {
      toggleItem(key);
      return;
    }
    if (!visible && !currentlyHidden) {
      toggleItem(key);
    }
  }

  async function save() {
    saving = true;
    try {
      // Salva localmente (o vtur-app também usa localStorage como fallback)
      localStorage.setItem('vtur:menu-prefs', JSON.stringify(prefs));
      window.dispatchEvent(new CustomEvent(MENU_PREFS_UPDATED_EVENT));
      toast.success('Preferências de menu salvas.');
    } catch {
      toast.error('Erro ao salvar preferências.');
    } finally {
      saving = false;
    }
  }

  function resetPrefs() {
    prefs = { hidden: [] };
    localStorage.removeItem('vtur:menu-prefs');
    window.dispatchEvent(new CustomEvent(MENU_PREFS_UPDATED_EVENT));
    toast.success('Preferências resetadas para o padrão.');
  }

  onMount(load);
</script>

<svelte:head>
  <title>Personalizar Menu | VTUR</title>
</svelte:head>

<PageHeader
  title="Personalizar Menu"
  subtitle="Mostre ou oculte itens do menu lateral conforme sua preferência."
  breadcrumbs={[
    { label: 'Perfil', href: '/perfil' },
    { label: 'Personalizar Menu' }
  ]}
  actions={[
    { label: 'Resetar', onClick: resetPrefs, variant: 'secondary', icon: RefreshCw }
  ]}
/>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>
{:else}
  <div class="space-y-6">
    {#each SECOES as secao}
      <Card title={secao.label}>
        <div class="space-y-2">
          {#each secao.items as item}
            <FieldToggle
              label={item.label}
              checked={!isHidden(item.key)}
              color="operacao"
              helper={isHidden(item.key) ? 'Oculto no menu lateral' : 'Visível no menu lateral'}
              on:change={() => {
                setItemVisible(item.key, isHidden(item.key));
              }}
            />
          {/each}
        </div>
      </Card>
    {/each}

    <form class="flex justify-end" on:submit|preventDefault={save}>
      <Button type="submit" variant="primary" loading={saving}>
        <Save size={16} class="mr-2" />
        Salvar preferências
      </Button>
    </form>
  </div>
{/if}
