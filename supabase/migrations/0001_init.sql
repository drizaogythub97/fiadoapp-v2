-- =====================================================================
-- Fiado v2 — 0001: modelo de dados inicial
--
-- ⚠️ Banco COMPARTILHADO com o Gaveta (projeto jipavekxqsbzslcqpxmb).
-- Tudo aqui é ADITIVO: só cria objetos com prefixo fiado_. Nunca tocar
-- em tabelas do Gaveta (products, sales, profiles, expenses, ...).
--
-- Conteúdo:
--   1. Tabelas fiado_clientes / fiado_vendas / fiado_itens_venda /
--      fiado_pagamentos / fiado_preferencias (+ índices)
--   2. RLS por user_id = auth.uid() em todas, desde a criação
--   3. RPCs transacionais (security invoker, search_path fixado):
--      fiado_registrar_venda, fiado_registrar_pagamento,
--      fiado_resumo_dashboard
--
-- Decisões de produto (dono, 2026-07-07):
--   - Pagamento parcial abate em CASCATA das vendas mais antigas (como v1).
--   - Limite de crédito NÃO bloqueia venda — a UI só alerta. Por isso as
--     RPCs não fazem enforcement de limite.
--
-- Correção de modelo vs v1: fiado_pagamentos registra o valor REALMENTE
-- pago; status da venda (ATIVA|PARCIAL|PAGA) deriva de valor_pago.
-- Toda tabela tem legacy_id (int) para auditoria da migração MySQL (F3).
-- =====================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- =====================================================================
-- TABELA: fiado_clientes
-- =====================================================================
create table if not exists public.fiado_clientes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  nome            text not null check (length(trim(nome)) > 0),
  sobrenome       text,
  referencia      text,             -- "Filho", "Loja"... desambigua homônimos
  telefone        text,             -- dígitos; máscara aplicada na UI
  limite_credito  numeric(10,2) check (limite_credito is null or limite_credito >= 0), -- null = sem limite
  legacy_id       int,
  created_at      timestamptz not null default now()
);
create index if not exists idx_fiado_clientes_user
  on public.fiado_clientes(user_id);
create index if not exists idx_fiado_clientes_user_nome
  on public.fiado_clientes(user_id, lower(nome));

-- =====================================================================
-- TABELA: fiado_vendas
-- =====================================================================
create table if not exists public.fiado_vendas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  cliente_id       uuid not null references public.fiado_clientes(id) on delete cascade,
  data_compra      date not null default current_date,
  data_vencimento  date,            -- null permitido (paridade v1)
  valor_total      numeric(10,2) not null check (valor_total > 0),
  -- mantido pelas RPCs, nunca escrito direto pela aplicação
  valor_pago       numeric(10,2) not null default 0
                     check (valor_pago >= 0 and valor_pago <= valor_total),
  status           text not null default 'ATIVA'
                     check (status in ('ATIVA','PARCIAL','PAGA')),
  observacao       text,
  quitado_em       timestamptz,
  legacy_id        int,
  created_at       timestamptz not null default now()
);
create index if not exists idx_fiado_vendas_user_cliente
  on public.fiado_vendas(user_id, cliente_id);
create index if not exists idx_fiado_vendas_user_status
  on public.fiado_vendas(user_id, status);
-- inadimplentes: só vendas em aberto interessam
create index if not exists idx_fiado_vendas_user_vencimento
  on public.fiado_vendas(user_id, data_vencimento) where status <> 'PAGA';
create index if not exists idx_fiado_vendas_user_data
  on public.fiado_vendas(user_id, data_compra);

-- =====================================================================
-- TABELA: fiado_itens_venda
-- =====================================================================
create table if not exists public.fiado_itens_venda (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade, -- desnormalizado p/ RLS simples
  venda_id        uuid not null references public.fiado_vendas(id) on delete cascade,
  descricao       text not null check (length(trim(descricao)) > 0),
  quantidade      int not null check (quantidade > 0),
  valor_unitario  numeric(10,2) not null check (valor_unitario >= 0),
  valor_total     numeric(10,2) not null check (valor_total >= 0),
  legacy_id       int
);
create index if not exists idx_fiado_itens_venda_venda
  on public.fiado_itens_venda(venda_id);
create index if not exists idx_fiado_itens_venda_user
  on public.fiado_itens_venda(user_id);

-- =====================================================================
-- TABELA: fiado_pagamentos  (valores REALMENTE pagos — correção vs v1)
-- =====================================================================
create table if not exists public.fiado_pagamentos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  venda_id    uuid not null references public.fiado_vendas(id) on delete cascade,
  valor_pago  numeric(10,2) not null check (valor_pago > 0),
  pago_em     timestamptz not null default now(),
  legacy_id   int
);
create index if not exists idx_fiado_pagamentos_venda
  on public.fiado_pagamentos(venda_id);
create index if not exists idx_fiado_pagamentos_user_data
  on public.fiado_pagamentos(user_id, pago_em);

-- =====================================================================
-- TABELA: fiado_preferencias  (1 linha por usuário)
-- =====================================================================
create table if not exists public.fiado_preferencias (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  limite_credito_padrao  numeric(10,2)
    check (limite_credito_padrao is null or limite_credito_padrao >= 0),
  updated_at             timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY  (isolamento total por usuário)
-- =====================================================================
alter table public.fiado_clientes     enable row level security;
alter table public.fiado_vendas       enable row level security;
alter table public.fiado_itens_venda  enable row level security;
alter table public.fiado_pagamentos   enable row level security;
alter table public.fiado_preferencias enable row level security;

-- fiado_clientes
create policy "fiado_clientes_select_own" on public.fiado_clientes
  for select using (auth.uid() = user_id);
create policy "fiado_clientes_insert_own" on public.fiado_clientes
  for insert with check (auth.uid() = user_id);
create policy "fiado_clientes_update_own" on public.fiado_clientes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fiado_clientes_delete_own" on public.fiado_clientes
  for delete using (auth.uid() = user_id);

-- fiado_vendas
create policy "fiado_vendas_select_own" on public.fiado_vendas
  for select using (auth.uid() = user_id);
create policy "fiado_vendas_insert_own" on public.fiado_vendas
  for insert with check (auth.uid() = user_id);
create policy "fiado_vendas_update_own" on public.fiado_vendas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fiado_vendas_delete_own" on public.fiado_vendas
  for delete using (auth.uid() = user_id);

-- fiado_itens_venda
create policy "fiado_itens_venda_select_own" on public.fiado_itens_venda
  for select using (auth.uid() = user_id);
create policy "fiado_itens_venda_insert_own" on public.fiado_itens_venda
  for insert with check (auth.uid() = user_id);
create policy "fiado_itens_venda_update_own" on public.fiado_itens_venda
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fiado_itens_venda_delete_own" on public.fiado_itens_venda
  for delete using (auth.uid() = user_id);

-- fiado_pagamentos
create policy "fiado_pagamentos_select_own" on public.fiado_pagamentos
  for select using (auth.uid() = user_id);
create policy "fiado_pagamentos_insert_own" on public.fiado_pagamentos
  for insert with check (auth.uid() = user_id);
create policy "fiado_pagamentos_update_own" on public.fiado_pagamentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fiado_pagamentos_delete_own" on public.fiado_pagamentos
  for delete using (auth.uid() = user_id);

-- fiado_preferencias (linha = próprio usuário)
create policy "fiado_preferencias_select_own" on public.fiado_preferencias
  for select using (auth.uid() = user_id);
create policy "fiado_preferencias_insert_own" on public.fiado_preferencias
  for insert with check (auth.uid() = user_id);
create policy "fiado_preferencias_update_own" on public.fiado_preferencias
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fiado_preferencias_delete_own" on public.fiado_preferencias
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- RPC: fiado_registrar_venda
-- Cria a venda + itens numa transação; cliente existente (p_cliente_id)
-- OU cliente novo inline (p_cliente jsonb: nome, sobrenome, referencia,
-- telefone, limite_credito). Não faz enforcement de limite de crédito
-- (decisão do dono: limite só alerta, na UI).
-- p_itens: jsonb array de { descricao, quantidade, valor_unitario }.
-- Retorna o id da venda criada.
-- =====================================================================
create or replace function public.fiado_registrar_venda(
  p_itens jsonb,
  p_cliente_id uuid default null,
  p_cliente jsonb default null,
  p_data_compra date default null,
  p_data_vencimento date default null,
  p_observacao text default null
)
returns uuid
language plpgsql
security invoker  -- roda sob o RLS do usuário autenticado
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_cliente  uuid;
  v_venda    uuid;
  v_total    numeric(10,2) := 0;
  item       jsonb;
  v_qtd      int;
  v_unit     numeric(10,2);
  v_linha    numeric(10,2);
  v_desc     text;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'Venda sem itens';
  end if;
  if (p_cliente_id is null) = (p_cliente is null) then
    raise exception 'Informe o cliente existente OU os dados do cliente novo';
  end if;

  -- Cliente existente precisa pertencer ao usuário (a FK não passa pela
  -- RLS — lição da migration 0010 do Gaveta).
  if p_cliente_id is not null then
    select id into v_cliente
    from public.fiado_clientes
    where id = p_cliente_id and user_id = v_user;
    if v_cliente is null then
      raise exception 'Cliente não encontrado';
    end if;
  else
    if length(trim(coalesce(p_cliente ->> 'nome', ''))) = 0 then
      raise exception 'Nome do cliente é obrigatório';
    end if;
    insert into public.fiado_clientes
      (user_id, nome, sobrenome, referencia, telefone, limite_credito)
    values (
      v_user,
      trim(p_cliente ->> 'nome'),
      nullif(trim(coalesce(p_cliente ->> 'sobrenome', '')), ''),
      nullif(trim(coalesce(p_cliente ->> 'referencia', '')), ''),
      nullif(trim(coalesce(p_cliente ->> 'telefone', '')), ''),
      nullif(p_cliente ->> 'limite_credito', '')::numeric
    )
    returning id into v_cliente;
  end if;

  -- 1º passe: valida itens e calcula o total (a check valor_total > 0
  -- exige o total pronto antes do insert da venda).
  for item in select * from jsonb_array_elements(p_itens)
  loop
    v_desc := trim(coalesce(item ->> 'descricao', ''));
    v_qtd  := (item ->> 'quantidade')::int;
    v_unit := (item ->> 'valor_unitario')::numeric;

    if length(v_desc) = 0 or v_qtd is null or v_qtd <= 0
       or v_unit is null or v_unit < 0 then
      raise exception 'Item inválido: %', coalesce(v_desc, '(sem descrição)');
    end if;

    v_total := v_total + round(v_unit * v_qtd, 2);
  end loop;

  if v_total <= 0 then
    raise exception 'Venda com valor total zero';
  end if;

  insert into public.fiado_vendas
    (user_id, cliente_id, data_compra, data_vencimento, valor_total, observacao)
  values (
    v_user,
    v_cliente,
    coalesce(p_data_compra, current_date),
    p_data_vencimento,
    v_total,
    nullif(trim(coalesce(p_observacao, '')), '')
  )
  returning id into v_venda;

  -- 2º passe: insere os itens já validados
  for item in select * from jsonb_array_elements(p_itens)
  loop
    v_desc := trim(item ->> 'descricao');
    v_qtd  := (item ->> 'quantidade')::int;
    v_unit := (item ->> 'valor_unitario')::numeric;

    insert into public.fiado_itens_venda
      (user_id, venda_id, descricao, quantidade, valor_unitario, valor_total)
    values (v_user, v_venda, v_desc, v_qtd, v_unit, round(v_unit * v_qtd, 2));
  end loop;

  return v_venda;
end;
$$;

-- =====================================================================
-- RPC: fiado_registrar_pagamento
-- Registra pagamentos REAIS e deriva valor_pago/status/quitado_em das
-- vendas afetadas. Três modos (decisão do dono: parcial em CASCATA):
--   1. Quitação total:        p_valor null,  p_venda_ids null
--   2. Vendas selecionadas:   p_valor null,  p_venda_ids uuid[] (quita cada uma)
--   3. Valor específico:      p_valor > 0,   p_venda_ids null — abate em
--      cascata das vendas mais antigas (data_compra, created_at)
-- Retorna jsonb { total_pago, vendas: [{ venda_id, valor_pago, status }] }.
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
  v_restante    numeric(10,2);          -- saldo do pagamento a distribuir (modo 3)
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
  if p_valor is not null and p_venda_ids is not null then
    raise exception 'Informe um valor OU vendas selecionadas, não os dois';
  end if;
  if p_valor is not null and p_valor <= 0 then
    raise exception 'Valor de pagamento inválido';
  end if;

  perform 1 from public.fiado_clientes
    where id = p_cliente_id and user_id = v_user;
  if not found then
    raise exception 'Cliente não encontrado';
  end if;

  -- Modo selecionadas: todas as vendas precisam existir, ser do usuário/
  -- cliente e estar em aberto — sem quitação parcial silenciosa.
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
      when v_restante is null then v_devido        -- modos 1 e 2: quita
      else least(v_devido, v_restante)             -- modo 3: cascata
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
  if v_restante is not null and v_restante > 0 then
    raise exception 'Valor maior que o total em aberto do cliente';
  end if;

  return jsonb_build_object('total_pago', v_total_pago, 'vendas', v_vendas);
end;
$$;

-- =====================================================================
-- RPC: fiado_resumo_dashboard
-- KPIs somados no banco (lição do cap de 1000 linhas do PostgREST —
-- migration 0010 do Gaveta). security invoker: RLS continua valendo;
-- o filtro por auth.uid() é defesa em profundidade.
-- =====================================================================
create or replace function public.fiado_resumo_dashboard()
returns table (
  a_receber numeric,
  vendas_ativas bigint,
  clientes_inadimplentes bigint,
  total_clientes bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce((
      select sum(v.valor_total - v.valor_pago)
      from public.fiado_vendas v
      where v.user_id = auth.uid() and v.status <> 'PAGA'
    ), 0)::numeric(12,2),
    (
      select count(*)
      from public.fiado_vendas v
      where v.user_id = auth.uid() and v.status <> 'PAGA'
    ),
    (
      select count(distinct v.cliente_id)
      from public.fiado_vendas v
      where v.user_id = auth.uid() and v.status <> 'PAGA'
        and v.data_vencimento < current_date
    ),
    (
      select count(*)
      from public.fiado_clientes c
      where c.user_id = auth.uid()
    );
$$;
