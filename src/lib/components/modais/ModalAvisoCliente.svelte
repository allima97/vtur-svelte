<script lang="ts">
  import { X, MessageCircle, Mail, Send, Phone, Copy } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, FieldTextarea } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';

  export let open: boolean = false;
  export let clienteId: string = '';
  export let clienteNome: string = '';
  export let clienteTelefone: string = '';
  export let clienteEmail: string = '';
  export let clienteNascimento: string | null = null;
  export let onClose: () => void = () => {};
  export let onEnviar: (dados: any) => void = () => {};

  let canalAtivo: 'whatsapp' | 'email' = 'whatsapp';
  let templateSelecionado = '';
  let mensagemPersonalizada = '';
  let enviando = false;
  let templates: any[] = [];
  let carregandoTemplates = false;
  let erroTemplates = '';
  let modalReady = false;
  let historico: any[] = [];
  let carregandoHistorico = false;
  let historicoIndisponivel = false;

  $: isAniversariante = clienteNascimento ? isBirthdayToday(clienteNascimento) : false;
  $: templateAtual = templates.find((t) => t.id === templateSelecionado);
  $: assuntoAtual = templateAtual?.assunto
    ? aplicarVariaveis(templateAtual.assunto)
    : `Aviso para ${clienteNome.split(' ')[0] || clienteNome}`;

  $: if (open && !modalReady) {
    modalReady = true;
    void prepararModal();
  }

  $: if (!open && modalReady) {
    modalReady = false;
  }

  async function prepararModal() {
    canalAtivo = clienteTelefone ? 'whatsapp' : 'email';
    await Promise.all([carregarTemplates(), carregarHistorico()]);

    if (!templateSelecionado && templates.length > 0) {
      const preferred = isAniversariante ? templates.find((t) => t.tipo === 'aniversario') : templates[0];
      if (preferred) {
        templateSelecionado = preferred.id;
        aplicarTemplate();
      }
    }
  }

  async function carregarTemplates() {
    carregandoTemplates = true;
    erroTemplates = '';
    try {
      const response = await fetch('/api/v1/clientes/avisos/templates');
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length > 0) {
          templates = items;
          return;
        }

        // Fallback para a biblioteca CRM quando o endpoint de avisos retorna vazio.
        const libraryResponse = await fetch('/api/v1/crm/library');
        if (!libraryResponse.ok) {
          const errorPayload = await libraryResponse.json().catch(() => ({}));
          throw new Error(errorPayload?.error || 'Erro ao carregar biblioteca CRM');
        }
        const libraryData = await libraryResponse.json();
        const mensagens = Array.isArray(libraryData?.messages) ? libraryData.messages : [];
        templates = mensagens
          .filter((item: any) => item?.ativo !== false)
          .map((item: any) => ({
            id: String(item.id || ''),
            nome: String(item.nome || 'Template CRM'),
            tipo: String(item.categoria || 'geral'),
            assunto: String(item.assunto || item.titulo || ''),
            conteudo: String(item.corpo || ''),
          }))
          .filter((item: any) => item.id && item.conteudo);
      } else {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Erro ao carregar templates de avisos');
      }
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      templates = [];
      erroTemplates = err instanceof Error ? err.message : 'Falha ao carregar templates';
    } finally {
      carregandoTemplates = false;
    }
  }

  async function carregarHistorico() {
    if (!clienteId) return;
    carregandoHistorico = true;
    historicoIndisponivel = false;
    try {
      const response = await fetch(`/api/v1/clientes/avisos/history?cliente_id=${clienteId}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Erro ao carregar histórico');
      historico = Array.isArray(data?.items) ? data.items : [];
      historicoIndisponivel = data?.unavailable === true;
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      historico = [];
    } finally {
      carregandoHistorico = false;
    }
  }

  function aplicarVariaveis(texto: string) {
    return String(texto || '')
      .replace(/\{nome\}/gi, clienteNome.split(' ')[0] || clienteNome)
      .replace(/\{nome_completo\}/gi, clienteNome)
      .replace(/\{email\}/gi, clienteEmail || '');
  }

  function aplicarTemplate() {
    const template = templates.find((t) => t.id === templateSelecionado);
    if (template) {
      mensagemPersonalizada = aplicarVariaveis(template.conteudo || template.mensagem || '');
    }
  }

  function isBirthdayToday(nascimento: string): boolean {
    if (!nascimento) return false;
    const today = new Date();
    const birth = new Date(nascimento);
    return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate();
  }

  async function enviarMensagem() {
    if (!mensagemPersonalizada.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    enviando = true;
    try {
      const response = await fetch('/api/v1/clientes/avisos/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteId,
          canal: canalAtivo,
          template_id: templateSelecionado || null,
          assunto: assuntoAtual,
          mensagem: mensagemPersonalizada
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Erro ao enviar mensagem');
      }

      if (payload?.canal === 'whatsapp' && payload?.whatsapp_url) {
        window.open(payload.whatsapp_url, '_blank', 'noopener,noreferrer');
        toast.success('WhatsApp preparado com sucesso');
      } else {
        toast.success('E-mail enviado com sucesso');
      }

      await carregarHistorico();

      onEnviar({
        canal: canalAtivo,
        mensagem: mensagemPersonalizada,
        assunto: assuntoAtual,
        cliente_id: clienteId,
        template_id: templateSelecionado || null,
        response: payload
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      enviando = false;
    }
  }

  function copiarMensagem() {
    navigator.clipboard.writeText(mensagemPersonalizada);
    toast.success('Mensagem copiada!');
  }

  function formatDate(value: string) {
    if (!value) return '-';
    return new Date(value).toLocaleString('pt-BR');
  }

  function getStatusLabel(value: string) {
    const key = String(value || '').toLowerCase();
    if (key === 'enviado') return 'Enviado';
    if (key === 'preparado') return 'Preparado';
    return value || '-';
  }

  const templatesFiltrados = templates;
</script>

{#if open}
  <div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" on:click|self={onClose} on:keydown={(event) => event.key === 'Escape' && onClose()} role="dialog" aria-modal="true" tabindex="-1">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" role="document">
      <div class="flex items-center justify-between p-4 border-b border-slate-100" class:bg-pink-50={isAniversariante} class:bg-clientes-50={!isAniversariante}>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" class:bg-pink-100={isAniversariante} class:bg-clientes-100={!isAniversariante}>
            {#if isAniversariante}<span class="text-2xl">🎉</span>{:else}<MessageCircle size={24} class="text-clientes-600" />{/if}
          </div>
          <div><h3 class="text-lg font-semibold text-slate-900">{isAniversariante ? '🎂 Aniversariante!' : 'Enviar Aviso'}</h3><p class="text-sm text-slate-500">{clienteNome}</p></div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          ariaLabel="Fechar aviso"
          class_name="h-10 w-10 !p-0 text-slate-400 hover:!bg-slate-100 hover:!text-slate-600"
          on:click={onClose}
        >
          <X size={20} />
        </Button>
      </div>

      <div class="p-6 overflow-y-auto max-h-[60vh] space-y-4">
        <div class="bg-slate-50 rounded-lg p-3 flex items-center gap-4 flex-wrap">
          <div class="flex items-center gap-2"><Phone size={16} class="text-slate-400" /><span class="text-sm text-slate-600">{clienteTelefone || 'Sem telefone'}</span></div>
          <div class="flex items-center gap-2"><Mail size={16} class="text-slate-400" /><span class="text-sm text-slate-600">{clienteEmail || 'Sem email'}</span></div>
        </div>

        <div>
          <p class="block text-sm font-medium text-slate-700 mb-2">Canal de Envio</p>
          <div class="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!clienteTelefone}
              class_name={`flex-1 justify-center gap-2.5 border-2 py-3 ${canalAtivo === 'whatsapp' ? 'border-green-500 bg-green-50 text-green-700 hover:!bg-green-50' : 'border-slate-200 bg-white text-slate-600'}`}
              on:click={() => canalAtivo = 'whatsapp'}
            >
              <MessageCircle size={20} />
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!clienteEmail}
              class_name={`flex-1 justify-center gap-2.5 border-2 py-3 ${canalAtivo === 'email' ? 'border-orange-500 bg-orange-50 text-orange-700 hover:!bg-orange-50' : 'border-slate-200 bg-white text-slate-600'}`}
              on:click={() => canalAtivo = 'email'}
            >
              <Mail size={20} />
              Email
            </Button>
          </div>
        </div>

        <div>
          <p class="block text-sm font-medium text-slate-700 mb-2">Template</p>
          {#if carregandoTemplates}
            <div class="text-center py-2"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-clientes-600 mx-auto"></div></div>
          {:else if erroTemplates}
            <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {erroTemplates}
            </div>
          {:else if templatesFiltrados.length === 0}
            <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Nenhum template ativo encontrado no CRM para seu escopo.
            </div>
          {:else}
            <div class="flex flex-wrap gap-2">
              {#each templatesFiltrados as template}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  class_name={templateSelecionado === template.id ? 'border-clientes-300 bg-clientes-100 text-clientes-700 hover:!bg-clientes-100' : 'text-slate-600'}
                  on:click={() => { templateSelecionado = template.id; aplicarTemplate(); }}
                >
                  {template.nome}
                </Button>
              {/each}
            </div>
          {/if}
        </div>

        {#if canalAtivo === 'email'}
          <FieldInput
            id="assunto-aviso"
            label="Assunto"
            value={assuntoAtual}
            readonly={true}
            class_name="w-full"
          />
        {/if}

        <div>
          <div class="mb-2 flex items-center justify-between">
            <label for="mensagem-aviso" class="block text-sm font-medium text-slate-700">Mensagem</label>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              class_name="!px-0 !py-0 text-xs text-clientes-600 hover:!bg-transparent hover:!text-clientes-800"
              on:click={copiarMensagem}
            >
              <Copy size={12} />
              Copiar
            </Button>
          </div>
          <FieldTextarea
            id="mensagem-aviso"
            bind:value={mensagemPersonalizada}
            rows={5}
            class_name="w-full"
            placeholder="Digite sua mensagem personalizada..."
          />
          <p class="text-xs text-slate-500 mt-1">Use {'{nome}'} para o primeiro nome ou {'{nome_completo}'} para o nome completo</p>
        </div>

        {#if mensagemPersonalizada}
          <div class="bg-slate-50 rounded-lg p-3"><p class="text-xs text-slate-500 mb-1">Preview:</p><p class="text-sm text-slate-700 whitespace-pre-wrap">{mensagemPersonalizada}</p></div>
        {/if}

        <div class="border-t border-slate-100 pt-4">
          <div class="flex items-center justify-between mb-2"><p class="text-sm font-medium text-slate-700">Últimos avisos</p>{#if carregandoHistorico}<span class="text-xs text-slate-500">Carregando...</span>{/if}</div>
          {#if historicoIndisponivel}
            <div class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">Histórico ainda indisponível no banco atual.</div>
          {:else if historico.length === 0}
            <div class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Nenhum aviso registrado para este cliente.</div>
          {:else}
            <div class="space-y-2">
              {#each historico as item}
                <div class="rounded-lg border border-slate-200 px-3 py-2">
                  <div class="flex items-center justify-between gap-2 text-xs"><span class="font-medium text-slate-700 uppercase">{item.canal}</span><span class="text-slate-500">{formatDate(item.created_at)}</span></div>
                  <p class="mt-1 text-sm font-medium text-slate-900">{item.assunto || 'Sem assunto'}</p>
                  <p class="mt-1 text-xs text-slate-600">{item.mensagem}</p>
                  <p class="mt-1 text-xs text-slate-500">Status: {getStatusLabel(item.status)}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="vtur-modal-footer vtur-modal-footer--between">
        <Button variant="secondary" on:click={onClose}>Cancelar</Button>
        <Button variant="primary" color={canalAtivo === 'whatsapp' ? 'green' : 'orange'} on:click={enviarMensagem} loading={enviando}><Send size={16} class="mr-2" />Enviar por {canalAtivo === 'whatsapp' ? 'WhatsApp' : 'Email'}</Button>
      </div>
    </div>
  </div>
{/if}
