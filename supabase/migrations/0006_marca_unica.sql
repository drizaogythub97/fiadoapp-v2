-- 0006 — Ecossistema estágio 2: marca ÚNICA da loja (opt-in).
-- Com o toggle ligado, salvar a marca em qualquer app grava nos dois
-- (fiado_preferencias.brand_* e profiles.brand_*). Aditiva.

alter table public.ecossistema_prefs
  add column if not exists marca_unica boolean not null default false;
