-- =====================================================================
-- Fiado v2 — 0009: origem da venda + toggle "Fiado no PDV" (F6, Fase 1)
--
-- ⚠️ Banco COMPARTILHADO com o Gaveta. Duas adições aditivas, ambas do
-- lado do Fiado (tabelas fiado_* e ecossistema_prefs — nossas):
--
-- 1. fiado_vendas.origem: de qual app a venda a prazo nasceu. Default
--    'fiado' (todas as vendas atuais e as criadas pelo próprio FiadoApp).
--    A RPC-ponte do Gaveta marca 'gaveta' nas vendas lançadas pelo caixa.
--    Usada só para a BADGE visual "registrada com Gaveta" (sem link).
--
-- 2. ecossistema_prefs.fiado_pdv_ativo: toggle opt-in da ponte "Fiado no
--    PDV" (default false, como toda ponte). O caixa do Gaveta só oferece
--    a forma de pagamento "Venda a Prazo (Fiado)" quando isto está true,
--    e a RPC-ponte confere a flag como guarda de servidor.
--
-- Esta migration é aplicada ao banco ANTES da migration do Gaveta, que
-- cria a RPC-ponte referenciando estas duas colunas.
-- =====================================================================

alter table public.fiado_vendas
  add column if not exists origem text not null default 'fiado'
    check (origem in ('fiado', 'gaveta'));

alter table public.ecossistema_prefs
  add column if not exists fiado_pdv_ativo boolean not null default false;
