-- =====================================================================
-- Fiado v2 — 0008: valor parcial nas VENDAS SELECIONADAS
--
-- ⚠️ Banco COMPARTILHADO com o Gaveta — migration aditiva: só recria a
-- função fiado_registrar_pagamento (nossa, da 0001). Sem mudar assinatura
-- → `create or replace` basta (não precisa drop).
--
-- Contexto (F6, preparação da ponte "Fiado no PDV"): o financeiro do
-- Gaveta vai refletir o valor REALMENTE pago das vendas a prazo. Para o
-- dono ter controle manual de para onde o pagamento vai, o modo "vendas
-- selecionadas" passa a aceitar um VALOR opcional, distribuído em cascata
-- (mais antiga primeiro) APENAS entre as vendas selecionadas.
--
-- Antes: os três modos eram exclusivos —
--   1. total:        p_valor null, p_venda_ids null   → quita tudo
--   2. selecionadas: p_valor null, p_venda_ids set    → quita cada uma
--   3. valor:        p_valor set,  p_venda_ids null    → cascata em todas
-- e passar valor + seleção juntos era ERRO.
--
-- Agora: passar p_valor + p_venda_ids juntos é o modo 4 —
--   4. valor nas selecionadas: cascata do valor SÓ entre as selecionadas.
-- O laço já filtrava por `id = any(p_venda_ids)` e já distribuía
-- `v_restante` do mais antigo ao mais novo; a única barreira era o guarda
-- de exclusão mútua. Retrocompatível: modos 1/2/3 não passam os dois
-- parâmetros juntos, então o caminho de código deles é idêntico.
-- =====================================================================

create or replace function public.fiado_registrar_pagamento(
  p_cliente_id uuid,
  p_valor numeric default null,
  p_venda_ids uuid[] default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user        uuid := auth.uid();
  v_now         timestamptz := now();
  v_restante    numeric(10,2);          -- saldo do pagamento a distribuir (modos 3 e 4)
  v_total_pago  numeric(10,2) := 0;
  v_vendas      jsonb := '[]'::jsonb;
  v_abertas     int;
  venda         record;
  v_devido      numeric(10,2);
  v_pago        numeric(10,2);
  v_novo_pago   numeric(10,2);
  v_status      text;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;
  -- (Removido o guarda de exclusão mútua p_valor × p_venda_ids: os dois
  --  juntos agora são o modo "valor nas selecionadas".)
  if p_valor is not null and p_valor <= 0 then
    raise exception 'Valor de pagamento inválido';
  end if;

  perform 1 from public.fiado_clientes
    where id = p_cliente_id and user_id = v_user;
  if not found then
    raise exception 'Cliente não encontrado';
  end if;

  -- Seleção: todas as vendas precisam existir, ser do usuário/cliente e
  -- estar em aberto — sem quitação parcial silenciosa de venda já paga.
  if p_venda_ids is not null then
    if array_length(p_venda_ids, 1) is null then
      raise exception 'Nenhuma venda selecionada';
    end if;
    select count(*) into v_abertas
    from public.fiado_vendas
    where id = any(p_venda_ids)
      and user_id = v_user and cliente_id = p_cliente_id
      and status <> 'PAGA';
    if v_abertas <> array_length(p_venda_ids, 1) then
      raise exception 'Venda inválida ou já quitada na seleção';
    end if;
  end if;

  v_restante := p_valor;

  for venda in
    select id, valor_total, valor_pago
    from public.fiado_vendas
    where user_id = v_user
      and cliente_id = p_cliente_id
      and status <> 'PAGA'
      and (p_venda_ids is null or id = any(p_venda_ids))
    order by data_compra asc, created_at asc
    for update
  loop
    exit when v_restante is not null and v_restante <= 0;

    v_devido := venda.valor_total - venda.valor_pago;
    v_pago := case
      when v_restante is null then v_devido        -- modos 1 e 2: quita inteira
      else least(v_devido, v_restante)             -- modos 3 e 4: cascata do valor
    end;

    insert into public.fiado_pagamentos (user_id, venda_id, valor_pago, pago_em)
    values (v_user, venda.id, v_pago, v_now);

    v_novo_pago := venda.valor_pago + v_pago;
    v_status := case when v_novo_pago >= venda.valor_total then 'PAGA' else 'PARCIAL' end;

    update public.fiado_vendas
      set valor_pago = v_novo_pago,
          status = v_status,
          quitado_em = case when v_status = 'PAGA' then v_now else null end
    where id = venda.id;

    v_total_pago := v_total_pago + v_pago;
    if v_restante is not null then
      v_restante := v_restante - v_pago;
    end if;
    v_vendas := v_vendas || jsonb_build_object(
      'venda_id', venda.id, 'valor_pago', v_pago, 'status', v_status
    );
  end loop;

  if v_total_pago = 0 then
    raise exception 'Nenhuma venda em aberto para este cliente';
  end if;
  -- Sobrou valor a distribuir = o pagamento passou do total em aberto do
  -- alvo (o cliente inteiro, ou só as vendas selecionadas no modo 4).
  if v_restante is not null and v_restante > 0 then
    if p_venda_ids is not null then
      raise exception 'Valor maior que o total em aberto das vendas selecionadas';
    else
      raise exception 'Valor maior que o total em aberto do cliente';
    end if;
  end if;

  return jsonb_build_object('total_pago', v_total_pago, 'vendas', v_vendas);
end;
$$;
