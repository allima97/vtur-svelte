<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { toast } from '$lib/stores/ui';
  import { MessageCircle, Plus, Send, Trash2, RefreshCw, Users } from 'lucide-svelte';

  type Usuario = { id: string; nome_completo: string | null; email: string | null };
  type Recado = {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    assunto: string | null;
    conteudo: string;
    created_at: string;
    sender?: Usuario | null;
    receiver?: Usuario | null;
  };

  let recados: Recado[] = [];
  let usuarios: Usuario[] = [];
  let loading = true;
  let modalOpen = false;
  let sending = false;
  let deletingId = '';

  let form = { receiver_id: '', assunto: '', conteudo: '' };

  async function load() {
    loading = true;
    try {
      const response = await fetch('/api/v1/operacao/recados');
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      recados = payload.items || [];
      usuarios = payload.usuarios || [];
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar recados.');
    } finally {
      loading = false;
    }
  }

  async function send() {
    if (!form.conteudo.trim()) { toast.error('Informe o conteúdo do recado.'); return; }
    sending = true;
    try {
      const response = await fetch('/api/v1/operacao/recados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Recado enviado.');
      modalOpen = false;
      form = { receiver_id: '', assunto: '', conteudo: '' };
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar recado.');
    } finally {
      sending = false;
    }
  }

  async function deleteRecado(id: string) {
    if (!confirm('Deseja excluir este recado?')) return;
    deletingId = id;
    try {
      const response = await fetch(`/api/v1/operacao/recados?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Recado excluído.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir recado.');
    } finally {
      deletingId = '';
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getNome(u?: Usuario | null) {
    return u?.nome_completo || u?.email || 'Usuário';
  }

  onMount(load);
</script>

<svelte:head>
  <title>Mural de Recados | VTUR</title>
</svelte:head>

<PageHeader
  title="Mural de Recados"
  subtitle="Troca de mensagens internas entre membros da equipe."
  color="operacao"
  breadcrumbs={[
    { label: 'Operação', href: '/operacao' },
    { label: 'Recados' }
  ]}
  actions={[
    { label: 'Atualizar', onClick: load, variant: 'secondary', icon: RefreshCw },
    { label: 'Novo Recado', onClick: () => (modalOpen = true), variant: 'primary', icon: Plus }
  ]}
/>

{#if loading}
  <div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>
{:else if recados.length === 0}
  <Card color="operacao">
    <div class="flex flex-col items-center justify-center py-16 text-slate-500">
      <MessageCircle size={48} class="mb-4 opacity-30" />
      <p class="font-medium">Nenhum recado encontrado.</p>
      <p class="mt-1 text-sm">Clique em "Novo Recado" para enviar uma mensagem.</p>
    </div>
  </Card>
{:else}
  <div class="space-y-4">
    {#each recados as recado}
      <Card color="operacao">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-operacao-100 text-operacao-700 font-semibold text-sm flex-shrink-0">
              {getNome(recado.sender).slice(0, 2).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="font-semibold text-slate-900">{getNome(recado.sender)}</span>
                {#if recado.receiver}
                  <span class="text-slate-400">→</span>
                  <span class="font-medium text-slate-700">{getNome(recado.receiver)}</span>
                {:else}
                  <span class="inline-flex rounded-full bg-operacao-100 px-2 py-0.5 text-xs font-medium text-operacao-700">
                    <Users size={12} class="mr-1 mt-0.5" />
                    Todos
                  </span>
                {/if}
                <span class="text-xs text-slate-400">{formatDate(recado.created_at)}</span>
              </div>
              {#if recado.assunto}
                <p class="text-sm font-medium text-slate-800 mb-1">{recado.assunto}</p>
              {/if}
              <p class="text-sm text-slate-700 whitespace-pre-wrap">{recado.conteudo}</p>
            </div>
          </div>
          <button
            on:click={() => deleteRecado(recado.id)}
            class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 flex-shrink-0"
            title="Excluir"
            disabled={deletingId === recado.id}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </Card>
    {/each}
  </div>
{/if}

<Dialog
  bind:open={modalOpen}
  title="Novo Recado"
  color="operacao"
  size="md"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Enviar"
  loading={sending}
  onConfirm={send}
  onCancel={() => (modalOpen = false)}
>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="recado-para">Para</label>
      <select id="recado-para" bind:value={form.receiver_id} class="vtur-input w-full">
        <option value="">Todos da equipe</option>
        {#each usuarios as u}
          <option value={u.id}>{u.nome_completo || u.email}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="recado-assunto">Assunto</label>
      <input id="recado-assunto" bind:value={form.assunto} class="vtur-input w-full" placeholder="Assunto opcional" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="recado-conteudo">Mensagem *</label>
      <textarea id="recado-conteudo" bind:value={form.conteudo} rows="5" class="vtur-input w-full" placeholder="Digite sua mensagem..."></textarea>
    </div>
  </div>
</Dialog>
