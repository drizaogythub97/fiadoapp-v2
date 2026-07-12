-- 0005 — Preferências do ECOSSISTEMA Gaveta ⇄ Fiado (F6, estágio 1).
-- Tabela compartilhada pelos DOIS apps (prefixo próprio `ecossistema_`,
-- não pertence nem ao fiado_* nem às tabelas do Gaveta). Aditiva.
-- Toda ponte do ecossistema é OPT-IN: colunas nascem com default false.

create table if not exists public.ecossistema_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Estágio 1: atalho para abrir o outro app no header/menu.
  switcher_ativo boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.ecossistema_prefs enable row level security;

create policy "ecossistema_prefs_select_own"
  on public.ecossistema_prefs for select
  using (user_id = (select auth.uid()));

create policy "ecossistema_prefs_insert_own"
  on public.ecossistema_prefs for insert
  with check (user_id = (select auth.uid()));

create policy "ecossistema_prefs_update_own"
  on public.ecossistema_prefs for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "ecossistema_prefs_delete_own"
  on public.ecossistema_prefs for delete
  using (user_id = (select auth.uid()));
