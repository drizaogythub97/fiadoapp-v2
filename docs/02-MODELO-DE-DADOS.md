# 02 — Modelo de Dados (draft para a F2)

Banco: **projeto Supabase compartilhado com o Gaveta** (`jipavekxqsbzslcqpxmb`).
Prefixo `fiado_` no schema `public`. RLS por `user_id = auth.uid()` em tudo.
Toda tabela migrada carrega `legacy_id` (int, id do MySQL) para auditoria.

## Esquema de origem (MySQL — FiadoApp v1)

- `usuarios` (id, tipo PF/PJ, nome, email, senha bcrypt, limite_credito_padrao)
- `clientes` (id, usuario_id, nome, sobrenome, referencia, telefone, limite_credito)
- `vendas` (id, cliente_id, usuario_id, data_compra, data_vencimento,
  valor_total, status ATIVA|PAGA['PARCIAL' nunca é gravado], observacao, quitado_em)
- `itens_venda` (id, venda_id, quantidade, descricao, valor_unitario, valor_total)
- `pagamentos` (id, venda_id, usuario_id, valor_pago, data_pagamento)
  ⚠️ superestimados na quitação parcial (ver 00-VISAO §correções)

## Esquema alvo (Postgres)

```
fiado_clientes
  id uuid pk default gen_random_uuid()
  user_id uuid not null references auth.users
  nome text not null
  sobrenome text
  referencia text            -- "Filho", "Loja"... desambigua homônimos
  telefone text              -- dígitos com máscara aplicada na UI
  limite_credito numeric(10,2)   -- null = sem limite
  legacy_id int
  created_at timestamptz default now()

fiado_vendas
  id uuid pk
  user_id uuid not null
  cliente_id uuid not null references fiado_clientes
  data_compra date not null
  data_vencimento date           -- null permitido (v1 permite)
  valor_total numeric(10,2) not null check (valor_total > 0)
  valor_pago numeric(10,2) not null default 0   -- mantido por RPC, nunca direto
  status text not null default 'ATIVA'
    check (status in ('ATIVA','PARCIAL','PAGA'))  -- derivado de valor_pago
  observacao text
  quitado_em timestamptz
  legacy_id int
  created_at timestamptz default now()

fiado_itens_venda
  id uuid pk
  user_id uuid not null          -- desnormalizado p/ RLS simples
  venda_id uuid not null references fiado_vendas on delete cascade
  descricao text not null
  quantidade int not null check (quantidade > 0)
  valor_unitario numeric(10,2) not null check (valor_unitario >= 0)
  valor_total numeric(10,2) not null
  legacy_id int

fiado_pagamentos
  id uuid pk
  user_id uuid not null
  venda_id uuid not null references fiado_vendas
  valor_pago numeric(10,2) not null check (valor_pago > 0)  -- valor REAL pago
  pago_em timestamptz not null default now()
  legacy_id int

fiado_preferencias  (1 linha por usuário)
  user_id uuid pk references auth.users
  limite_credito_padrao numeric(10,2)
```

## RPCs transacionais (padrão Gaveta: security invoker + auth.uid() + search_path fixado)

- `fiado_registrar_venda(cliente, itens[], datas, observacao)` — cria/atualiza
  cliente inline + venda + itens numa transação; valida tudo no banco.
- `fiado_registrar_pagamento(...)` — registra pagamentos REAIS e atualiza
  `valor_pago`/`status`/`quitado_em` das vendas afetadas. Cobre os três modos
  (todas / selecionadas / valor específico). **Semântica do parcial: decisão
  pendente do dono na F2** (cascata das mais antigas, como o v1, vs por venda).
- `fiado_resumo_dashboard()` / agregações de relatório — KPIs somados no banco
  (lição do cap de 1000 linhas do PostgREST, migration 0010 do Gaveta).

## Regras de derivação

- `status = PAGA` ⇔ `valor_pago >= valor_total` (setar `quitado_em`);
  `PARCIAL` ⇔ `0 < valor_pago < valor_total`; senão `ATIVA`.
- Inadimplente: `status != 'PAGA' AND data_vencimento < current_date`.
- "A receber" = `SUM(valor_total - valor_pago)` das vendas não pagas.

## Mapeamento da migração (v1 → v2)

- `usuarios` → conta Supabase Auth existente do dono (match por e-mail);
  `limite_credito_padrao` → `fiado_preferencias`.
- `clientes/vendas/itens_venda` → cópia direta com uuid novo + `legacy_id`.
- `pagamentos` v1 não são confiáveis (superestimados). Estratégia: para vendas
  `PAGA`, criar UM pagamento sintético = `valor_total` com `pago_em = quitado_em`
  (ou data_pagamento do v1 quando houver 1:1); descartar o excesso. Documentar
  no relatório de validação da F3.
- Vendas "Restante" do v1 (artefato do parcial antigo) migram como vendas
  normais ATIVAS — são o saldo devedor real de hoje.
