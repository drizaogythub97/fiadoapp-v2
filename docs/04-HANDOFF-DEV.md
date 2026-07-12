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
| Fluxos signup/recover/reset + `/privacidade`                              | textos adaptados ao FiadoApp + `ui/checkbox`            | ✅ F4d-4                   |
| `.github/workflows/backup-db.yml`                                         | NÃO duplicar — o backup do Gaveta já cobre o banco todo | —                          |

## Estado 2026-07-12: SPRINT ENCERRADA — padrão mobile replicado no Gaveta; PRÓXIMO = F6

**Onde paramos:** os DOIS apps do ecossistema estão em produção com o
padrão mobile F5b (Fiado: fiadoapp.net, PR #15; Gaveta:
gaveta-erp.vercel.app, PRs gaveta#16 e gaveta#17 — ver roadmap F5b).
Working trees limpos, branches apagadas.

**Ponto de partida exato da próxima sessão: F6 — Ecossistema** (seção F6
do roadmap; estratégia aprovada em 2026-07-09, ver memórias). Ordem
sugerida: Descoberta (página `/ecossistema` + card em Configurações +
anúncio dispensável no Painel, NOS DOIS apps) e Estágio 1 (app switcher
no header + abrir o outro app). ⚠️ Decisão de design pendente do Estágio
1: os apps têm domínios diferentes — "abrir já logado" precisa definir a
técnica (mesmas credenciais Supabase ≠ sessão compartilhada entre
domínios; avaliar simplesmente abrir o outro domínio e deixar o login
dele agir, antes de inventar handoff de sessão).

**Gotchas novos (trabalho no Gaveta):**

- Gaveta mescla com **merge commit** (`--merge`), não squash.
- O emissor de comprovante portado vive em
  `components/receipt/emissor-comprovante.tsx` (Gaveta) com
  `useEmissorComprovante({ onErro })` — o Fiado usa toast interno; no
  Gaveta o erro sobe pro caller (feedback do caixa / sonner).
- `lib/receipt/data.ts` (Gaveta) é o loader ÚNICO de comprovante
  (preview + server action `dadosComprovante`).
- Regra `react-hooks/immutability` do Gaveta barra `document.cookie =`
  dentro de componente — içar para função de módulo.
- O papel do cupom do Gaveta tem largura física própria (80/58 mm) — o
  emissor NÃO força 420px como no Fiado.

## Estado 2026-07-11 (noite): SPRINT ENCERRADA — F5b mobile COMPLETA e em produção

**Onde paramos:** working tree limpa, `main` = produção em fiadoapp.net
com a **F5b inteira** (squash `87a5f3b`, PR #15 aprovado sem ressalvas).
O celular agora tem dois modos por aparelho: **Simples** (o de sempre,
organizado) e **Minimalista** (opt-in; bottom nav, escala densa, listas
tocáveis, comprovantes com share nativo). Detalhes por entrega no roadmap
(seção F5b).

**Ponto de partida exato da próxima sessão:**

1. **Replicar o padrão mobile no Gaveta** — ler `docs/05-MOBILE-UI-SPEC.md`
   daqui e o `CLAUDE.md` de `../erp-simples`; branch lá → Preview →
   validação do dono. Incluir os aprendizados das rodadas de validação
   (escala minimal, legends com `mb-2`, dropdown de iniciais, segmentados).
2. Só depois da replicação validada: **F6 Ecossistema** (estágios no
   roadmap; estratégia aprovada em 2026-07-09).

**Técnicas/gotchas novos desta sprint:**

- **PRs empilhados**: o #12 foi squashado na main ANTES de #13/#14 subirem
  a pilha → main ficou só com F5b-1 e o PR final conflitou. Solução usada:
  a branch final era superconjunto estrito (`git diff` vazio entre o squash
  da main e o commit correspondente da branch) → `git merge -s ours
  origin/main` na branch + squash normal do PR. Evitar pilhas; se usar,
  mesclar de cima para baixo.
- **Playwright não emula `hover`/`pointer`** junto com o device (issue
  antiga) → `isDesktop()` do app retorna true no teste. E2E do fluxo
  mobile precisa de `addInitScript` com stub de `matchMedia`
  (`hover: hover` → false) + stub `navigator.canShare = undefined` para o
  emissor cair no download observável. `Emulation.setEmulatedMedia` via
  CDP NÃO persiste (o Playwright reaplica o estado dele).
- **`<legend>` fica fora do layout flex do fieldset** → `gap` não a afasta
  dos controles; usar `mb-2` na própria legend.
- **`<fieldset>` tem `min-inline-size: min-content`** → conteúdo largo
  (trilho horizontal) estoura a página; `min-w-0` resolve.
- **Escala do Minimalista (mobile)**: h1 `text-xl`, título de card
  `text-base`, corpo `text-sm`, meta `text-xs`; botão primário `h-11`,
  secundário `h-10 px-3 text-sm`, diálogos `h-11`/`h-10`. Variantes
  minimal de componente compartilhado vão na BASE do componente DEPOIS do
  override do caller (ver `BotaoComprovante`).
- Comprovante mobile: papel oculto com **420px** de largura = retrato
  (720px saía "deitado" — validação do dono).

## Estado 2026-07-10 (noite): SPRINT ENCERRADA — 🚀 CUTOVER FEITO: fiadoapp.net É O V2

**Onde paramos:** working tree limpa, `main` = produção em
**`https://fiadoapp.net`** (domínio definitivo, cutover concluído hoje).
F4d-4 (PR #10, squash `405f9f3`) e F5-PWA (PR #11, squash `4d5a264`)
mescladas e validadas. Migração FINAL feita na janela de congelamento:
61 clientes, 248 vendas, 372 itens, 192 pagamentos, **zero divergência**
(relatórios em `..\fiado-migracao`). O app PHP está congelado como
fallback (reverter o registro A no hPanel o restaura; `A ftp` preservado).
`fiadoapp-v2.vercel.app` continua como alias da mesma produção.

**O que a F4d-4 entregou (PR #10):** `/signup`, `/recover`, `/reset`
(portados do Gaveta: rate limit, Zod no servidor, política de senha),
`/privacidade` adaptada (dados = clientes/vendas/pagamentos; exclusão
avisa da conta única do ecossistema), links Criar conta/Esqueci a senha
no login, `components/ui/checkbox.tsx` portado, e correção: o callback
de e-mail redireciona com código fixo `?error=link_invalido` e o login
exibe a mensagem (nunca refletir texto da URL).

**O que a F5 entregou (PR #11 + operações):** PWA instalável (manifest,
SW SEM cache de propósito — app online, cache autenticado vazaria dados;
ícones any+maskable gerados do logo 2048px do v1 com fundo coral
amostrado), auto-print de comprovante só desktop
(`matchMedia("(hover: hover) and (pointer: fine)")`), Lighthouse
97/96/100/100, security-review sem achados. Operações: NEXT_PUBLIC_SITE_URL
= `https://fiadoapp.net` (production+preview na Vercel), domínios
fiadoapp.net+www no projeto Vercel, DNS trocado no hPanel, smoke test
completo no domínio novo.

**Pendências deixadas de propósito:**

1. ⚠️ **Sair do Vercel Hobby** (termos vedam uso comercial) — dono decidiu
   manter POR ORA (2026-07-10); upgrade Pro é só no painel.
2. **TWA na Play Console** (👤) + `assetlinks.json` (precisa do fingerprint
   SHA-256 da chave de assinatura, só existe quando a TWA for criada).
3. **Contraste do botão primário** (Lighthouse A11y 96): coral `#E8624A` +
   branco ≈ 3,3:1 (AA pede 4,5) — pré-existente da F1 em todo o app;
   corrigir muda o visual de todos os botões → decisão do dono.
4. Plano Hostinger pode expirar **mantendo o registro do domínio**.
5. Venda do Arthur (1, mai/2026) NÃO migrada — fica no backup/app antigo.

**Ponto de partida da próxima sessão: F6 — Ecossistema opt-in** (ver
roadmap e `memory/ecossistema-autonomia`): descoberta (card em
Configurações + anúncio + gatilho + `/ecossistema`) e Estágio 1 (app
switcher). Antes, conferir se o dono já rodou o prompt de padronização
no Gaveta (IA de Configurações) — impacta o card de descoberta lá.

**Técnicas/gotchas novos desta sessão:**

- **Supabase Auth do projeto compartilhado**: (a) o allowlist de Redirect
  URLs NÃO tinha o Fiado — e-mails de recuperação caíam em
  `gaveta-erp.vercel.app`; dono adicionou `fiadoapp-v2.vercel.app/**`,
  `localhost:3000/**` e `fiadoapp.net/**` (testar com
  `admin.generateLink` + conferir `redirect_to` do action_link);
  (b) **confirmação de e-mail está DESLIGADA** — signup cria sessão na
  hora e o Next re-renderiza a página → cai logado no /dashboard (o ramo
  de "e-mail de confirmação" do form nunca roda); decisão: manter
  (paridade v1; ligar exigiria SMTP próprio e afetaria o Gaveta);
  (c) mensagem genérica p/ e-mail já cadastrado: manter (anti-enumeração).
- **E2E de recuperação de senha sem ler e-mail**: `admin.generateLink({
  type: "recovery" })` e montar
  `/auth/callback?token_hash=<hashed_token>&type=recovery&next=/reset`
  (mesmo formato do template com TokenHash; dispensa allowlist e SMTP).
- **Checkbox do Base UI**: o `id` passado vai para um input escondido — no
  Playwright usar `getByRole("checkbox")`, não `#id` (o span intercepta).
- `CardTitle` do design system é `<div>`, não heading — asserts E2E devem
  mirar botão/label (spec protected-routes corrigido).
- **Ícones**: `npm i sharp --no-save` + script temporário (trim → resize;
  maskable = canvas na cor amostrada do próprio logo + safe zone 80%;
  `png({ palette: true })` derruba 245KB→68KB).
- **DNS Hostinger**: além do A `@`, existia **AAAA (IPv6) da Hostinger** —
  tinha que REMOVER, senão redes IPv6 continuariam no app antigo. `A ftp`
  fica (fallback). TTLs 1800/300 → propagação rápida.
- Enquanto o DNS local não propaga, testar produção com
  `curl --resolve fiadoapp.net:443:76.76.21.21` (cache local segura o IP
  velho por até 30 min; 404 com headers Apache = ainda no Hostinger).
- **Remote MySQL**: o IP local mudou de novo (177.196.12.178 liberado em
  2026-07-10). O erro "Access denied ... @'IP'" = IP fora do allowlist.
- `vercel env add NEXT_PUBLIC_SITE_URL production` via stdin funciona;
  trocar valor = `env rm --yes` + `env add`; depois
  `vercel redeploy <url-de-produção>` para aplicar.
- Gmail MCP expirou o token no meio da sessão — a alternativa
  `generateLink` acima é melhor de qualquer forma.

## Estado 2026-07-10 (manhã): F4d-2 e F4d-3 mescladas; estratégia do ecossistema definida

**Onde paramos:** working tree limpa, `main` = produção com F4d-2 Analytics
(PR #8, squash `60dbb52`) e F4d-3 Configurações (PR #9, squash `2cdef9b`),
ambas validadas pelo dono. Migrations **0003 e 0004 APLICADAS** no banco.
Produção: `https://fiadoapp-v2.vercel.app`.

**Decisão estratégica do dono (2026-07-09) — LER `memory/ecossistema-autonomia`
e a F6 do roadmap:** os apps do ecossistema são AUTÔNOMOS; "padrão Gaveta" =
qualidade, não dependência. Integração Gaveta⇄Fiado será OPT-IN (5 estágios,
descoberta por card/anúncio/gatilho + `/ecossistema`). Consequência já
aplicada: a marca da loja virou recurso NATIVO do Fiado (a herança de
`profiles` do Gaveta foi revertida no próprio PR #9). NUNCA criar recurso do
Fiado que dependa de tabela do Gaveta como única fonte.

**O que a F4d-2 entregou (PR #8):** `/analytics` — atalhos de período
(Este mês/30/90/Este ano) + datas, 5 KPIs (Recebido inclui parciais), linha
de faturamento/dia em SVG PRÓPRIO (sem dependência; dias sem venda = 0;
tooltip por hover/teclado; "Ver dados em tabela"), top 10 em barras de cor
única, Pagas × Em aberto como barra empilhada + % (rosca de 2 fatias é
anti-padrão). Lógica pura em `lib/analytics.ts` (14 testes).

**O que a F4d-3 entregou (PR #9):** aba **Configurações** → landing com 2
cards (IA padronizada com o Gaveta; prompt para o Gaveta fazer o mesmo foi
entregue ao dono — conferir se já foi executado lá antes de referenciar):
- `/configuracoes/preferencias`: tema Escuro⇄Claro (cookie `fiado_theme`
  setado no CLIENTE via document.cookie — o script anti-FOUC da F1 lê);
  **marca nativa** (`fiado_preferencias.brand_name/brand_logo_path`,
  migration 0004; editor nome + logo com `react-image-crop`, recorte
  quadrado 256px webp, magic bytes no servidor; upload no bucket
  compartilhado `brand-logos` com prefixo de ARQUIVO `fiado-` — as policies
  de Storage por pasta do usuário já cobrem); limite padrão + por cliente
  (migration 0003: RPC `fiado_clientes_com_saldo` ganhou `limite_efetivo`;
  precisou DROP+CREATE porque o tipo de retorno mudou — roda numa transação
  só). `lib/marca.ts` agora lê `fiado_preferencias` (header + comprovantes).
- `/configuracoes/conta`: alterar nome (user_metadata + espelho best-effort
  em `profiles`), e-mail e senha (reautenticação + rate limit `reauth`;
  política `checkPasswordStrength`), exclusão de conta (admin API + limpeza
  do Storage; o aviso deixa claro que apaga o Gaveta junto — conta única).

**Ponto de partida da próxima sessão — F4d-4 (cadastro/recuperação +
`/privacidade`), já ESCOPADO nesta sessão:**

1. `lib/validations/auth.ts`: portar do Gaveta os schemas
   `signupSchema`/`recoverSchema`/`resetSchema` (diff conferido — é só
   acrescentar; `lib/auth/errors.ts` já é IDÊNTICO).
2. Portar de `../erp-simples/app/(auth)/`: `signup/`, `recover/`, `reset/`
   (actions + forms + pages) e `app/privacidade/page.tsx` (adaptar o texto:
   FiadoApp, dados = clientes/vendas/pagamentos; mencionar a conta única do
   ecossistema na seção de exclusão). Adicionar links "Criar conta" e
   "Esqueci a senha" no login do Fiado.
3. ⚠️ `components/ui/checkbox.tsx` NÃO existe no Fiado (o signup do Gaveta
   usa) — portar junto.
4. ⚠️ `NEXT_PUBLIC_SITE_URL` não está setada (siteUrl cai em localhost) —
   os e-mails de confirmação/recuperação em Preview/produção precisam dela
   ou do redirect certo; hoje está planejada só para o cutover (F5). Decidir
   na F4d-4 (ex.: setar para a URL de produção atual).
5. Nuance do ecossistema no signup: e-mail já cadastrado (conta do Gaveta)
   → a mensagem genérica de `toPortugueseAuthError` já cobre ("entre ou
   recupere a senha").
6. Depois da F4d-4: **F5 (PWA + cutover)**; a fase Ecossistema (nova F6) é
   pós-F5.

**Técnicas/gotchas novos desta sessão:**

- **Migration que muda tipo de retorno de função**: `create or replace` NÃO
  basta — `drop function` + `create function` no mesmo arquivo (o script
  `pg` roda o arquivo inteiro numa transação; atômico p/ produção).
- **E2E de upload com recorte**: gerar PNG via canvas em `page.evaluate`
  (toDataURL → Buffer) + `setInputFiles`; o `onComplete` do ReactCrop só
  dispara com interação — arrastar com `page.mouse` dentro de `.ReactCrop`.
- **Specs com estado encadeado**: `test.describe.configure({ mode:
  "serial" })` (senão cada teste pode ganhar worker/usuário próprios).
- Logout tem ConfirmDialog — E2E precisa confirmar o "Sair" do diálogo.
- SVG de gráfico: `page.locator("svg").first()` pega ícone do nav — escopar
  por `getByLabel` do wrapper; screenshot pós-navegação corre contra o
  ResizeObserver → assertar conteúdo do gráfico antes.
- Charts (skill dataviz): rosca de 2 fatias e arco-íris por barra são
  anti-padrões — barra empilhada única e cor única de série; linha com eixo
  de tempo contínuo (zero-fill) em vez de pular dias como o v1.
- Rota movida deixa types velhos em `.next` (erro tsc fantasma) —
  `rm -rf .next`.
- `npm i <pacote>` continua removendo os `--no-save` (pg) — reinstalar
  quando precisar. Dependência nova: `react-image-crop`.
- Não usar `python - <<EOF` nesta máquina (trava; sem python no PATH).

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
