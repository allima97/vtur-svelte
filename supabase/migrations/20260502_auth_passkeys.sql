-- Passkeys WebAuthn para login sem senha.
-- As credenciais ficam vinculadas ao auth.users e sao usadas somente por rotas server-side.

create table if not exists public.auth_passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  name text not null default 'Passkey',
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports jsonb not null default '[]'::jsonb,
  device_type text,
  backed_up boolean not null default false,
  aaguid text,
  origin text,
  rp_id text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_passkeys_user_id on public.auth_passkeys(user_id);
create index if not exists idx_auth_passkeys_user_email on public.auth_passkeys(lower(user_email));

create table if not exists public.auth_passkey_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('registration', 'authentication')),
  challenge text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_passkey_challenges_lookup
  on public.auth_passkey_challenges(id, type, expires_at)
  where used_at is null;

alter table public.auth_passkeys enable row level security;
alter table public.auth_passkey_challenges enable row level security;

drop policy if exists "auth_passkeys_select_own" on public.auth_passkeys;
create policy "auth_passkeys_select_own"
  on public.auth_passkeys
  for select
  using (auth.uid() = user_id);

drop policy if exists "auth_passkeys_delete_own" on public.auth_passkeys;
create policy "auth_passkeys_delete_own"
  on public.auth_passkeys
  for delete
  using (auth.uid() = user_id);

drop trigger if exists set_auth_passkeys_updated_at on public.auth_passkeys;
create trigger set_auth_passkeys_updated_at
  before update on public.auth_passkeys
  for each row
  execute function public.set_updated_at();
