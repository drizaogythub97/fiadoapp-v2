-- =====================================================================
-- Fiado v2 — 0002: RPC de listagem de clientes com agregados no banco
--
-- ⚠️ Banco COMPARTILHADO com o Gaveta — migration 100% aditiva (só cria
-- uma função fiado_*).
--
-- A consulta de clientes (F4a) e a busca rápida do painel precisam de
-- saldo devedor + contagens por cliente. Agregar no banco evita o cap de
-- 1000 linhas do PostgREST (seria 1 linha por VENDA se fosse embed) e
-- devolve 1 linha por CLIENTE.
--
-- Flags derivadas:
--   inadimplente  = tem venda aberta com vencimento estourado
--   acima_limite  = saldo devedor > limite_credito (decisão do dono na
--                   F2: NUNCA bloqueia — vira badge persistente na UI)
-- =====================================================================

create or replace function public.fiado_clientes_com_saldo()
returns table (
  id uuid,
  nome text,
  sobrenome text,
  referencia text,
  telefone text,
  limite_credito numeric,
  saldo_devedor numeric,
  total_ativas bigint,
  total_pagas bigint,
  inadimplente boolean,
  acima_limite boolean
)
language sql
stable
security invoker  -- RLS continua valendo; auth.uid() é defesa em profundidade
set search_path = ''
as $$
  select
    c.id,
    c.nome,
    c.sobrenome,
    c.referencia,
    c.telefone,
    c.limite_credito,
    coalesce(sum(v.valor_total - v.valor_pago) filter (where v.status <> 'PAGA'), 0)::numeric(12,2)
      as saldo_devedor,
    count(v.id) filter (where v.status <> 'PAGA') as total_ativas,
    count(v.id) filter (where v.status = 'PAGA') as total_pagas,
    coalesce(
      bool_or(v.status <> 'PAGA' and v.data_vencimento < current_date),
      false
    ) as inadimplente,
    case
      when c.limite_credito is null then false
      else coalesce(sum(v.valor_total - v.valor_pago) filter (where v.status <> 'PAGA'), 0)
             > c.limite_credito
    end as acima_limite
  from public.fiado_clientes c
  left join public.fiado_vendas v
    on v.cliente_id = c.id and v.user_id = c.user_id
  where c.user_id = auth.uid()
  group by c.id
  order by lower(c.nome), lower(coalesce(c.sobrenome, ''));
$$;
