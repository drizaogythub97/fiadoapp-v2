-- 0010 — Execução de RPC só com sessão
--
-- PROBLEMA (medido em 24/09/2026 contra a produção, sem nenhuma sessão,
-- usando apenas a chave pública que já vai no pacote JavaScript):
--
--   POST /rest/v1/rpc/fiado_resumo_dashboard    ->  HTTP 200
--   POST /rest/v1/rpc/fiado_clientes_com_saldo  ->  HTTP 200
--
-- NÃO há vazamento de dados: a RLS está íntegra e as respostas voltaram
-- vazias, porque sem `auth.uid()` nenhuma política casa. O que existe é
-- superfície de abuso de CPU — qualquer pessoa na internet pode fazer o
-- banco agregar vendas e pagamentos sem se identificar.
--
-- TRÊS DECISÕES QUE NÃO DEVEM SER REFEITAS:
--
-- 1. Revogar do `anon` SOZINHO NÃO RESOLVE. O privilégio padrão do schema
--    concede a `PUBLIC` (aparece como `=X/postgres` na ACL) e o `anon`
--    herda dali. Tem de revogar de `public, anon` juntos. Foi assim que se
--    descobriu no Gaveta (achado 6 de `docs/12` de lá).
--
-- 2. NÃO mexer no privilégio PADRÃO do schema. Um `ALTER DEFAULT
--    PRIVILEGES` resolveria de uma vez, mas vale para o papel `postgres`
--    inteiro e atingiria também as funções do GAVETA, que divide este mesmo
--    banco. Decisão registrada na migration `0024` do Gaveta.
--
-- 3. As funções NÃO são `security definer` — rodam como quem chama, e a RLS
--    continua sendo a fronteira de verdade. Este revoke é defesa em
--    profundidade, não o que segura os dados.
--
-- REGRA DAQUI PARA A FRENTE: toda RPC nova nasce sem o papel anônimo, e a
-- migration que a cria termina com o seu próprio `revoke`.

revoke execute on function public.fiado_clientes_com_saldo() from public, anon;

revoke execute on function public.fiado_registrar_pagamento(
  p_cliente_id uuid, p_valor numeric, p_venda_ids uuid[]
) from public, anon;

revoke execute on function public.fiado_registrar_venda(
  p_itens jsonb, p_cliente_id uuid, p_cliente jsonb,
  p_data_compra date, p_data_vencimento date, p_observacao text
) from public, anon;

revoke execute on function public.fiado_resumo_dashboard() from public, anon;
