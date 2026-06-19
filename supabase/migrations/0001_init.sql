-- Acessor Digital - Supabase base schema
-- Core entities for cockpit, compliance and Meta-ready operations.

create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  cnpj text,
  business_hours jsonb not null default '{}'::jsonb,
  billing_plan text not null default 'Mensal',
  credits_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('PDF', 'TXT', 'MD', 'Texto', 'Scraper')),
  title text not null,
  content text,
  status text not null default 'Indexado' check (status in ('Indexado', 'Processando', 'Erro')),
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  channel text not null,
  ai_score integer not null default 0 check (ai_score between 0 and 100),
  status text not null default 'lead' check (status in ('lead', 'hot', 'active', 'cold')),
  tags text[] not null default '{}'::text[],
  last_message_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null default 'Aberta' check (status in ('Aberta', 'Resolvida', 'Humano')),
  ai_paused boolean not null default false,
  last_message_at timestamptz,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  stage text not null default 'Prospecção' check (stage in ('Prospecção', 'Qualificado', 'Proposta', 'Negociação', 'Fechado')),
  value numeric(12,2) not null default 0,
  owner_name text,
  source text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null,
  name text not null,
  is_active boolean not null default true,
  trigger_count integer not null default 0,
  conversion_rate numeric(5,2) not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author text not null default 'system',
  note text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.changelog_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  source text not null default 'manual',
  event_type text not null,
  title text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_workspace on public.knowledge_base (workspace_id, updated_at desc);
create index if not exists idx_contacts_workspace on public.contacts (workspace_id, updated_at desc);
create index if not exists idx_conversations_contact on public.conversations (contact_id, updated_at desc);
create index if not exists idx_deals_contact on public.deals (contact_id, updated_at desc);
create index if not exists idx_automations_workspace on public.automations (workspace_id, updated_at desc);
create index if not exists idx_session_notes_workspace on public.session_notes (workspace_id, created_at desc);
create index if not exists idx_changelog_workspace on public.changelog_events (workspace_id, created_at desc);

alter table public.workspaces enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.deals enable row level security;
alter table public.automations enable row level security;
alter table public.session_notes enable row level security;
alter table public.changelog_events enable row level security;

create policy "workspace select own rows" on public.workspaces
  for select using (true);

create policy "allow all on cockpit tables" on public.knowledge_base
  for all using (true) with check (true);

create policy "allow all on cockpit contacts" on public.contacts
  for all using (true) with check (true);

create policy "allow all on cockpit conversations" on public.conversations
  for all using (true) with check (true);

create policy "allow all on cockpit deals" on public.deals
  for all using (true) with check (true);

create policy "allow all on cockpit automations" on public.automations
  for all using (true) with check (true);

create policy "allow all on cockpit session notes" on public.session_notes
  for all using (true) with check (true);

create policy "allow all on cockpit changelog" on public.changelog_events
  for all using (true) with check (true);
