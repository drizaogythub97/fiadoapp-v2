# 00 — Visão Geral

## O que é

Fiado v2 é a reescrita do **FiadoApp** (fiadoapp.net) no padrão do ERP Gaveta.
Controle de vendas a prazo ("fiado") para pequenos comerciantes: clientes,
vendas com itens, quitações, inadimplentes, cobrança por WhatsApp, comprovantes,
relatórios e analytics.

## Público

O mesmo do Gaveta: pessoas com pouca destreza em sistemas tecnológicos.
Usabilidade e acessibilidade são requisitos de primeira classe.
Hoje há **um usuário real ativo (o dono, uso diário)** — os dados dele migram
do MySQL sem perda.

## Escopo do v2 = paridade com o v1 + correções aprovadas

### Paridade (o que o app antigo faz e o v2 precisa fazer)

- Autenticação (v2: Supabase Auth — mesma conta do Gaveta, SSO do ecossistema)
- Dashboard: a receber, vendas ativas, inadimplentes, total de clientes + busca rápida
- Clientes: cadastro (PF/PJ no usuário; cliente com nome/sobrenome/referência/telefone),
  consulta com busca + filtro por situação + navegação A–Z, edição, exclusão (cascata),
  limite de crédito padrão (usuário) e por cliente
- Vendas: criação com cliente existente ou novo inline, itens dinâmicos com
  autocomplete de descrição, máscara BRL, data de compra + vencimento (auto +30d),
  observação; detalhe; exclusão
- Quitações: total, selecionadas, valor específico (parcial); marcar venda como paga
- Inadimplentes: lista com dias de atraso e total devido; cobrança via WhatsApp
  (wa.me com mensagem pronta: valor em aberto + dias de atraso)
- Histórico de vendas pagas por cliente
- Comprovantes: quitação e pagamento — no v2 via rota de impressão HTML
  (padrão `/comprovante` do Gaveta), com compartilhamento (Web Share)
- Relatórios: filtros (período, status, inicial, cliente, seleção), exportação
  CSV e impressão/PDF via print
- Analytics: faturamento por dia, top clientes, pagas × em aberto, KPIs do período
- PWA instalável; TWA na Play Store (substitui o APK WebView antigo)

### Correções de modelo aprovadas (o v1 fazia errado)

1. **Pagamentos reais**: no v1, a quitação parcial marca TODAS as vendas como
   pagas com valor cheio e cria uma venda "Restante" — os registros de
   pagamento superestimam o recebido. No v2, `fiado_pagamentos` registra o que
   foi de fato pago, e o status da venda deriva disso (`PARCIAL` passa a existir
   de verdade). Semântica exata: decidir com o dono na Fase F2.
2. **Sem auto-delete**: o v1 apaga vendas pagas com mais de 6 meses. O v2
   mantém histórico completo.
3. **Limite de crédito**: v1 é só informativo. v2: alerta no caixa e (a decidir
   com o dono) bloqueio opcional no servidor.

### Fora do escopo do v2 (não inventar)

- Estoque, fechamento de caixa, despesas (isso é o Gaveta; integração vem na F6)
- Notificações push, multi-loja, papéis de admin
- Nota fiscal

## Ecossistema (Frente 2 — Fase F6)

Fiado e Gaveta são apps separados, cada um com sua finalidade, **linkados**:
mesmo projeto Supabase → mesma conta/login (SSO), app switcher no header dos
dois. Integrações de dados (fiado no PDV do Gaveta, recebíveis no financeiro)
são estágios posteriores, propostos um a um.
