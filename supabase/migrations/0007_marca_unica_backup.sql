-- 0007 — Ecossistema estágio 2 (continuação): backup da marca para o
-- "voltar ao anterior" ao DESATIVAR a marca única. Ao ativar, guardamos a
-- marca de cada app aqui; ao desativar, restauramos e limpamos. Aditiva.

alter table public.ecossistema_prefs
  add column if not exists bak_fiado_brand_name       text,
  add column if not exists bak_fiado_brand_logo_path  text,
  add column if not exists bak_gaveta_brand_name      text,
  add column if not exists bak_gaveta_brand_logo_path text;
