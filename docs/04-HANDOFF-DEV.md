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

| Origem (Gaveta) | Destino (Fiado) |
|---|---|
| `lib/security/csp.ts` + headers no `next.config.ts` | idem (ajustar domínios) |
| `proxy.ts`/middleware de auth + `lib/supabase/{server,client,middleware}` | idem |
| Rate limiting Upstash (`lib/` + uso nas actions) | idem (prefixo de chave `fiado:`) |
| `lib/validations/*` (padrão Zod) | novos schemas do domínio fiado |
| Design tokens/`globals.css` (transições motion-safe, foco, alvos ≥44px) | re-tematizar coral #E8624A |
| Loader de marca (`components/app/gaveta-loader*`) | versão FiadoApp |
| Rota `/comprovante/[id]` (print CSS + auto-print + Web Share) | comprovante de quitação/pagamento |
| `tests/` (estrutura Vitest/Playwright/RLS) | idem |
| `.github/workflows/backup-db.yml` | NÃO duplicar — o backup do Gaveta já cobre o banco todo |

## Referência de comportamento (app antigo)

Clone de leitura: `../erp-simples/fiadoapp-study/` (PHP). Produção:
`https://fiadoapp.net`. Entendimento completo registrado na memória da sessão
do Gaveta (`fiadoapp-overview`) e resumido em `docs/00` e `docs/02` daqui.
