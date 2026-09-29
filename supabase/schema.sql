-- Arkano: esquema inicial para Supabase/PostgreSQL
-- Execute no SQL Editor do seu projeto Supabase.
-- O esquema inclui políticas RLS; valide-as antes de colocar o site em produção.

create extension if not exists pgcrypto;

create type public.account_role as enum ('master', 'player');
create type public.campaign_member_role as enum ('master', 'player');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Aventureiro',
  preferred_role public.account_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '',
  system text not null default 'D&D 5e',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.campaign_member_role not null default 'player',
  access_enabled boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Personagem sem nome',
  level integer not null default 1 check (level between 1 and 20),
  character_class text not null default '',
  race text not null default '',
  background text not null default '',
  alignment text not null default '',
  strength integer not null default 10,
  dexterity integer not null default 10,
  constitution integer not null default 10,
  intelligence integer not null default 10,
  wisdom integer not null default 10,
  charisma integer not null default 10,
  proficiency_bonus integer not null default 2,
  max_hp integer not null default 10,
  current_hp integer not null default 10,
  armor_class integer not null default 10,
  initiative integer not null default 0,
  speed integer not null default 30,
  inspiration boolean not null default false,
  hit_dice text not null default '1d8',
  skills jsonb not null default '[]'::jsonb,
  saving_throws jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_hp >= 0),
  check (max_hp >= 0)
);

create index campaigns_master_id_idx on public.campaigns(master_id);
create index campaign_members_user_id_idx on public.campaign_members(user_id);
create index characters_campaign_id_idx on public.characters(campaign_id);
create index characters_owner_id_idx on public.characters(owner_id);

-- Criar/atualizar perfil automaticamente após registro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, preferred_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Aventureiro'),
    case when new.raw_user_meta_data ->> 'preferred_role' = 'master'
      then 'master'::public.account_role
      else 'player'::public.account_role
    end
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      preferred_role = excluded.preferred_role;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.characters enable row level security;

-- Perfil: cada usuário vê/edita apenas o próprio perfil.
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Campanhas: mestre administra suas campanhas; jogadores veem campanhas das quais participam.
create policy "campaigns_select_members" on public.campaigns
for select to authenticated using (
  master_id = (select auth.uid()) or exists (
    select 1 from public.campaign_members cm
    where cm.campaign_id = id and cm.user_id = (select auth.uid()) and cm.access_enabled = true
  )
);
create policy "campaigns_insert_master" on public.campaigns
for insert to authenticated with check (master_id = (select auth.uid()));
create policy "campaigns_update_master" on public.campaigns
for update to authenticated using (master_id = (select auth.uid()))
with check (master_id = (select auth.uid()));
create policy "campaigns_delete_master" on public.campaigns
for delete to authenticated using (master_id = (select auth.uid()));

-- Membros: mestre da campanha controla membros; jogador pode ver sua própria associação.
create policy "members_select_self_or_master" on public.campaign_members
for select to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid())
  )
);
create policy "members_insert_master" on public.campaign_members
for insert to authenticated with check (
  exists (select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid()))
);
create policy "members_update_master" on public.campaign_members
for update to authenticated using (
  exists (select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid()))
) with check (
  exists (select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid()))
);
create policy "members_delete_master" on public.campaign_members
for delete to authenticated using (
  exists (select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid())
  ) or user_id = (select auth.uid())
);

-- Fichas: mestre da campanha pode administrar; dono da ficha pode visualizar/editar a própria.
create policy "characters_select_owner_or_master" on public.characters
for select to authenticated using (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid())
  ) or exists (
    select 1 from public.campaign_members cm
    where cm.campaign_id = campaign_id and cm.user_id = (select auth.uid()) and cm.access_enabled = true
  )
);
create policy "characters_insert_owner_or_master" on public.characters
for insert to authenticated with check (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid())
  )
);
create policy "characters_update_owner_or_master" on public.characters
for update to authenticated using (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid())
  )
) with check (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid())
  )
);
create policy "characters_delete_owner_or_master" on public.characters
for delete to authenticated using (
  owner_id = (select auth.uid()) or exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.master_id = (select auth.uid())
  )
);
