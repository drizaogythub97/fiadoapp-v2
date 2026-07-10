-- =====================================================================
-- Fiado v2 — 0003: limite de crédito PADRÃO (F4d-3 Preferências)
--
-- ⚠️ Banco COMPARTILHADO com o Gaveta — migration aditiva: só recria a
-- função fiado_clientes_com_saldo (nossa, criada na 0002).
--
-- Semântica (paridade v1): fiado_preferencias.limite_credito_padrao vale
-- para clientes SEM limite individual; o limite do cliente sobrepõe o
-- padrão. Continua NUNCA bloqueando venda (decisão do dono na F2) — só
-- alimenta o alerta ao vender e o badge persistente.
--
-- `limite_efetivo` é coluna nova no retorno → o tipo de retorno muda e
-- CREATE OR REPLACE não basta: DROP + CREATE no mesmo arquivo (o script
-- de aplicação roda o arquivo inteiro numa única transação).
-- =====================================================================

drop function if exists public.fiado_clientes_com_saldo();

create function public.fiado_clientes_com_saldo()
returns table (
  id uuid,
  nome text,
  sobrenome text,
  referencia text,
  telefone text,
  limite_credito numeric,
  limite_efetivo numeric,
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
    coalesce(c.limite_credito, p.limite_credito_padrao) as limite_efetivo,
    coalesce(sum(v.valor_total - v.valor_pago) filter (where v.status <> 'PAGA'), 0)::numeric(12,2)
      as saldo_devedor,
    count(v.id) filter (where v.status <> 'PAGA') as total_ativas,
    count(v.id) filter (where v.status = 'PAGA') as total_pagas,
    coalesce(
      bool_or(v.status <> 'PAGA' and v.data_vencimento < current_date),
      false
    ) as inadimplente,
    case
      when coalesce(c.limite_credito, p.limite_credito_padrao) is null then false
      else coalesce(sum(v.valor_total - v.valor_pago) filter (where v.status <> 'PAGA'), 0)
             > coalesce(c.limite_credito, p.limite_credito_padrao)
    end as acima_limite
  from public.fiado_clientes c
  left join public.fiado_preferencias p
    on p.user_id = c.user_id
  left join public.fiado_vendas v
    on v.cliente_id = c.id and v.user_id = c.user_id
  where c.user_id = auth.uid()
  group by c.id, p.limite_credito_padrao
  order by lower(c.nome), lower(coalesce(c.sobrenome, ''));
$$;
