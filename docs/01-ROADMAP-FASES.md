# 01 — Roadmap de Fases

Concluir uma fase (com validação do dono) antes da próxima.
Legenda: 🤖 = Claude · 👤 = dono (Adriano)

## F0 — Hardening do FiadoApp PHP em produção ✅ CONCLUÍDA (2026-07-06)

Feita no repo antigo (`FiadoApp`, PR #1 + hotfix `c42536f`): IDORs corrigidos,
erros genéricos, rate limit no cadastro, senha mínima, libs self-hosted em
`assets/vendor/` (gotcha: a regra `vendor/` do .gitignore precisou virar
`/vendor/`), documentos pessoais removidos do repo e do servidor.
Descoberta: a Hostinger sobrescreve o header CSP no servidor.

## F1 — Fundação do Fiado v2 ⏳ EM ANDAMENTO

- [x] 🤖 Repo `fiado` + esta documentação
- [ ] 🤖 Scaffold: `create-next-app` (TS, Tailwind, App Router) + shadcn/ui + Vitest + Playwright + ESLint
- [ ] 🤖 Portar do Gaveta (`../erp-simples/`): `lib/security/csp.ts`, middleware/proxy de auth,
      rate limiting (Upstash), clients Supabase (`lib/supabase/`), padrão de validações Zod,
      `next.config.ts` (headers), estrutura de pastas
- [ ] 🤖 Design system: tokens do Gaveta re-tematizados para a marca FiadoApp
      (coral `#E8624A`, tema escuro, Inter), loader de marca, transições motion-safe
- [ ] 🤖 `.env.local` (copiar valores do `../erp-simples/.env.local` — mesmo Supabase/Upstash)
- [ ] 🤖 Projeto Vercel `fiado` linkado + envs no painel
- [ ] 🤖 Login/logout + layout base (header, navegação) usando Supabase Auth
- [ ] 👤 Validar no Preview: login com a conta existente do Gaveta funciona + direção visual

## F2 — Modelo de dados + RLS

- [ ] 🤖 Migration `0001`: tabelas `fiado_clientes`, `fiado_vendas`, `fiado_itens_venda`,
      `fiado_pagamentos` (+ prefs), RLS, índices, RPCs transacionais (ver `docs/02`)
- [ ] 👤 Decisão de produto: semântica do pagamento parcial (abatimento em cascata
      das vendas mais antigas — como hoje — vs pagamento por venda) e se o limite
      de crédito bloqueia ou só alerta
- [ ] 🤖 Suíte `test:rls` (acesso cruzado + funcional das RPCs)

## F3 — Migração de dados (dados reais — ver `docs/03`)

- [ ] 👤 Habilitar Remote MySQL no hPanel + fornecer credenciais do banco
- [ ] 👤 Confirmar o e-mail de login do FiadoApp (se = conta Gaveta, remapeia direto)
- [ ] 🤖 Script de migração MySQL→Postgres com dry-run + relatório de validação
      (contagens, soma "a receber" batendo com o dashboard antigo, spot-checks)
- [ ] 👤 Conferir o relatório de validação

## F4 — Features (uma branch/Preview por bloco; 👤 valida cada uma)

- [ ] 🤖 4a. Clientes: consulta A–Z/busca/filtros, cadastro, edição, exclusão + Dashboard KPIs
- [ ] 🤖 4b. Vendas: nova venda (autocomplete, itens, BRL, vencimento +30d), detalhe,
      exclusão + Quitações (total/selecionadas/parcial) com o modelo novo
- [ ] 🤖 4c. Inadimplentes + WhatsApp + comprovantes (rota de impressão + Web Share)
      + histórico do cliente
- [ ] 🤖 4d. Relatórios (filtros, CSV, print) + Analytics + Preferências (limites)

## F5 — PWA + cutover

- [ ] 🤖 PWA (SW sem cache, manifest, ícones), assetlinks, Lighthouse, E2E, `/security-review`
- [ ] 👤 **Decisão de hosting** (uso comercial): Vercel Pro vs Cloudflare Pages vs manter Hobby
- [ ] 🤖 Migração final dos dados (janela de congelamento: 👤 não usa o app antigo durante ~1h)
- [ ] 👤 Apontar DNS de `fiadoapp.net` para o novo hosting (guiado) — o APK WebView
      antigo continua funcionando
- [ ] 🤖 Smoke test pós-cutover; app PHP fica como fallback até confiança total
- [ ] 👤 (Depois) Publicar TWA na Play Console; deixar o plano Hostinger expirar
      **mantendo o registro do domínio**

## F6 — Ecossistema Gaveta ⇄ Fiado

- [ ] 🤖 App switcher no header dos dois apps (SSO já é nativo — mesmo Supabase Auth)
- [ ] Estágios futuros (propor um a um): clientes compartilhados, pagamento "fiado"
      no PDV do Gaveta gerando venda no Fiado, recebíveis do Fiado no resumo
      financeiro do Gaveta
