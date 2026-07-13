# 01 — Roadmap de Fases

Concluir uma fase (com validação do dono) antes da próxima.
Legenda: 🤖 = Claude · 👤 = dono (Adriano)

## F0 — Hardening do FiadoApp PHP em produção ✅ CONCLUÍDA (2026-07-06)

Feita no repo antigo (`FiadoApp`, PR #1 + hotfix `c42536f`): IDORs corrigidos,
erros genéricos, rate limit no cadastro, senha mínima, libs self-hosted em
`assets/vendor/` (gotcha: a regra `vendor/` do .gitignore precisou virar
`/vendor/`), documentos pessoais removidos do repo e do servidor.
Descoberta: a Hostinger sobrescreve o header CSP no servidor.

## F1 — Fundação do Fiado v2 ✅ CONCLUÍDA (2026-07-06)

- [x] 🤖 Repo `fiado` + esta documentação
- [x] 🤖 Scaffold espelhando o Gaveta (TS, Tailwind 4, App Router) + shadcn/ui + Vitest + Playwright + ESLint
- [x] 🤖 Portar do Gaveta (`../erp-simples/`): `lib/security/csp.ts`, middleware/proxy de auth,
      rate limiting (Upstash, prefixo `fiado:`), clients Supabase (`lib/supabase/`), padrão de
      validações Zod, `next.config.ts` (headers), estrutura de pastas
- [x] 🤖 Design system: tokens do Gaveta re-tematizados para a marca FiadoApp
      (coral `#E8624A`, tema ESCURO por padrão, Inter), loader de marca, transições motion-safe
- [x] 🤖 `.env.local` (copiado do `../erp-simples/.env.local` — mesmo Supabase/Upstash)
- [x] 🤖 Projeto Vercel `fiado` linkado (git integration) + envs prod/preview no painel
      (gotcha: o `vercel link` definiu a branch de produção como a branch local corrente;
      `vercel git disconnect` + `connect` redetectou a `main`)
- [x] 🤖 Login/logout + layout base (header, navegação) usando Supabase Auth
      — escopo F1: SEM cadastro/recuperação de senha (a conta é a mesma do Gaveta;
      esses fluxos entram junto com a página de privacidade em fase posterior)
- [x] 👤 Validado pelo dono ("ficou ótimo visualmente") → PR #1 mesclado (squash) em 2026-07-06.
      Pós-merge: repo renomeado para `fiadoapp-v2`, projeto Vercel para `fiadoapp`,
      produção em `https://fiadoapp-v2.vercel.app`

## F2 — Modelo de dados + RLS

- [x] 👤 Decisão de produto (2026-07-07): pagamento parcial abate em **cascata**
      das vendas mais antigas (como no v1); limite de crédito **só alerta**
      (nunca bloqueia) + badge persistente no cliente acima do limite
- [x] 🤖 Migration `0001_init.sql`: tabelas `fiado_clientes`, `fiado_vendas`,
      `fiado_itens_venda`, `fiado_pagamentos`, `fiado_preferencias`, RLS desde a
      criação, índices, RPCs transacionais (`fiado_registrar_venda`,
      `fiado_registrar_pagamento`, `fiado_resumo_dashboard`) — aplicada no banco
      em 2026-07-07 (técnica `pg`, ver docs/04). `search_path` fixado e checagem
      de propriedade nas RPCs desde o dia 1 (lições da 0010 do Gaveta)
- [x] 🤖 Suíte `test:rls` (17 testes: isolamento cruzado + funcional das RPCs,
      incluindo a cascata e o resumo agregado no banco)

## F3 — Migração de dados (dados reais — ver `docs/03`)

- [x] 👤 Remote MySQL habilitado (2026-07-07) — credenciais no `.env.local`
      (host = IP do servidor; banco/usuário `u879355098_fiadoapp_*`)
- [x] 👤 E-mail do FiadoApp confirmado: `ademir.cardoso65@outlook.com` →
      migra para a conta Gaveta `adriano.cardoso97@gmail.com` (`--conta`).
      Decisão do dono: migrar SÓ o usuário Rações Cardoso; as demais contas
      do MySQL são teste (Arthur, 1 venda, reavaliar no cutover da F5 —
      snapshot completo guardado)
- [x] 🤖 Script `scripts/migracao/migrar.mjs` (snapshot → anomalias → wipe por
      `legacy_id` → migração transacional → relatório). Dry-run de 2026-07-07:
      61 clientes, 247 vendas, 371 itens, 187 pagamentos sintéticos —
      **zero divergência**, "A Receber" R$ 3.340,00 idêntico à fórmula do v1
- [x] 👤 Relatório de validação conferido (2026-07-07): card "A Receber" do
      app antigo confere com os R$ 3.340,00 migrados → PR #3 mesclado.
      **F3 ✅ CONCLUÍDA** (migração final re-roda na janela de congelamento
      da F5 com o mesmo script)

## F4 — Features (uma branch/Preview por bloco; 👤 valida cada uma)

- [x] 🤖👤 4a. Clientes: consulta A–Z/busca/filtros, cadastro, edição, exclusão
      + Dashboard KPIs — entregue e **validado pelo dono em 2026-07-07**
      (PR #4 mesclado). Migration 0002 `fiado_clientes_com_saldo`, badge
      persistente "Acima do limite", busca rápida no painel
- [x] 🤖👤 4b. Vendas: nova venda (autocomplete de cliente e de descrição, itens
      dinâmicos, máscara BRL, vencimento +30d), lista com filtros, detalhe,
      exclusão + Quitações (total/selecionadas/parcial em cascata) na tela nova
      `/clientes/[id]` — **validado pelo dono em 2026-07-07** (PR #5, squash
      `2699e45`). Alerta de limite só avisa (decisão F2). Correção pós-review
      do dono: `loading.tsx` re-exportado nos segmentos aninhados de /clientes
      e /vendas para o loader de marca aparecer em TODA transição com delay
      (o App Router usa a Suspense boundary mais próxima do segmento que muda)
- [x] 🤖👤 4c. Inadimplentes + WhatsApp + comprovantes (rota de impressão + Web
      Share) + histórico do cliente + extras pedidos pelo dono: espelho da
      venda por WhatsApp e **espelho do cliente** (vendas ativas agrupadas e
      compartilháveis em `/comprovante/cliente/[clienteId]`) — **validado
      pelo dono e mesclado em 2026-07-08** (PR #6, squash `3693860`)
- [x] 🤖👤 4d-1. Relatórios: filtros (período/situação/inicial A–Z/busca),
      seleção por checkboxes, KPIs (A Receber = restante), Imprimir/PDF
      (layout de impressão claro embutido) e CSV (BOM, `;`) — **validado
      pelo dono e mesclado em 2026-07-08** (PR #7, squash `72a23b4`).
      Ajustes do dono no mesmo PR: SEM exportação em imagem nos relatórios
      (card canvas ficava ilegível com muitos dados); em troca, os
      comprovantes/espelhos ganharam botão **Imagem** (PNG hi-def do
      próprio papel via html-to-image), **marca da loja do Gaveta**
      (`profiles.brand_name`/`brand_logo_path`, só leitura; padrão
      FiadoApp) e **diálogo de formato PDF/Imagem** ao gerar
      espelho/comprovante/quitação (fluxo do v1, que o dono valoriza)
- [x] 🤖👤 4d-2. Analytics: filtro de período (atalhos + datas), 5 KPIs,
      faturamento por dia (linha SVG própria, dias sem venda = 0, tooltip
      teclado/mouse + tabela acessível), top 10 clientes (barras em cor
      única) e Pagas × Em aberto (barra empilhada — a rosca de 2 fatias do
      v1 é ilegível) — **validado pelo dono e mesclado em 2026-07-09**
      (PR #8, squash `60dbb52`). Sem migration; lógica pura em
      `lib/analytics.ts`
- [x] 🤖👤 4d-3. Configurações (aba → landing com 2 cards, IA padronizada
      com o Gaveta a pedido do dono):
      **Preferências** — tema claro via toggle (cookie `fiado_theme`),
      **marca da loja NATIVA do Fiado** (migration 0004: `brand_name`/
      `brand_logo_path` em `fiado_preferencias`; editor nome + logo com
      recorte; a herança da marca do Gaveta foi REVERTIDA pela decisão de
      autonomia de 2026-07-09), limite de crédito padrão (migration 0003:
      `limite_efetivo` na RPC de saldo — alerta/badges usam individual OU
      padrão; segue NUNCA bloqueando) e limites por cliente com busca;
      **Minha conta** — alterar nome/e-mail/senha (reautenticação + rate
      limit) e exclusão de conta (aviso: a conta é a mesma do ecossistema)
      — **validado pelo dono e mesclado em 2026-07-10** (PR #9, squash
      `2cdef9b`; migrations 0003/0004 aplicadas)
- [x] 🤖👤 4d-4. Cadastro/recuperação/troca de senha + página `/privacidade`
      (signup/recover/reset portados do Gaveta com rate limit + Zod +
      política de senha; `/privacidade` adaptada — dados = clientes/vendas/
      pagamentos, exclusão avisa da conta única; links no login; correção:
      erro do callback de e-mail agora aparece no login via código fixo) —
      **mesclado em 2026-07-10** (PR #10, squash `405f9f3`). ⚠️ Descoberto e
      corrigido: o allowlist de Redirect URLs do Supabase não tinha o Fiado
      (dono adicionou fiadoapp-v2 + localhost + fiadoapp.net). Confirmação
      de e-mail está DESLIGADA no projeto compartilhado (decisão: manter)

## F5 — PWA + cutover — ✅ CUTOVER FEITO EM 2026-07-10

- [x] 🤖 PWA: SW sem cache, manifest, ícones any+maskable do logo 2048px
      do v1, auto-print só desktop; Lighthouse 97/96/100/100; E2E;
      `/security-review` sem achados — **mesclado em 2026-07-10** (PR #11,
      squash `4d5a264`). assetlinks fica para a TWA (precisa do fingerprint
      da chave de assinatura)
- [x] 👤 **Decisão de hosting**: manter Vercel Hobby POR ORA (2026-07-10).
      ⚠️ PENDÊNCIA: sair do Hobby (termos vedam uso comercial) — upgrade
      Pro é só no painel, nada muda no código
- [x] 🤖 Migração final na janela de congelamento (2026-07-10): 61 clientes,
      248 vendas, 372 itens, 192 pagamentos — **zero divergência**. Arthur
      e contas de teste ficaram fora (decisão do dono; backup completo em
      `..\fiado-migracao`)
- [x] 👤 DNS de `fiadoapp.net` apontado para a Vercel (A @ → 76.76.21.21,
      CNAME www, AAAA da Hostinger REMOVIDO — pegadinha: IPv6 continuaria
      no app antigo); `A ftp` mantido como acesso ao fallback
- [x] 🤖 Smoke test pós-cutover 100% (rotas públicas/protegidas, PWA, CSP,
      TLS apex+www, redirect de e-mails); app PHP congelado como fallback
      (reverter o A no hPanel o restaura)
- [ ] 👤 (Depois) Publicar TWA na Play Console (aí entra o assetlinks);
      deixar o plano Hostinger expirar **mantendo o registro do domínio**

## F5b — Experiência mobile ✅ CONCLUÍDA E EM PRODUÇÃO (2026-07-11)

Interlúdio pós-cutover a pedido do dono: o v2 no celular precisava de uma
experiência melhor que a herdada do desktop.

- [x] 🤖👤 5b-1. Modo **Simples** (atual) organizado no mobile: nav em grid,
      cards e forms alinhados — **mesclado** (PR #12, squash `fdc7ff7`)
- [x] 🤖👤 5b-2. Modo **Minimalista** opt-in por aparelho: cookie
      `fiado_ui_mode` + variant CSS `minimal` + `data-ui-mode` no html;
      bottom nav; ModoChooser na 1ª visita mobile; escolha em Preferências
      (PR #13, absorvido na pilha)
- [x] 🤖👤 5b-3. Comprovantes no celular: formato (PDF/Imagem/Não gerar)
      dentro do diálogo de quitação; geração fora da tela + share nativo
      sem aba de preview (`useEmissorComprovante`); desktop mantém preview
      (PR #14, absorvido na pilha)
- [x] 🤖👤 5b-4/5/6. Rodadas de validação do dono: login compacto, busca
      acima dos KPIs + Atalhos rápidos no dashboard, limite POR CLIENTE com
      busca em Preferências, comprovante PNG em RETRATO (420px);
      **Minimalista revitalizado** (escala densa h1 xl/título base/corpo
      sm/meta xs, listas tocáveis com chevron, controles segmentados,
      filtro A–Z virou dropdown nativo, legends com respiro) — **aprovado
      sem ressalvas e mesclado em 2026-07-11** (PR #15, squash `87a5f3b`;
      os PRs empilhados #13/#14 entraram na main por ele)
- [x] 🤖 Spec de padronização para replicar no Gaveta:
      `docs/05-MOBILE-UI-SPEC.md`
- [x] 🤖👤 **Replicação no Gaveta CONCLUÍDA em 2026-07-12**: PR gaveta#16
      (Simples organizado + Minimalista opt-in + escala densa + fix do
      noopener no preview, merge `05745cd`) e PR gaveta#17 (comprovante
      direto no celular no caixa E no Financeiro, loader único
      `lib/receipt/data.ts`, rodapé do form de produto padronizado, merge
      `96437c8`) — ambos validados pelo dono; produção
      gaveta-erp.vercel.app atualizada. Os dois apps estão pareados no
      padrão mobile → caminho livre para a F6

## F6 — Ecossistema Gaveta ⇄ Fiado (estratégia aprovada 👤 2026-07-09)

**Princípio: uma conta, dois apps completos, pontes opcionais.** Os apps são
AUTÔNOMOS (cada um com todos os seus recursos — ver marca nativa na F4d-3);
a infra compartilhada (mesmo Supabase/Auth = SSO) é invisível ao usuário;
toda integração é OPT-IN, com liga/desliga individual e default DESLIGADO.

- [x] 🤖👤 **Descoberta CONCLUÍDA** (2026-07-12): página `/ecossistema` +
      card permanente em Configurações + anúncio único dispensável no
      Painel (cookie `fiado_ecossistema_anuncio`). Fiado PR #16 (squash
      `a6da98c`); Gaveta PR #18 (merge `6dc2771`). Gatilho contextual
      (venda a prazo no PDV) fica junto do Estágio 4.
- [x] 🤖👤 **Estágio 1 — Vínculo básico CONCLUÍDO** (2026-07-12): app
      switcher no header + item no painel "Mais", **opt-in** via toggle
      "Atalho rápido no menu" (o botão fixo foi retrabalhado por feedback
      do dono — sem propósito declarado feria o opt-in). Fundação de
      toggles: tabela `ecossistema_prefs` (migration 0005; RLS por
      usuário; colunas default false). Fiado PR #17 (squash `5024eb3`);
      Gaveta PR #19 (merge `4db47fc`).
- [x] 🤖👤 **Estágio 2 — Marca única CONCLUÍDA** (2026-07-12): toggle
      "Marca única da loja"; ativar copia a marca do app de origem p/ o
      outro; com a ponte ON as actions de marca fazem dual-write (nome +
      logo = mesmo arquivo do bucket compartilhado). **Política de
      retorno** (pedido do dono): desativar restaura a marca anterior de
      cada app (migration 0007 = colunas de backup; guarda
      `removerLogoSeguro` preserva o logo do retorno). Leitura continua
      nativa (autonomia intacta). Fiado PR #18 (squash `33d9ff3`);
      Gaveta PR #20 (merge `0f1472b`).
- [x] 🤖👤 **Integração "Fiado no PDV" CONCLUÍDA** (2026-07-13) — **fundiu os
      antigos Estágios 3 + 4 + parte do 5** num único fluxo (decisão do dono:
      não fazer uma tela de "caderno compartilhado" isolada; o seletor de
      cliente vive dentro do bloco de venda a prazo do caixa). Entregue em 5
      fases, validadas uma a uma:
  - **Fase 0 — pagamento parcial nas vendas selecionadas** (Fiado-only): o
    modo "selecionadas" passou a aceitar um valor opcional, distribuído em
    cascata só entre as marcadas (migration 0008 relaxa o guarda da
    `fiado_registrar_pagamento`). Fiado PR #19 (squash `f3e86d9`).
  - **Fase 1 — registrar venda a prazo no PDV**: forma de pagamento "Venda a
    Prazo (Fiado)" no caixa (opt-in via toggle `fiado_pdv_ativo`), com
    combobox de clientes do FiadoApp + cadastro inline; RPC-ponte atômica
    `registrar_venda_fiado` cria o a-receber (FiadoApp) + a venda `'fiado'`
    (Gaveta, com baixa de estoque). Badge "Registrada no Gaveta" no FiadoApp.
    Migrations: Fiado 0009 (`fiado_vendas.origem`, `fiado_pdv_ativo`), Gaveta
    0011 (`'fiado'` no `payment_method`, `sales.fiado_venda_id`, RPC-ponte).
    Fiado PR #20 (squash `4a7a9d9`); Gaveta PR #21 (merge `8e27f36`).
  - **Fase 2 — financeiro do Gaveta reflete o fiado** (sem migration):
    faturamento exclui `'fiado'` (via `CAIXA_PAYMENT_METHODS` no financeiro E
    dashboard — corrige double-count); bloco segregado "A receber via
    FiadoApp" (badge + link); realização por pagamento (`pago_em`, parcial
    conta o pago). Gaveta PR #22 (merge `2017e50`).
  - **Fase 3 — exclusão consistente**: RPC-ponte `excluir_venda_fiado` (Gaveta
    migration 0012) remove os dois lados e estorna estoque (reusa
    `set_sale_status`); FiadoApp roteia origem 'gaveta' (venda e cliente) por
    ela; botão de excluir no bloco a-receber; avisos p/ venda com pagamento.
    Gaveta PR #23 (merge `0eeaddd`); Fiado PR #22 (squash `da2a7e8`).
  - **Fase 4 — desativar com senha + Manter/Excluir**: desativar o toggle pede
    reautenticação por senha + mostra resumo + escolhe Manter (só desliga) ou
    Excluir (apaga as vendas de origem Gaveta pelos dois lados). Sem migration.
    Gaveta PR #24 (merge `74f5a61`); Fiado PR #23 (squash `6ebacf0`).

Nota: a IA de Configurações já foi padronizada nos dois apps (Fiado na
F4d-3; Gaveta via prompt entregue ao dono em 2026-07-09).

**Regras contábeis fixadas (decisões do dono):** venda a prazo é *a receber*,
nunca faturamento no ato; base caixa (o faturamento recebe o valor **pago**,
na data do pagamento; parcial conta o que já foi pago); `fiado_vendas` é a
fonte da verdade e o Gaveta **projeta em tempo de leitura** (sem sync);
alocação de pagamento parcial = **cascata do mais antigo, cega para origem**;
quantidade fracionada preserva o valor (qtd embutida na descrição do item).

**Padrões do ecossistema:** ponte = coluna em `ecossistema_prefs` (default
false) + toggle na `/ecossistema` dos dois apps. **As RPCs-ponte que escrevem
em tabelas do Gaveta (`registrar_venda_fiado`, `excluir_venda_fiado`) vivem
nas migrations do GAVETA**; o Fiado é dono de `ecossistema_prefs` e das
colunas `fiado_*`. Migrations aplicadas ao banco compartilhado antes do push
(gate de segurança pede aprovação p/ mudar objeto de produção do Gaveta).
Gaveta mescla com `--merge`; Fiado com squash. Badges de referência usam a
cor+logo do OUTRO app (FiadoApp = vermelho/coral; Gaveta = verde).
