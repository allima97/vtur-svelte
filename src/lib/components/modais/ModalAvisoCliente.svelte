<script lang="ts">
  import { X, MessageCircle, Mail, Send, Phone, Copy } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
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

  function getTemplatesFallback() {
    return [
      { id: '1', nome: 'Aniversario', tipo: 'aniversario', assunto: 'Feliz aniversario, {nome}', conteudo: 'Feliz aniversario {nome}! Desejamos um dia incrivel e muitas viagens maravilhosas!' },
      { id: '2', nome: 'Follow-up padrao', tipo: 'follow_up', assunto: 'Seguimento VTUR', conteudo: 'Ola {nome}, tudo bem? Estamos entrando em contato sobre seu orcamento. Podemos conversar?' },
      { id: '3', nome: 'Promocao', tipo: 'promocao', assunto: 'Promocao especial para voce', conteudo: 'Oi {nome}! Temos uma promocao exclusiva para voce. Entre em contato conosco.' }
    ];
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
    try {
      const response = await fetch('/api/v1/clientes/avisos/templates');
      if (response.ok) {
        const data = await response.json();
        templates = Array.isArray(data?.items) && data.items.length > 0 ? data.items : getTemplatesFallback();
      } else {
        templates = getTemplatesFallback();
      }
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      templates = getTemplatesFallback();
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
  <div class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" on:click={onClose} on:keydown={(event) => event.key === 'Escape' && onClose()} role="dialog" aria-modal="true" tabindex="-1">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" on:click|stopPropagation role="document">
      <div class="flex items-center justify-between p-4 border-b border-slate-100" class:bg-pink-50={isAniversariante} class:bg-clientes-50={!isAniversariante}>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" class:bg-pink-100={isAniversariante} class:bg-clientes-100={!isAniversariante}>
            {#if isAniversariante}<span class="text-2xl">🎉</span>{:else}<MessageCircle size={24} class="text-clientes-600" />{/if}
          </div>
          <div><h3 class="text-lg font-semibold text-slate-900">{isAniversariante ? '🎂 Aniversariante!' : 'Enviar Aviso'}</h3><p class="text-sm text-slate-500">{clienteNome}</p></div>
        </div>
        <button on:click={onClose} class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={20} /></button>
      </div>

      <div class="p-6 overflow-y-auto max-h-[60vh] space-y-4">
        <div class="bg-slate-50 rounded-lg p-3 flex items-center gap-4 flex-wrap">
          <div class="flex items-center gap-2"><Phone size={16} class="text-slate-400" /><span class="text-sm text-slate-600">{clienteTelefone || 'Sem telefone'}</span></div>
          <div class="flex items-center gap-2"><Mail size={16} class="text-slate-400" /><span class="text-sm text-slate-600">{clienteEmail || 'Sem email'}</span></div>
        </div>

        <div>
          <p class="block text-sm font-medium text-slate-700 mb-2">Canal de Envio</p>
          <div class="flex gap-2">
            <button type="button" on:click={() => canalAtivo = 'whatsapp'} disabled={!clienteTelefone} class="flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 {canalAtivo === 'whatsapp' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600'} {(!clienteTelefone) ? 'opacity-50 cursor-not-allowed' : ''}"><MessageCircle size={20} />WhatsApp</button>
            <button type="button" on:click={() => canalAtivo = 'email'} disabled={!clienteEmail} class="flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 {canalAtivo === 'email' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600'} {(!clienteEmail) ? 'opacity-50 cursor-not-allowed' : ''}"><Mail size={20} />Email</button>
          </div>
        </div>

        <div>
          <p class="block text-sm font-medium text-slate-700 mb-2">Template</p>
          {#if carregandoTemplates}
            <div class="text-center py-2"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-clientes-600 mx-auto"></div></div>
          {:else}
            <div class="flex flex-wrap gap-2">
              {#each templatesFiltrados as template}
                <button type="button" on:click={() => { templateSelecionado = template.id; aplicarTemplate(); }} class="px-3 py-2 text-sm rounded-lg border transition-colors {templateSelecionado === template.id ? 'bg-clientes-100 border-clientes-300 text-clientes-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}">{template.nome}</button>
              {/each}
            </div>
          {/if}
        </div>

        {#if canalAtivo === 'email'}
          <div><label for="assunto-aviso" class="block text-sm font-medium text-slate-700 mb-2">Assunto</label><input id="assunto-aviso" class="vtur-input w-full" value={assuntoAtual} readonly /></div>
        {/if}

        <div>
          <div class="flex items-center justify-between mb-2"><label for="mensagem-aviso" class="block text-sm font-medium text-slate-700">Mensagem</label><button type="button" on:click={copiarMensagem} class="text-xs text-clientes-600 hover:text-clientes-800 flex items-center gap-1"><Copy size={12} />Copiar</button></div>
          <textarea id="mensagem-aviso" bind:value={mensagemPersonalizada} rows="5" class="vtur-input w-full" placeholder="Digite sua mensagem personalizada..."></textarea>
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

      <div class="flex items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
        <Button variant="secondary" on:click={onClose}>Cancelar</Button>
        <Button variant="primary" color={canalAtivo === 'whatsapp' ? 'green' : 'orange'} on:click={enviarMensagem} loading={enviando}><Send size={16} class="mr-2" />Enviar por {canalAtivo === 'whatsapp' ? 'WhatsApp' : 'Email'}</Button>
      </div>
    </div>
  </div>
{/if}
