# CLAUDE.md — Instruções do projeto para o Claude Code

Este arquivo orienta o Claude Code ao trabalhar neste repositório. Leia-o por inteiro antes de começar e siga o roadmap em `docs/01-ROADMAP-FASES.md`.

## O que é este projeto

**Fiado v2** — reescrita completa do FiadoApp (controle de vendas a prazo/"fiado" para pequenos comerciantes) no "padrão Gaveta": mesma stack, mesmas práticas de segurança, desempenho, acessibilidade e fluxo de trabalho do ERP Gaveta (`github.com/drizaogythub97/gaveta`, produção em `gaveta-erp.vercel.app`).

- **App antigo (referência de comportamento):** PHP/MySQL em produção em `https://fiadoapp.net` (repo `github.com/drizaogythub97/FiadoApp`; clone de leitura em `../erp-simples/fiadoapp-study/`). O v2 deve ter **paridade funcional** com ele.
- **Usuário real:** o dono usa o FiadoApp diariamente no comércio dele. Os dados de produção (MySQL/Hostinger) **serão migrados sem perda** — ver `docs/03-MIGRACAO-DADOS.md`.
- **Identidade visual:** mantém a marca FiadoApp (coral `#E8624A`, tema escuro) sobre o design system e a acessibilidade do Gaveta. "Padrão Gaveta" ≠ "cara do Gaveta".
- **Ecossistema:** Fiado e Gaveta são apps separados com **SSO nativo** (mesmo projeto Supabase/Auth) e navegação cruzada. Ver Fase F6 do roadmap.

## Stack (não trocar sem pedir)

- **Next.js (App Router) + TypeScript + React**
- **Tailwind CSS + shadcn/ui**
- **Supabase** (PostgreSQL + Auth + Row Level Security) via `@supabase/ssr`
- **Vercel** para deploy (manter portável para Cloudflare Pages — o uso é comercial; decisão de hosting definitivo no cutover, ver roadmap F5)
- **Vitest** + **Playwright** (E2E); validação com **Zod**

## ⚠️ Banco COMPARTILHADO com o Gaveta — regra crítica

Este projeto usa **o mesmo projeto Supabase do Gaveta** (ref `jipavekxqsbzslcqpxmb`) — é isso que dá o SSO do ecossistema. Consequências inegociáveis:

1. Todas as tabelas deste app usam o prefixo **`fiado_`** no schema `public`. **NUNCA** criar/alterar/derrubar tabelas do Gaveta (`products`, `sales`, `profiles`, `expenses`, `cash_sessions`, etc.).
2. Migrations **sempre aditivas** e compatíveis — o banco atende a produção do Gaveta E do Fiado ao mesmo tempo. Numeração própria deste repo (`supabase/migrations/0001_...`).
3. Aplicar migration **antes** do push (sem psql/docker na máquina: `npm i pg --no-save` + script `.mjs` com dotenv + `pg.Client({ssl:{rejectUnauthorized:false}})` lendo `SUPABASE_DB_URL` do `.env.local`; apagar o script depois).
4. RLS ativo em toda tabela `fiado_*` desde a migration que a cria; suíte `npm run test:rls` própria contra o banco real.

## Regras inegociáveis de segurança (padrão Gaveta)

1. **RLS sempre ativo**; políticas por `user_id = auth.uid()`. Nunca desabilitar.
2. A **service_role/secret key NUNCA** vai ao cliente (sem `NEXT_PUBLIC_`, sem Client Components).
3. No servidor, proteger rotas com `supabase.auth.getUser()` — nunca confiar em `getSession()`.
4. **Validar toda entrada com Zod no servidor**, não só no cliente.
5. Nunca commitar `.env*`. Segredos só em `.env.local` (dev) e no painel da Vercel.
6. Mensagens de erro ao usuário são genéricas; não vazar SQL/stack/segredos.
7. CSP com nonce + strict-dynamic, headers de segurança e rate limiting (Upstash) — portar de `../erp-simples/lib/security/` e `next.config.ts` do Gaveta.

## Comandos

```bash
npm run dev        # desenvolvimento (localhost:3000)
npm run build      # build de produção
npm run lint       # ESLint
npm run test       # Vitest
npm run test:rls   # suíte RLS contra o banco real
npm run test:e2e   # Playwright
```

## Convenções de código

- TypeScript estrito. Componentes em `components/`, lógica em `lib/`, schemas Zod em `lib/validations/`.
- Server Components por padrão; `"use client"` só com interatividade.
- Nomes de variáveis/commits em inglês; **textos de interface em português** (claros e simples — público com pouca destreza tecnológica, mesmo perfil do Gaveta).
- Conventional Commits. Acessibilidade: contraste AA, alvos ≥44px, fontes grandes, aria.

## Fluxo de trabalho (idêntico ao Gaveta)

1. **`main` é produção** (deploy automático na Vercel após o cutover). Toda mudança em branch → push → **Preview Deployment** → aprovação do dono → merge. Nunca commitar direto na `main` (exceção: docs, quando o dono pedir).
2. Antes de todo push: `npm run lint && npx tsc --noEmit && npm run test && npm run build` (+ `test:rls` se mexeu em banco).
3. Seguir as fases do roadmap em ordem; ao fim de cada fase, rodar lint+test e descrever o que foi entregue.
4. Não inventar requisitos fora da paridade v1 + correções aprovadas (ver `docs/00-VISAO-GERAL.md`).

## Referências

- Visão e escopo: `docs/00-VISAO-GERAL.md`
- Roadmap de fases: `docs/01-ROADMAP-FASES.md`
- Modelo de dados: `docs/02-MODELO-DE-DADOS.md`
- Migração de dados: `docs/03-MIGRACAO-DADOS.md`
- Handoff de dev (acessos/técnicas): `docs/04-HANDOFF-DEV.md`
- App antigo (leitura): `../erp-simples/fiadoapp-study/` e `https://fiadoapp.net`
- Padrões a portar: repo do Gaveta em `../erp-simples/`
