-- =====================================================================
-- Fiado v2 — 0004: marca da loja NATIVA do FiadoApp (correção de rota
-- do dono, 2026-07-09)
--
-- ⚠️ Banco COMPARTILHADO com o Gaveta — migration aditiva: só adiciona
-- colunas à fiado_preferencias (nossa).
--
-- Decisão de estratégia do ecossistema: os apps são AUTÔNOMOS. A marca
-- do Fiado vive aqui (não em profiles/Gaveta). A "marca compartilhada"
-- entre os apps virá como integração OPT-IN em fase futura (F6).
-- O bucket de Storage `brand-logos` é infra compartilhada e invisível:
-- cada app grava seus próprios arquivos sob {user_id}/ (o Fiado usa o
-- prefixo de arquivo fiado-*).
-- =====================================================================

alter table public.fiado_preferencias
  add column if not exists brand_name text
    check (brand_name is null or char_length(brand_name) <= 60),
  add column if not exists brand_logo_path text;
