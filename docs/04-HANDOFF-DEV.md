# 04 — Handoff de Desenvolvimento (sem segredos)

Guia para a sessão de Claude Code aberta nesta pasta. Segredos NUNCA aqui —
apenas onde encontrá-los.

## Acessos já prontos na máquina

- **gh CLI**: `C:\Program Files\GitHub CLI` (no Bash:
  `export PATH="$PATH:/c/Program Files/GitHub CLI"`), autenticado como
  `drizaogythub97`.
- **vercel CLI**: instalado (`vercel.cmd` no PowerShell; no Bash adicionar
  `/c/Users/adria/AppData/Roaming/npm` ao PATH). Conta já logada.
- **Repo GitHub**: `drizaogythub97/fiadoapp-v2` (renomeado de `fiado` em
  2026-07-06; `fiadoapp` puro colide com o repo antigo `FiadoApp` — nomes são
  case-insensitive no GitHub). **Projeto Vercel**: `fiadoapp` (team
  `adriano-cardoso-org`), git integration ativa, produção em
  `https://fiadoapp-v2.vercel.app` (`fiadoapp.vercel.app` pertence a terceiros;
  a URL definitiva será `fiadoapp.net` no cutover da F5). Previews têm
  Deployment Protection (302 → SSO Vercel para anônimos).
- **Supabase**: mesmo projeto do Gaveta. Copiar do
  `../erp-simples/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` (nome pode variar —
  conferir lá), `SUPABASE_DB_URL` (Session pooler IPv4, porta 5432).
- **Upstash** (rate limit): keys também no `.env.local` do Gaveta.
- **MySQL da Hostinger** (só na F3): credenciais fornecidas pelo dono na hora;
  guardar apenas no `.env.local` daqui.

## Técnicas comprovadas (do desenvolvimento do Gaveta)

- **Aplicar migration sem psql/docker**: `npm i pg --no-save` + script `.mjs`
  dentro do projeto (ESM resolve node_modules pela pasta do arquivo): dotenv →
  `new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })` →
  `client.query(sqlDoArquivoInteiro)` (dollar-quoting `$$` passa direto).
  Apagar o script e conferir package.json/lock intactos.
- **URL do Preview da Vercel via gh**:
  `gh api repos/<owner>/<repo>/deployments?sha=<sha>` → `[0].statuses_url` →
  `gh api <statuses_url>` → `[0].environment_url` (state success).
- **Reset de senha do Supabase** demora ~1 min para propagar no pooler.
- Validação padrão antes de push:
  `npm run lint && npx tsc --noEmit && npm run test && npm run build`
  (+ `npm run test:rls` quando mexer em banco).

## O que portar do Gaveta (ler em `../erp-simples/`)

| Origem (Gaveta)                                                           | Destino (Fiado)                                         | Status                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------- |
| `lib/security/csp.ts` + headers no `next.config.ts`                       | idem                                                    | ✅ F1                      |
| `proxy.ts`/middleware de auth + `lib/supabase/{server,client,middleware}` | idem                                                    | ✅ F1                      |
| Rate limiting Upstash (`lib/` + uso nas actions)                          | prefixo de chave `fiado:`                               | ✅ F1                      |
| `lib/validations/*` (padrão Zod)                                          | novos schemas do domínio fiado                          | ✅ base F1; domínio na F2+ |
| Design tokens/`globals.css`                                               | re-tematizado coral #E8624A, escuro padrão              | ✅ F1                      |
| Loader de marca (`gaveta-loader*`)                                        | `components/app/fiado-loader*` (2 variantes)            | ✅ F1                      |
| Rota `/comprovante/[id]` (print CSS + auto-print + Web Share)             | comprovante de quitação/pagamento                       | ✅ F4c                     |
| `tests/` (estrutura Vitest/Playwright/RLS)                                | Vitest+configs ✅ F1; suíte RLS ✅ F2 (17 testes)       | ✅ F2                      |
| Fluxos signup/recover/reset + `/privacidade`                              | adiados intencionalmente                                | F4d                        |
| `.github/workflows/backup-db.yml`                                         | NÃO duplicar — o backup do Gaveta já cobre o banco todo | —                          |

## Estado 2026-07-08 (noite): SPRINT ENCERRADA — F4c e F4d-1 mescladas

**Onde paramos:** working tree limpa, `main` = produção com F4c (PR #6,
squash `3693860`) e F4d-1 Relatórios (PR #7, squash `72a23b4`), ambas
validadas pelo dono. Produção: `https://fiadoapp-v2.vercel.app`.

**O que a F4d-1 entregou (PR #7):** `/relatorios` (filtros por período/
situação/inicial/busca, seleção por checkboxes, KPIs com A Receber =
restante, Imprimir/PDF via layout claro embutido com `print:` variants,
CSV com BOM e `;`) + ajustes de comprovantes pedidos na validação:
botão **Imagem** em todo `/comprovante/*` (PNG hi-def do papel via
`html-to-image` pixelRatio 3, Web Share de arquivo c/ fallback download,
`components/receipt/comprovante-shell.tsx` substituiu o print-toolbar),
**marca da loja do Gaveta** nos comprovantes (`lib/marca.ts` lê
`profiles.brand_name`/`brand_logo_path`, padrão FiadoApp) e **diálogo de
formato PDF/Imagem** (`components/app/formato-dialog.tsx` +
`botao-comprovante.tsx`) nos fluxos de espelho do cliente, espelho/
comprovante de venda e toast de quitação — `?formato=imagem` abre sem
auto-print. Decisão do dono: relatórios NÃO têm exportação em imagem
(card canvas ficava ilegível); o fluxo de perguntar o formato é
inegociável (paridade v1).

**Ponto de partida da próxima sessão — F4d-2 Analytics:**

1. Escopo em `docs/00`: faturamento por dia, top clientes, pagas × em
   aberto, KPIs do período. Conferir a referência do v1 em
   `../erp-simples/fiadoapp-study/` (dashboard/relatórios) para paridade.
2. Padrão: branch nova → dados via consultas RLS (ou RPC agregada nova em
   migration aditiva, se necessário — aí rodar `test:rls`) → gráficos
   seguindo o padrão do Gaveta → validação local completa → E2E headless →
   push → Preview → 👤 valida → merge squash.
3. Depois: F4d-3 Preferências (tema claro toggle + marca do Gaveta no
   header do app — `lib/marca.ts` já existe) e F4d-4 cadastro/recuperação
   + `/privacidade`.

**Técnicas/gotchas novos desta sessão:**

- **PNG dos comprovantes**: `html-to-image` (dep client-side, import
  dinâmico no clique) renderiza o node do papel com `pixelRatio: 3` e
  `backgroundColor: "#ffffff"`. A CSP já permite (`img-src data: blob:`;
  fetch da logo do Supabase coberto por `connect-src`). Web Share de
  arquivo exige gesto do usuário — nunca auto-disparar share no load.
- **Diálogo de formato**: toasts do sonner só têm UMA action — para
  "Ver comprovante" com escolha de formato, a action abre o
  `FormatoDialog` (estado local) em vez de `window.open` direto.
- `lib/relatorio.ts` embute o BOM como caractere U+FEFF literal dentro de
  aspas (invisível no editor!) — o teste `csv.startsWith("﻿")`
  protege contra remoção acidental. Cuidado com sed/perl nesse arquivo.
- E2E: `context.addInitScript` (não `page.`) para stubar
  `navigator.canShare` também nas abas abertas via `window.open`;
  downloads com `page.waitForEvent("download")` + `download.path()`;
  locators de lista escopados em `main` (o nav do header também tem
  `ul > li`); marca personalizada testável setando
  `profiles.brand_name` via admin client no usuário descartável.
- `npm i <pacote>` remove os pacotes `--no-save` órfãos (pg/mysql2 da
  migração) — é prune normal, reinstalar quando precisar.

## Estado 2026-07-08 (tarde): F4c COMPLETA e mesclada — sprint SEGUIU na F4d

**Onde paramos:** F4c validada pelo dono e mesclada (PR #6, squash
`3693860`), já incluindo a melhoria **espelho do cliente**: rota
`/comprovante/cliente/[clienteId]` agrupa TODAS as vendas em aberto do
cliente (itens, vencimento, pago/falta por venda, total em aberto) com o
fluxo dos comprovantes (Imprimir + Web Share + WhatsApp direto ao
telefone); botão "Espelho das vendas" no `/clientes/[id]` (só com vendas
em aberto); builder `textoEspelhoCliente` em `lib/comprovante.ts`.
E2E verificado com Playwright headless (specs temporários apagados).
**O dono pediu para NÃO encerrar a sprint** — seguir direto para a F4d
(relatórios + preferências + cadastro/recuperação + privacidade, ver
roadmap).

**Contexto para a F5 (pergunta do dono em 2026-07-08):** como fica o
compartilhamento de documentos no mobile com PWA/TWA (hoje o APK WebView
abre a caixa do Android). Resposta dada: a Web Share API já usada no
`PrintToolbar` abre a MESMA caixa nativa no Chrome/PWA/TWA sem bridge;
`wa.me` abre o WhatsApp por deep link; documentos em `target="_blank"`
viram Custom Tab por cima do app (fechar volta ao app). Ajustes
planejados para a F5: (1) auto-`window.print()` só em desktop — no
celular atrapalha o fluxo de compartilhar; (2) se a F4d mantiver o
relatório-IMAGEM do v1, usar Web Share Level 2 (`navigator.share({files})`)
para anexar o PNG.

**O que a F4c entregou (PR #6):** `/inadimplentes` (dias de atraso, devido
= restante da venda), `lib/whatsapp.ts` (cobrança padrão v1 + envio de
texto pronto), espelho/comprovante de venda em `/comprovante/[vendaId]`
(título muda com o status: "Espelho da venda" aberta, "Comprovante de
venda" paga), comprovante de quitação em
`/comprovante/quitacao/[clienteId]?em=<timestamp>` (o `now()` único da RPC
identifica o ato; `registrarPagamento` devolve `pagoEm` e o toast ganha
"Ver comprovante"), histórico de vendas pagas em
`/clientes/[id]/historico`, botões WhatsApp no detalhe do cliente/venda.

**Técnicas/gotchas novos desta sessão:**

- **E2E sem extensão Chrome**: Playwright headless com spec TEMPORÁRIO em
  `tests/e2e/` (apagar antes do commit) + usuário Supabase descartável via
  admin API. O config reusa o `npm run dev` já aberto. `window.print()` é
  inofensivo no headless. Gotchas de locator: `getByLabel("Nome")` colide
  com "Sobrenome" (usar `getByRole("textbox", { name, exact: true })`);
  o botão "mostrar senha" colide com o label "Senha". Os helpers de
  `tests/rls/helpers.ts` leem `process.env` no load do módulo — no spec,
  carregar o `.env.local` com dotenv ANTES e importá-los com `await
  import(...)` dinâmico.
- `formatBRL` usa espaço não separável (U+00A0) — em asserts de texto,
  comparar só o número ("185,30").
- Comprovante: `@page` estático no CSS module (sem `<style>` inline/CSP);
  flag de Web Share com `useSyncExternalStore` (o lint
  `react-hooks/set-state-in-effect` barra setState em effect).
- F4d (relatórios): expliquei ao dono que o layout muda para o padrão v2
  mantendo filtros/dados do v1; saída = página de impressão + CSV + Web
  Share. Ele pode pedir o formato IMAGEM do v1 (card p/ WhatsApp) —
  decidir com ele na F4d.

## Estado 2026-07-07 (noite): F4b concluída e mesclada

PR #5 (squash `2699e45`) validado pelo dono: `/vendas` (lista+filtros),
`/vendas/nova`, `/vendas/[id]`, `/clientes/[id]` com quitações
total/selecionadas/parcial em cascata. Sem migration nova. **Próximo:
F4c — Inadimplentes + WhatsApp + comprovantes + histórico do cliente.**

Aprendizados novos:

- **loading.tsx por segmento**: o App Router usa a Suspense boundary mais
  próxima do segmento que muda — a `(app)/loading.tsx` NÃO cobre navegações
  dentro de `/clientes` ou `/vendas`. Padrão adotado: re-export do loader em
  cada segmento com filhos (`clientes/`, `clientes/[id]/`, `vendas/`).
  Rotas novas da F4c+ devem seguir o mesmo padrão.
- Verificação de loader em transição: screenshot via CDP perde a corrida;
  usar `MutationObserver` no body procurando o texto "Carregando" antes de
  clicar, e ler a flag depois.
- Erros de negócio das RPCs (raise exception) são mostrados ao usuário só
  se estiverem na whitelist `ERROS_RPC_CONHECIDOS` de
  `app/(app)/vendas/actions.ts` — novas RPCs devem registrar lá as
  mensagens seguras.

## Estado da sessão encerrada em 2026-07-07 (F2 + F3 + F4a concluídas)

**Onde paramos:** PRs #2 (modelo de dados), #3 (migração) e #4 (Clientes +
Dashboard) mesclados na `main` e validados pelo dono. Working tree limpa.
Produção em `https://fiadoapp-v2.vercel.app`: Painel com KPIs REAIS
(A Receber R$ 3.340,00 na data da migração) e Clientes completo (A–Z, busca,
filtros, CRUD, badges). Vendas/Inadimplentes/Relatórios ainda placeholders.

**O que existe no banco (compartilhado com o Gaveta):**

- Migrations 0001 (tabelas `fiado_*` + RLS + RPCs `fiado_registrar_venda`,
  `fiado_registrar_pagamento` cascata, `fiado_resumo_dashboard`) e 0002
  (`fiado_clientes_com_saldo`) — ambas APLICADAS.
- Dados reais do dono migrados (61 clientes, 247 vendas na data) para a conta
  `adriano.cardoso97@gmail.com` (id `8b43f787-...`). ⚠️ O dono tentou logar
  no v2 com o e-mail do app ANTIGO (`ademir.cardoso65@outlook.com`) — o login
  do v2 é a conta do GAVETA; explicar isso se voltar a confundir.
- Suíte `test:rls` com 19 testes (isolamento + funcional das RPCs).

**Próximo passo: F4b — Vendas + Quitações** (paridade v1, ver `docs/00`):

1. Nova venda: cliente existente (autocomplete) ou novo inline, itens
   dinâmicos com autocomplete de descrição, máscara BRL, data compra +
   vencimento (auto +30d), observação. **A RPC `fiado_registrar_venda` já
   existe e está testada** — é só UI + action + Zod (`lib/validations/`).
2. Detalhe e exclusão de venda; lista de vendas.
3. Quitações (total / selecionadas / valor parcial em CASCATA) na tela do
   cliente — **RPC `fiado_registrar_pagamento` pronta**; decisão do dono:
   parcial abate das mais antigas; overpay é rejeitado pela RPC.
4. Alerta de limite de crédito ao vender (badge/aviso, NUNCA bloqueia).
5. Fluxo: branch → validação local completa (lint+tsc+test+build+test:rls)
   → verificação E2E no navegador → push → Preview → 👤 valida → merge.

**Técnicas/gotchas novos desta sessão:**

- Verificação E2E local: script temporário que cria usuário Supabase de
  teste + dados via RPCs (admin API + anon key com Bearer), `npm run dev`,
  Claude in Chrome para dirigir o fluxo; apagar usuário e script ao final.
- Base UI: não trocar `defaultValue` de input não controlado após submit —
  usar `key` no `<form>` para remontar (ver `cliente-form.tsx`).
- Hydration warning do nonce CSP na página de login é PRÉ-EXISTENTE da F1
  (React + CSP nonce, só ruído dev) — candidato a polimento na F4d.
- Polimento pendente menor: telefone aparece como dígitos crus no form de
  edição (a lista formata com `lib/format.ts`).
- Cuidado com `prettier --write` em pastas largas: reformata arquivos fora
  do escopo — rodar só nos arquivos novos/tocados e conferir `git status`.
- Snapshots/relatórios da migração F3: `C:\Users\adria\Documents\fiado-migracao\`
  (fora do repo). Script `scripts/migracao/migrar.mjs` re-roda na F5
  (`dry-run --usuario ademir.cardoso65@outlook.com --conta adriano.cardoso97@gmail.com`).

**Decisões/gotchas da F1 (além dos registrados no roadmap):**

- Tema ESCURO é o padrão (cookie `fiado_theme`; script anti-FOUC no
  `app/layout.tsx` ADICIONA `.dark` — lógica inversa à do Gaveta). Tema claro
  usa coral escurecido `#C9503A` como primary (contraste AA); toggle fica
  para a F4d.
- Logo: `public/logo.png` e `app/icon.png` são o `ic_launcher.png` 192px do
  APK antigo (33 KB). O `fiadoapp-study/assets/img/logo.png` original tem
  3,3 MB — não usar direto.
- `fiadoapp.vercel.app` é de terceiros e `fiadoapp` (repo GitHub) colide com
  o `FiadoApp` antigo (case-insensitive) — por isso `fiadoapp-v2` nos dois.
- Deployment Protection da Vercel ativa: previews respondem 302 → SSO para
  anônimos (produção é pública). Smoke test anônimo só contra produção.
- Plugin MCP da Vercel dá 404 no team; usar o CLI `vercel` (logado).
- Envs na Vercel: Supabase (URL, anon, service role) + Upstash em
  production/preview. `SUPABASE_DB_URL` propositalmente SÓ no `.env.local`;
  `NEXT_PUBLIC_SITE_URL` fica para o cutover (F5).

## Referência de comportamento (app antigo)

Clone de leitura: `../erp-simples/fiadoapp-study/` (PHP). Produção:
`https://fiadoapp.net`. Entendimento completo registrado na memória da sessão
do Gaveta (`fiadoapp-overview`) e resumido em `docs/00` e `docs/02` daqui.
