<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { supabase } from '$lib/db/supabase';

  let sessionInfo = 'Carregando...';
  let sessionDetails = '';
  let apiTests: Array<{ name: string; status: string; detail: string; time: number }> = [];

  async function runDiagnostics() {
    // Test session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      sessionInfo = `Erro: ${sessionError.message}`;
    } else if (sessionData.session) {
      sessionInfo = `OK - Usuario: ${sessionData.session.user?.email || 'desconhecido'}`;
    } else {
      sessionInfo = 'Nenhuma sessao encontrada';
    }

    // Test APIs
    const apis = [
      '/api/v1/health',
      '/api/v1/relatorios/base',
      '/api/v1/relatorios/vendas',
      '/api/v1/financeiro/comissoes/calcular',
      '/api/v1/parametros/metas',
      '/api/v1/roteiros',
    ];

    for (const api of apis) {
      const start = Date.now();
      try {
        const response = await fetch(api);
        const time = Date.now() - start;
        const text = await response.text();
        let detail = '';
        
        try {
          const json = JSON.parse(text);
          if (json.error) {
            detail = `Erro: ${json.error}`;
          } else if (json.items !== undefined) {
            detail = `OK - ${json.items?.length || 0} itens`;
          } else {
            detail = 'OK';
          }
        } catch {
          detail = text.substring(0, 100);
        }
        
        apiTests = [...apiTests, {
          name: api,
          status: response.ok ? 'OK' : `Erro ${response.status}`,
          detail,
          time
        }];
      } catch (err) {
        apiTests = [...apiTests, {
          name: api,
          status: 'Falha',
          detail: String(err),
          time: Date.now() - start
        }];
      }
    }
  }

  onMount(() => {
    runDiagnostics();
  });
</script>

<svelte:head>
  <title>Diagnostico | VTUR</title>
</svelte:head>

<PageHeader
  title="Diagnostico de Sistema"
  subtitle="Verifique o status de conexao e APIs."
  color="financeiro"
/>

<div class="space-y-6">
  <Card header="Sessao do Usuario" color="financeiro">
    <div class="space-y-2">
      <p><strong>Status:</strong> {sessionInfo}</p>
      {#if sessionDetails}
        <p class="text-sm text-slate-600">{sessionDetails}</p>
      {/if}
    </div>
  </Card>

  <Card header="Teste de APIs" color="financeiro">
    <table class="w-full text-sm table-mobile-cards">
      <thead>
        <tr class="text-left border-b">
          <th class="pb-2">API</th>
          <th class="pb-2">Status</th>
          <th class="pb-2">Detalhes</th>
          <th class="pb-2">Tempo</th>
        </tr>
      </thead>
      <tbody>
        {#each apiTests as test}
          <tr class="border-b border-slate-100">
            <td class="py-2 font-mono text-xs">{test.name}</td>
            <td class="py-2">
              <span class:text-green-600={test.status === 'OK'}>
                {test.status}
              </span>
            </td>
            <td class="py-2 text-slate-600">{test.detail}</td>
            <td class="py-2">{test.time}ms</td>
          </tr>
        {/each}
        {#if apiTests.length === 0}
          <tr>
            <td colspan="4" class="py-4 text-center text-slate-500">
              Clique em "Executar Diagnostico" para testar
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
    
    <div class="mt-4">
      <Button
        color="financeiro"
        on:click={runDiagnostics}
      >
        Executar Diagnostico
      </Button>
    </div>
  </Card>

  <Card header="Informacoes do Navegador" color="financeiro">
    <div class="space-y-2 text-sm">
      <p><strong>User Agent:</strong> <span class="font-mono">{navigator.userAgent}</span></p>
      <p><strong>Cookies Habilitados:</strong> {navigator.cookieEnabled ? 'Sim' : 'Nao'}</p>
    </div>
  </Card>
</div>
