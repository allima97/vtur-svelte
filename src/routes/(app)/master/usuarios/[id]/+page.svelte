<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/db/supabase';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { FieldInput, FieldSelect, FieldCheckbox } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { KeyRound, Mail, RefreshCw, ShieldAlert, ShieldCheck, Users } from 'lucide-svelte';

  type Option = {
    id: string;
    name?: string;
    nome?: string;
    nome_completo?: string;
    description?: string | null;
    nome_fantasia?: string | null;
  };

  const emptyForm = {
    id: '',
    nome_completo: '',
    email: '',
    password: '',
    user_type_id: '',
    company_id: '',
    uso_individual: false,
    active: true,
    participa_ranking: false
  };

  let loading = true;
  let saving = false;
  let userForm = { ...emptyForm };
  let userMeta: any = null;
  let permissionsSummary: any[] = [];
  let defaultPermissionsSummary: any[] = [];
  let userTypes: Option[] = [];
  let companies: Option[] = [];
  let avisoTemplates: any[] = [];
  let mfaStatus: { enabled: boolean; verified_count: number; factor_count: number } | null = null;
  let showAvisoDialog = false;
  let showSenhaDialog = false;
  let showMfaDialog = false;
  let avisoTemplateId = '';
  let novaSenha = '';
  let confirmarSenha = '';
  let lastLoadedId = '';

  $: isCreateMode = $page.params.id === 'novo';
  $: currentId = $page.params.id;

  function formatDateTime(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  async function ensureServerSessionCookie() {
    if (!browser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
      });
    } catch {
      // Falha silenciosa: o carregamento tratará 401 explicitamente.
    }
  }

  async function loadCreateReference() {
    await ensureServerSessionCookie();
    const [typesResponse, companiesResponse, templatesResponse] = await Promise.all([
      fetch('/api/v1/admin/tipos-usuario'),
      fetch('/api/v1/admin/empresas'),
      fetch('/api/v1/admin/avisos')
    ]);

    if (!typesResponse.ok) throw new Error(await typesResponse.text());
    if (!companiesResponse.ok) throw new Error(await companiesResponse.text());
    if (!templatesResponse.ok) throw new Error(await templatesResponse.text());

    const [typesPayload, companiesPayload, templatesPayload] = await Promise.all([
      typesResponse.json(),
      companiesResponse.json(),
      templatesResponse.json()
    ]);

    userTypes = typesPayload.items || [];
    companies = companiesPayload.items || [];
    avisoTemplates = templatesPayload.items || [];
    userForm = { ...emptyForm };
    userMeta = null;
    permissionsSummary = [];
    defaultPermissionsSummary = [];
    mfaStatus = null;
  }

  async function loadMfaStatus(userId: string) {
    const response = await fetch('/api/v1/admin/auth/mfa-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: [userId] })
    });

    if (!response.ok) {
      mfaStatus = null;
      return;
    }

    const payload = await response.json();
    mfaStatus = payload?.statuses?.[userId] || null;
  }

  async function loadDetail() {
    loading = true;
    try {
      if (isCreateMode) {
        await loadCreateReference();
      } else {
        await ensureServerSessionCookie();
        const response = await fetch(`/api/v1/admin/usuarios/${currentId}`);
        if (!response.ok) {
          const message = (await response.text()) || 'Nao foi possivel carregar o detalhe do usuario.';
          if (response.status === 401) {
            toast.error('Sessão expirada. Faça login novamente para continuar.');
            const next = `${$page.url.pathname}${$page.url.search}`;
            await goto(`/auth/login?next=${encodeURIComponent(next)}`);
            return;
          }
          if (response.status === 403) {
            toast.error(message || 'Você não tem permissão para acessar este usuário.');
            await goto('/master/usuarios');
            return;
          }
          if (response.status === 404) {
            toast.error(message || 'Usuário não encontrado.');
            await goto('/master/usuarios');
            return;
          }
          throw new Error(message);
        }
        const payload = await response.json();

        userMeta = payload.user;
        permissionsSummary = payload.permissions || [];
        defaultPermissionsSummary = payload.default_permissions || [];
        userTypes = payload.available?.user_types || [];
        companies = payload.available?.companies || [];
        avisoTemplates = payload.available?.aviso_templates || [];

        userForm = {
          id: payload.user.id,
          nome_completo: payload.user.nome || '',
          email: payload.user.email || '',
          password: '',
          user_type_id: payload.user.tipo_id || '',
          company_id: payload.user.empresa_id || '',
          uso_individual: Boolean(payload.user.uso_individual),
          active: Boolean(payload.user.ativo),
          participa_ranking: Boolean(payload.user.participa_ranking)
        };

        await loadMfaStatus(payload.user.id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Nao foi possivel carregar o detalhe do usuario.');
    } finally {
      loading = false;
    }
  }

  async function saveUser() {
    saving = true;
    try {
      if (!userForm.nome_completo.trim()) {
        throw new Error('Informe o nome completo.');
      }

      if (!userForm.email.trim()) {
        throw new Error('Informe o e-mail do usuario.');
      }

      if (!userForm.user_type_id) {
        throw new Error('Selecione o tipo de usuario.');
      }

      if (!userForm.uso_individual && !userForm.company_id) {
        throw new Error('Selecione a empresa do usuario.');
      }

      if (isCreateMode && !userForm.password.trim()) {
        throw new Error('Defina a senha inicial do usuario.');
      }

      if (isCreateMode && userForm.uso_individual) {
        throw new Error('O escopo master nao pode criar usuario individual sem empresa.');
      }

      const response = await fetch('/api/v1/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isCreateMode ? undefined : userForm.id,
          nome_completo: userForm.nome_completo,
          email: userForm.email,
          password: isCreateMode ? userForm.password : undefined,
          user_type_id: userForm.user_type_id,
          company_id: userForm.uso_individual ? null : userForm.company_id,
          uso_individual: userForm.uso_individual,
          active: userForm.active,
          participa_ranking: userForm.participa_ranking
        })
      });

      if (!response.ok) throw new Error(await response.text());

      const payload = await response.json();
      toast.success(isCreateMode ? 'Usuario criado com sucesso.' : 'Usuario atualizado com sucesso.');

      if (isCreateMode && payload.id) {
        await goto(`/master/usuarios/${payload.id}`);
      } else {
        await loadDetail();
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar usuario.');
    } finally {
      saving = false;
    }
  }

  async function sendAviso() {
    try {
      const response = await fetch('/api/v1/admin/avisos/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userForm.id,
          template_id: avisoTemplateId
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Aviso disparado com sucesso.');
      showAvisoDialog = false;
      avisoTemplateId = '';
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar aviso.');
    }
  }

  async function redefineSenha() {
    try {
      if (!novaSenha.trim() || novaSenha.length < 6) {
        throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
      }
      if (novaSenha !== confirmarSenha) {
        throw new Error('A confirmacao da senha nao confere.');
      }

      const response = await fetch('/api/v1/admin/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userForm.id,
          password: novaSenha,
          confirm_email: true
        })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('Senha atualizada com sucesso.');
      showSenhaDialog = false;
      novaSenha = '';
      confirmarSenha = '';
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao redefinir senha.');
    }
  }

  async function resetarMfa() {
    try {
      const response = await fetch('/api/v1/admin/auth/reset-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userForm.id })
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success('2FA resetado com sucesso.');
      showMfaDialog = false;
      await loadMfaStatus(userForm.id);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao resetar 2FA.');
    }
  }

  $: if ($page.params.id && $page.params.id !== lastLoadedId) {
    lastLoadedId = $page.params.id;
    loadDetail();
  }
</script>

<svelte:head>
  <title>{isCreateMode ? 'Novo usuario' : 'Usuario'} | Master | VTUR</title>
</svelte:head>

<PageHeader
  title={isCreateMode ? 'Novo usuario' : userMeta?.nome || 'Usuario'}
  subtitle={isCreateMode
    ? 'Cadastro do escopo master com papel, empresa, escopo e senha inicial.'
    : 'Edicao do usuario no escopo master, com acoes de acesso e seguranca.'}
  breadcrumbs={[
    { label: 'Master', href: '/master' },
    { label: 'Usuarios', href: '/master/usuarios' },
    { label: isCreateMode ? 'Novo' : userMeta?.nome || 'Detalhe' }
  ]}
  actions={
    isCreateMode
      ? []
      : [
          { label: 'Atualizar', onClick: loadDetail, variant: 'secondary', icon: RefreshCw },
          { label: 'Permissoes', href: `/master/permissoes/${currentId}`, variant: 'secondary', icon: ShieldCheck }
        ]
  }
/>

<div class="space-y-6">
  {#if !isCreateMode}
    <div class="grid gap-4 md:grid-cols-4">
      <Card color="financeiro">
        <p class="text-sm text-slate-500">Perfil</p>
        <p class="mt-2 text-lg font-semibold text-slate-900">{userMeta?.tipo || '-'}</p>
      </Card>
      <Card color="financeiro">
        <p class="text-sm text-slate-500">Empresa</p>
        <p class="mt-2 text-lg font-semibold text-slate-900">{userMeta?.empresa || 'Sem empresa'}</p>
      </Card>
      <Card color="financeiro">
        <p class="text-sm text-slate-500">Permissoes ativas</p>
        <p class="mt-2 text-lg font-semibold text-slate-900">
          {permissionsSummary.filter((item) => item.ativo).length}
        </p>
      </Card>
      <Card color="financeiro">
        <p class="text-sm text-slate-500">MFA</p>
        <p class="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
          {#if mfaStatus?.enabled}
            <Badge color="green">Ativo</Badge>
          {:else}
            <Badge color="gray">Nao configurado</Badge>
          {/if}
        </p>
      </Card>
    </div>
  {/if}

  <Card color="financeiro" title="Cadastro administrativo">
    <div class="grid gap-4 lg:grid-cols-2">
      <FieldInput id="usuario-nome" label="Nome completo" bind:value={userForm.nome_completo} class_name="w-full" />
      <FieldInput id="usuario-email" label="E-mail" type="email" bind:value={userForm.email} class_name="w-full" />
      {#if isCreateMode}
        <FieldInput id="usuario-senha" label="Senha inicial" type="password" bind:value={userForm.password} class_name="w-full" />
      {/if}
      <FieldSelect
        id="usuario-tipo"
        label="Tipo de usuario"
        bind:value={userForm.user_type_id}
        options={userTypes.map((t) => ({ value: t.id, label: t.nome || t.name || '' }))}
        placeholder="Selecione uma opção"
        class_name="w-full"
      />
      <FieldSelect
        id="usuario-empresa"
        label="Empresa"
        bind:value={userForm.company_id}
        options={companies.map((c) => ({ value: c.id, label: c.nome_fantasia || c.nome || c.name || '' }))}
        placeholder="Selecione uma opção"
        disabled={!isCreateMode && userForm.uso_individual}
        class_name="w-full"
      />
      {#if isCreateMode}
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="font-medium text-slate-900">Empresa obrigatoria no cadastro master</p>
          <p class="text-sm text-slate-500">Usuarios novos no escopo master devem ser vinculados a uma empresa.</p>
        </div>
      {:else}
        <FieldCheckbox
          label="Uso individual"
          helper="Remove o vinculo corporativo com empresa."
          bind:checked={userForm.uso_individual}
          color="financeiro"
          class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
        />
      {/if}
      <FieldCheckbox
        label="Usuario ativo"
        helper="Controla acesso imediato ao sistema."
        bind:checked={userForm.active}
        color="financeiro"
        class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
      />
      <FieldCheckbox
        label="Participa do ranking"
        helper="Inclui o usuario nos indicadores competitivos."
        bind:checked={userForm.participa_ranking}
        color="financeiro"
        class_name="rounded-xl border border-slate-200 bg-white px-4 py-4"
      />
    </div>

    {#if !isCreateMode}
      <div class="mt-6 grid gap-4 md:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm text-slate-500">Criado em</p>
          <p class="mt-2 font-medium text-slate-900">{formatDateTime(userMeta?.created_at)}</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm text-slate-500">Ultima atualizacao</p>
          <p class="mt-2 font-medium text-slate-900">{formatDateTime(userMeta?.updated_at)}</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm text-slate-500">Escopo</p>
          <p class="mt-2 font-medium text-slate-900">
            {#if userMeta?.uso_individual}
              Individual
            {:else if userMeta?.created_by_gestor}
              Equipe criada por gestor
            {:else}
              Corporativo
            {/if}
          </p>
        </div>
      </div>
    {/if}

    <div class="mt-6 flex flex-wrap gap-3">
      <Button variant="secondary" href="/master/usuarios">Voltar</Button>
      <Button variant="primary" color="financeiro" on:click={saveUser} loading={saving}>
        Salvar usuario
      </Button>
    </div>
  </Card>

  {#if !isCreateMode}
    <div class="grid gap-6 xl:grid-cols-2">
      <Card color="financeiro" title="Permissoes aplicadas">
        <div class="space-y-3">
          {#each permissionsSummary.filter((item) => item.ativo).slice(0, 8) as item}
            <div class="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p class="font-medium text-slate-900">{item.label}</p>
                <p class="text-xs text-slate-500">{item.modulo}</p>
              </div>
              <Badge color="blue">{item.permissao}</Badge>
            </div>
          {/each}

          {#if permissionsSummary.filter((item) => item.ativo).length === 0}
            <p class="text-sm text-slate-500">Nenhuma permissao ativa encontrada.</p>
          {/if}

          <Button variant="secondary" href={`/master/permissoes/${currentId}`}>Abrir editor completo</Button>
        </div>
      </Card>

      <Card color="financeiro" title="Acoes administrativas">
        <div class="space-y-3">
          <Button
            variant="outline"
            color="financeiro"
            class_name="w-full !justify-between !rounded-xl !border-slate-200 !p-4 !text-left hover:!border-orange-300 hover:!bg-orange-50/40"
            on:click={() => (showAvisoDialog = true)}
          >
            <div class="flex items-center gap-3">
              <Mail size={18} class="text-orange-600" />
              <div>
                <p class="font-medium text-slate-900">Enviar aviso administrativo</p>
                <p class="text-sm text-slate-500">Usa templates ativos do modulo de avisos.</p>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            color="financeiro"
            class_name="w-full !justify-between !rounded-xl !border-slate-200 !p-4 !text-left hover:!border-orange-300 hover:!bg-orange-50/40"
            on:click={() => (showSenhaDialog = true)}
          >
            <div class="flex items-center gap-3">
              <KeyRound size={18} class="text-orange-600" />
              <div>
                <p class="font-medium text-slate-900">Redefinir senha</p>
                <p class="text-sm text-slate-500">Atualiza a senha diretamente no Auth.</p>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            color="financeiro"
            class_name="w-full !justify-between !rounded-xl !border-slate-200 !p-4 !text-left hover:!border-orange-300 hover:!bg-orange-50/40"
            on:click={() => (showMfaDialog = true)}
          >
            <div class="flex items-center gap-3">
              <ShieldAlert size={18} class="text-orange-600" />
              <div>
                <p class="font-medium text-slate-900">Resetar 2FA</p>
                <p class="text-sm text-slate-500">Remove fatores ativos e obriga nova configuracao.</p>
              </div>
            </div>
            {#if mfaStatus?.enabled}
              <Badge color="green">Ativo</Badge>
            {:else}
              <Badge color="gray">Nao configurado</Badge>
            {/if}
          </Button>
        </div>
      </Card>
    </div>
  {/if}
</div>

<Dialog
  bind:open={showAvisoDialog}
  title="Enviar aviso administrativo"
  size="md"
  showConfirm={true}
  confirmText="Enviar aviso"
  onConfirm={sendAviso}
>
  <div class="space-y-4">
    <FieldSelect
      id="aviso-template"
      label="Template"
      bind:value={avisoTemplateId}
      options={avisoTemplates.map((t) => ({ value: t.id, label: t.nome || '' }))}
      placeholder="Selecione uma opção"
      class_name="w-full"
    />
    <p class="text-sm text-slate-500">
      O envio usa as configuracoes globais de e-mail do sistema e aplica as variaveis do usuario atual.
    </p>
  </div>
</Dialog>

<Dialog
  bind:open={showSenhaDialog}
  title="Redefinir senha"
  size="md"
  showConfirm={true}
  confirmText="Salvar senha"
  onConfirm={redefineSenha}
>
  <div class="space-y-4">
    <FieldInput id="nova-senha" label="Nova senha" type="password" bind:value={novaSenha} class_name="w-full" />
    <FieldInput id="confirmar-senha" label="Confirmacao" type="password" bind:value={confirmarSenha} class_name="w-full" />
  </div>
</Dialog>

<Dialog
  bind:open={showMfaDialog}
  title="Resetar 2FA"
  size="sm"
  showConfirm={true}
  confirmText="Resetar 2FA"
  confirmVariant="danger"
  onConfirm={resetarMfa}
>
  <p class="text-sm text-slate-600">
    Esta acao remove todos os fatores MFA do usuario e exige configuracao novamente no proximo acesso.
  </p>
</Dialog>
