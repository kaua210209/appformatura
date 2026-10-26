-- Execute no SQL Editor do Supabase se for habilitar projetos e sincronização.
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Minha formatura',
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  position integer not null default 0,
  name text not null,
  nickname text,
  color text,
  emoji text default '🎓',
  group_name text,
  notes text,
  audio_path text,
  start_sec numeric not null default 0,
  end_sec numeric not null default 0,
  fade_in numeric not null default 0.5,
  fade_out numeric not null default 1,
  volume integer not null default 85 check (volume between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.entries enable row level security;
alter table public.share_links enable row level security;

create policy "Owners manage their projects" on public.projects for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners manage entries in their projects" on public.entries for all to authenticated
using (exists (select 1 from public.projects p where p.id = entries.project_id and p.owner_id = auth.uid()))
with check (exists (select 1 from public.projects p where p.id = entries.project_id and p.owner_id = auth.uid()));
create policy "Owners manage share links" on public.share_links for all to authenticated
using (exists (select 1 from public.projects p where p.id = share_links.project_id and p.owner_id = auth.uid()))
with check (exists (select 1 from public.projects p where p.id = share_links.project_id and p.owner_id = auth.uid()));

-- Áudios privados: organize os objetos como <user-id>/<project-id>/<filename>.
insert into storage.buckets (id, name, public) values ('audio', 'audio', false) on conflict (id) do nothing;
create policy "Owners can upload audio to their own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners can read their own audio" on storage.objects for select to authenticated
using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners can update their own audio" on storage.objects for update to authenticated
using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners can delete their own audio" on storage.objects for delete to authenticated
using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
