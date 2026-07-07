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

- [ ] 👤 Habilitar Remote MySQL no hPanel + fornecer credenciais do banco
- [ ] 👤 Confirmar o e-mail de login do FiadoApp (se = conta Gaveta, remapeia direto)
- [ ] 🤖 Script de migração MySQL→Postgres com dry-run + relatório de validação
      (contagens, soma "a receber" batendo com o dashboard antigo, spot-checks)
- [ ] 👤 Conferir o relatório de validação

## F4 — Features (uma branch/Preview por bloco; 👤 valida cada uma)

- [ ] 🤖 4a. Clientes: consulta A–Z/busca/filtros, cadastro, edição, exclusão + Dashboard KPIs
- [ ] 🤖 4b. Vendas: nova venda (autocomplete, itens, BRL, vencimento +30d), detalhe,
      exclusão + Quitações (total/selecionadas/parcial) com o modelo novo
- [ ] 🤖 4c. Inadimplentes + WhatsApp + comprovantes (rota de impressão + Web Share) + histórico do cliente
- [ ] 🤖 4d. Relatórios (filtros, CSV, print) + Analytics + Preferências (limites + **tema claro** via toggle — infra pronta desde a F1 + **personalização do
      header** com nome/logo da loja; 👤 decidir: reusar a marca já configurada no
      Gaveta (mesma tabela `profiles`, leitura apenas) ou marca própria do Fiado) + fluxos de cadastro/recuperação de senha com a página de privacidade

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
