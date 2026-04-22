<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FieldToggle from '$lib/components/ui/form/FieldToggle.svelte';
  import { toast } from '$lib/stores/ui';
  import { Save, RefreshCw } from 'lucide-svelte';

  const MENU_PREFS_UPDATED_EVENT = 'vtur:menu-prefs-updated';
  const MENU_PREFS_KEY = 'vtur:menu-prefs';

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
        { key: 'roteiros', label: 'Roteiros' },
        { key: 'vouchers', label: 'Vouchers' },
        { key: 'controle_sac', label: 'Controle SAC' },
        { key: 'campanhas', label: 'Campanhas' },
        { key: 'documentos', label: 'Documentos' },
        { key: 'consultoria_online', label: 'Consultoria Online' }
      ]
    },
    {
      key: 'financeiro',
      label: 'Financeiro',
      items: [
        { key: 'caixa', label: 'Caixa' },
        { key: 'conciliacao', label: 'Conciliação' },
        { key: 'comissoes', label: 'Comissões' },
        { key: 'fechamento', label: 'Fechamento' },
        { key: 'ajustes_vendas', label: 'Ajustes Vendas' },
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
    },
    {
      key: 'parametros',
      label: 'Parâmetros',
      items: [
        { key: 'parametros', label: 'Parâmetros' },
        { key: 'metas', label: 'Metas' },
        { key: 'equipe', label: 'Equipe' },
        { key: 'escalas', label: 'Escalas' },
        { key: 'cambios', label: 'Câmbios' },
        { key: 'tipo_pacotes', label: 'Tipo Pacotes' },
        { key: 'tipo_produtos', label: 'Tipo Produtos' },
        { key: 'orcamentos_pdf', label: 'Orçamentos PDF' },
        { key: 'crm', label: 'CRM' },
        { key: 'avisos', label: 'Avisos' },
        { key: 'empresa', label: 'Empresa' }
      ]
    },
    {
      key: 'perfil',
      label: 'Perfil',
      items: [
        { key: 'meu_perfil', label: 'Meu Perfil' },
        { key: 'minha_escala', label: 'Minha Escala' },
        { key: 'autenticacao_2fa', label: 'Autenticação 2FA' },
        { key: 'personalizar_menu', label: 'Personalizar Menu' },
        { key: 'preferencias', label: 'Preferências' }
      ]
    }
  ];

  type MenuPrefs = {
    hidden: string[];
  };

  let prefs: MenuPrefs = { hidden: [] };
  let loading = true;
  let saving = false;
  let feedbackMessage = '';
  let feedbackType: 'success' | 'error' | 'info' = 'info';

  function setFeedback(message: string, type: 'success' | 'error' | 'info' = 'info') {
    feedbackMessage = message;
    feedbackType = type;
  }

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/menu/prefs');
      if (response.ok) {
        const payload = await response.json();
        const hidden = Array.isArray(payload?.prefs?.hidden) ? payload.prefs.hidden : [];
        prefs = { hidden };
        localStorage.setItem(MENU_PREFS_KEY, JSON.stringify({ hidden }));
        setFeedback('Preferências do menu carregadas.', 'info');
      } else {
        setFeedback('Preferências remotas indisponíveis. Preferências locais carregadas.', 'info');
      }
      const stored = localStorage.getItem(MENU_PREFS_KEY);
      if (stored && prefs.hidden.length === 0) {
        const parsed = JSON.parse(stored) as MenuPrefs;
        prefs = { hidden: Array.isArray(parsed?.hidden) ? parsed.hidden : [] };
      }
    } catch {
      const stored = localStorage.getItem(MENU_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MenuPrefs;
        prefs = { hidden: Array.isArray(parsed?.hidden) ? parsed.hidden : [] };
      }
      setFeedback('Não foi possível validar o perfil. Preferências locais mantidas.', 'info');
    } finally {
      loading = false;
    }
  }

  function isHidden(key: string) {
    return prefs.hidden.includes(key);
  }

  function setItemHidden(key: string, hidden: boolean) {
    const nextHidden = hidden
      ? Array.from(new Set([...prefs.hidden, key]))
      : prefs.hidden.filter((k) => k !== key);

    prefs = { ...prefs, hidden: nextHidden };

    const ok = persistPrefsLocal(false);
    if (ok) {
      const hiddenNow = isHidden(key);
      const itemLabel =
        SECOES.flatMap((secao) => secao.items).find((item) => item.key === key)?.label || key;
      const message = hiddenNow
        ? `${itemLabel} foi ocultado do menu.`
        : `${itemLabel} voltou a aparecer no menu.`;
      toast.success(message);
      setFeedback(message, 'success');
    } else {
      toast.error('Falha ao aplicar alteração do menu.');
      setFeedback('Falha ao aplicar alteração do menu.', 'error');
    }
  }

  function persistPrefsLocal(showToast = true) {
    try {
      localStorage.setItem(MENU_PREFS_KEY, JSON.stringify(prefs));
      window.dispatchEvent(new CustomEvent(MENU_PREFS_UPDATED_EVENT));
      if (showToast) {
        toast.success('Preferências de menu salvas.');
        setFeedback('Preferências de menu salvas com sucesso.', 'success');
      }
      return true;
    } catch {
      if (showToast) {
        toast.error('Erro ao salvar preferências.');
        setFeedback('Erro ao salvar preferências.', 'error');
      }
      return false;
    }
  }

  async function save() {
    saving = true;
    try {
      const localOk = persistPrefsLocal(false);
      if (!localOk) throw new Error('Falha ao salvar preferências localmente.');

      const response = await fetch('/api/v1/menu/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefs: {
            v: 1,
            hidden: prefs.hidden,
            order: {},
            section: {}
          }
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success('Preferências de menu salvas com sucesso.');
      setFeedback('Preferências de menu salvas com sucesso.', 'success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar preferências de menu.');
      setFeedback(err instanceof Error ? err.message : 'Erro ao salvar preferências de menu.', 'error');
    } finally {
      saving = false;
    }
  }

  async function resetPrefs() {
    prefs = { hidden: [] };
    localStorage.removeItem(MENU_PREFS_KEY);
    window.dispatchEvent(new CustomEvent(MENU_PREFS_UPDATED_EVENT));
    try {
      const response = await fetch('/api/v1/menu/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefs: {
            v: 1,
            hidden: [],
            order: {},
            section: {}
          }
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Preferências resetadas para o padrão.');
      setFeedback('Preferências resetadas para o padrão.', 'success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resetar preferências de menu.');
      setFeedback(err instanceof Error ? err.message : 'Erro ao resetar preferências de menu.', 'error');
    }
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
              on:change={(event) => {
                const checked = (event.currentTarget as HTMLInputElement)?.checked;
                const isVisible = typeof checked === 'boolean' ? checked : !isHidden(item.key);
                setItemHidden(item.key, !isVisible);
              }}
            />
          {/each}
        </div>
      </Card>
    {/each}

    {#if feedbackMessage}
      <div
        class={`rounded-xl border px-4 py-3 text-sm ${
          feedbackType === 'success'
            ? 'border-green-200 bg-green-50 text-green-700'
            : feedbackType === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-blue-200 bg-blue-50 text-blue-700'
        }`}
        role="status"
        aria-live="polite"
      >
        {feedbackMessage}
      </div>
    {/if}

    <div class="flex justify-end">
      <Button
        type="button"
        variant="primary"
        loading={saving}
        on:click={save}
      >
        <Save size={16} class="mr-2" />
        {saving ? 'Salvando...' : 'Salvar preferências'}
      </Button>
    </div>
  </div>
{/if}
