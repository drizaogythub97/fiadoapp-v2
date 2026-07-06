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

| Origem (Gaveta) | Destino (Fiado) | Status |
|---|---|---|
| `lib/security/csp.ts` + headers no `next.config.ts` | idem | ✅ F1 |
| `proxy.ts`/middleware de auth + `lib/supabase/{server,client,middleware}` | idem | ✅ F1 |
| Rate limiting Upstash (`lib/` + uso nas actions) | prefixo de chave `fiado:` | ✅ F1 |
| `lib/validations/*` (padrão Zod) | novos schemas do domínio fiado | ✅ base F1; domínio na F2+ |
| Design tokens/`globals.css` | re-tematizado coral #E8624A, escuro padrão | ✅ F1 |
| Loader de marca (`gaveta-loader*`) | `components/app/fiado-loader*` (2 variantes) | ✅ F1 |
| Rota `/comprovante/[id]` (print CSS + auto-print + Web Share) | comprovante de quitação/pagamento | F4c |
| `tests/` (estrutura Vitest/Playwright/RLS) | Vitest+configs ✅ F1; suíte RLS | F2 |
| Fluxos signup/recover/reset + `/privacidade` | adiados intencionalmente | F4d |
| `.github/workflows/backup-db.yml` | NÃO duplicar — o backup do Gaveta já cobre o banco todo | — |

## Estado da sessão encerrada em 2026-07-06 (F1 concluída)

**Onde paramos:** F1 mesclada na `main` (PR #1, squash) e validada pelo dono.
Produção viva em `https://fiadoapp-v2.vercel.app` (login com conta do Gaveta
funciona; Painel é casca com KPIs "—"; Clientes/Vendas/Inadimplentes/Relatórios
são placeholders "em construção"). Working tree limpa, sem branch pendente.

**Próximo passo: Fase F2** (`docs/01` + modelo em `docs/02`):

1. Antes de codar, colher do dono as duas decisões de produto da F2:
   pagamento parcial (abatimento em cascata das vendas mais antigas, como no
   v1, vs pagamento por venda) e limite de crédito (bloqueia ou só alerta).
2. Migration `supabase/migrations/0001_...` — tabelas `fiado_*` com RLS desde
   a criação, índices e RPCs transacionais. Aplicar com a técnica `pg` acima
   (`SUPABASE_DB_URL` já está no `.env.local` local) ANTES do push.
3. Suíte `test:rls` (o `vitest.rls.config.ts` já existe e espera
   `tests/rls/setup.ts` + `tests/rls/**/*.test.ts` — portar helpers de
   `../erp-simples/tests/rls/`).
4. Fluxo: branch → validação local completa → push → Preview → 👤 valida → merge.

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
