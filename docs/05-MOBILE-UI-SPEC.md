# 05 — Spec da experiência mobile (F5b) e padronização com o Gaveta

Contrato visual/técnico do trabalho F5b do Fiado (PRs #12, #13 e #14),
escrito para ser REPLICADO no Gaveta (`../erp-simples`) por um agente com
acesso àquele repo. "Padrão Gaveta" = mesma qualidade; cada app adapta a
identidade (Fiado: coral `#E8624A`, escuro padrão; Gaveta: a paleta dele).

## Parte A — Organização do layout mobile (modo atual = "Simples")

Correções de empilhamento assimétrico em viewport `< sm` (desktop intacto,
tudo via prefixos responsivos):

1. **Navegação do topo**: itens em grid uniforme de **2 colunas** no mobile
   (número ímpar de itens → o último ocupa a linha inteira, `last:col-span-2`);
   `sm:` volta ao flex de sempre. Altura do item 48px no mobile.
2. **Cards de lista**: no mobile, empilhar TUDO alinhado à esquerda
   (título → metadados → valor + badge lado a lado). `sm:` mantém valor à
   direita. Nunca deixar o wrap decidir a posição do valor.
3. **Fileiras de botões**: larguras simétricas no mobile (`flex-1` +
   `sm:flex-initial`); nada de quebra 2+1 com larguras diferentes.
4. **Formulários com campos lado a lado**: quebra CONTROLADA por grid com
   spans (ex.: linha de produto = `grid-cols-6`: Qtd `col-span-2` +
   Descrição `col-span-4`; Valor `col-span-4` + remover `col-span-2`).
   Flex-wrap quebra conforme a largura intrínseca dos inputs — não usar.

## Parte B — Modo de exibição "Minimalista" (opcional, só mobile)

### Mecanismo (idêntico nos dois apps, trocando o prefixo)

- Cookie **por aparelho** `<app>_ui_mode` (`fiado_ui_mode` / `gaveta_ui_mode`),
  valores `simples` | `minimalista`; ausente = nunca escolheu (padrão efetivo
  = Simples). `max-age` 1 ano, `samesite=lax`, setado no cliente via
  `document.cookie` (mesmo padrão do cookie de tema).
- Root layout (servidor) lê o cookie e põe **`data-ui-mode`** no `<html>`
  (sem FOUC). Variant do Tailwind v4:
  `@custom-variant minimal (&:is([data-ui-mode="minimalista"] *));`
  **Sempre usar combinada com `max-sm:`** — o desktop nunca muda.
- Troca instantânea: setar cookie + `document.documentElement.setAttribute`.

### O que o modo Minimalista muda (mobile apenas)

- **Barra de navegação inferior fixa** (`components/app/bottom-nav.tsx`):
  4 itens principais + **"Mais"** (abre painel deslizante de baixo com os
  itens secundários, "Conectado como <nome>" e o botão Sair). No Fiado:
  Painel, Clientes, Vendas, Atrasos + Mais (Relatórios, Analytics,
  Configurações). No Gaveta: escolher os 4 principais equivalentes.
  Ícone + rótulo `text-xs`, altura 64px, `pb-[env(safe-area-inset-bottom)]`,
  ativo em cor primária. Classe raiz: `hidden minimal:max-sm:block`.
- **Header compacto**: 48px (vs 64px), logo menor, botão Sair some do topo
  (migra para o "Mais"): `minimal:max-sm:h-12`, `minimal:max-sm:hidden` etc.
- **Nav do topo**: `minimal:max-sm:hidden`.
- **Main**: `minimal:max-sm:pb-28` (espaço para a barra) e `py` menor.
- **Densidade**: KPIs do painel em grade 2×2 compacta sem texto de apoio
  (`minimal:max-sm:grid-cols-2`, valor `text-2xl`, hint `hidden`, card com
  `[--card-spacing:--spacing(3)]`); h1 `text-2xl` e subtítulos `text-base`
  em todas as páginas; cards de lista `p-3`.

### Regra de negócio da escolha (aprovada pelo dono, 2026-07-11)

- Primeira entrada **em viewport mobile** após login SEM cookie → tela de
  escolha em tela cheia (`components/app/modo-chooser.tsx`): 2 cards
  grandes (miniatura esquemática + nome + descrição), sem opção de pular;
  tocar = escolher. Nunca aparece em desktop (o servidor só renderiza o
  componente quando o cookie não existe; o cliente confere o viewport com
  `useSyncExternalStore` + `matchMedia("(max-width: 639px)")` — nada de
  setState em effect, o lint barra).
- Textos aprovados (adaptar o nome do app):
  - **Simples** — "Botões e letras grandes, menu sempre visível no topo.
    Tudo à mão, sem esconder nada."
  - **Minimalista** — "Visual moderno e compacto. Navegação pela barra
    inferior e mais informação na tela."
  - Rodapé: "Você pode trocar quando quiser em Configurações → Preferências."
- Card **"Modo de exibição no celular"** em Configurações → Preferências
  (2 botões, mesmo padrão do card de tema; "Vale só neste aparelho e não
  muda nada no computador.").

## Parte C — Comprovantes no celular (pedido do dono, 2026-07-11)

Regras (no Fiado = PR #14; no Gaveta, aplicar ao comprovante de venda dele
quando/onde existir fluxo equivalente):

1. **Formato escolhido na própria confirmação**: os diálogos de quitação
   ganham o bloco "Comprovante para o cliente" com **PDF / Imagem /
   Não gerar** (`components/app/formato-escolha.tsx`) — nada de toast com
   "Ver comprovante" abrindo diálogo de formato depois.
2. **Celular NÃO abre aba de preview**: `useEmissorComprovante`
   (`components/receipt/emissor-comprovante.tsx`) busca os dados via server
   action (validação Zod), renderiza o papel FORA da tela (720px, mesmo CSS
   do preview), gera **PNG** (html-to-image, pixelRatio 3, fundo branco) ou
   **PDF** (jsPDF, página única do tamanho do PNG, import dinâmico) e chama
   `navigator.share({ files })`. Fallbacks: ativação expirada → diálogo
   "Documento pronto!" (Compartilhar/Baixar); sem Web Share → download.
   Celular vs desktop: `matchMedia("(hover: hover) and (pointer: fine)")`.
3. **Desktop mantém o preview** em nova aba (auto-print no PDF), mas
   `window.open` SEM `noopener` — senão o botão Fechar do preview não
   funciona (`window.close()` exige `opener`; era o bug relatado).
4. **Compartilhar texto puro foi removido** do preview — compartilhar é
   sempre o ARQUIVO. O botão WhatsApp (cobrança com texto) permanece.
5. Dados dos comprovantes centralizados em `lib/comprovante-data.ts`
   (rotas de preview e server action usam as mesmas queries).

## Parte D — Refinamentos das rodadas de validação (aprovados 👤 2026-07-11, PR #15)

O dono validou o Minimalista em aparelho real e pediu 3 rodadas de ajuste.
O resultado abaixo é o contrato FINAL — replicar direto assim:

### Escala tipográfica e de controles (`minimal:max-sm:` em tudo)

| Elemento                       | Minimalista (mobile)          |
| ------------------------------ | ----------------------------- |
| h1 da página                   | `text-xl`                     |
| Subtítulo da página            | `text-sm`                     |
| Título de card/seção (h2)      | `text-base`/`text-lg`         |
| Descrição de card              | `text-sm`                     |
| Corpo/lista (linha principal)  | `text-base` nome, `text-sm` ref |
| Metadados de lista             | `text-xs`                     |
| Badge                          | `text-xs px-2/px-2.5`         |
| CTA primário de página/diálogo | `h-11 text-base`              |
| Botão secundário/destrutivo    | `h-10 px-3 text-sm`           |
| Input/select                   | `h-11 text-sm`                |
| Item de dropdown de busca      | `h-11 text-sm`                |
| KPI (valor)                    | `text-xl`                     |

- Componente COMPARTILHADO (ex.: botão de comprovante): as classes minimal
  vão na BASE do componente, DEPOIS do `className` do caller no `cn()`,
  para vencerem overrides simples (`h-13` etc.).
- Gaps de página `gap-8→5`, de card `p-4→3.5`, de lista `gap-3→2`.

### Padrões de organização

1. **Listas viram linhas tocáveis**: a linha INTEIRA abre o detalhe (link
   esticado `after:absolute after:inset-0` + `ChevronRight` à direita);
   botões de ação da linha somem no minimal (`minimal:max-sm:hidden`) — as
   ações vivem na tela de detalhe.
2. **Escolhas de 2–3 opções em configurações/filtros = controle
   segmentado**: wrapper `minimal:max-sm:grid minimal:max-sm:grid-cols-2`
   (ou 3), botões de altura igual preenchendo a linha.
3. **Cards de configurações**: `CardHeader` com
   `minimal:max-sm:border-b minimal:max-sm:border-border/60
   minimal:max-sm:pb-3` — separa explicação do controle ("tudo grudado"
   foi reclamação explícita).
4. **Blocos de informação empilham em camadas** (identificação → situação
   → campo com rótulo), nunca texto espremido em coluna ao lado de input.
5. **Filtro com muitas opções (ex.: inicial A–Z) = `<select>` nativo** no
   minimal ("Todas" como padrão); Simples/desktop mantém a grade de botões.

### Gotchas de CSS/teste que valem no Gaveta

- `<legend>` fica FORA do layout flex do fieldset → `gap` não afasta a
  label dos controles; usar **`mb-2` na legend** (todos os filtros).
- `<fieldset>` tem `min-inline-size: min-content` → conteúdo largo estoura
  a página; `min-w-0` no fieldset.
- Papel oculto do comprovante: **420px** de largura (retrato, igual ao
  preview no celular) — 720px sai "deitado" (reclamação do dono).
- Playwright NÃO emula `hover`/`pointer` com device → E2E mobile precisa
  de stub de `matchMedia` via `addInitScript` (+ `navigator.canShare =
  undefined` p/ testar download); CDP `setEmulatedMedia` não persiste.

## Checklist de replicação no Gaveta

- [ ] Parte A nas telas equivalentes (nav, listas, formulários com spans)
- [ ] Variant `minimal` + cookie `gaveta_ui_mode` + `data-ui-mode` no root
- [ ] BottomNav com os 4 principais do Gaveta + Mais (com Sair)
- [ ] ModoChooser (mesmos textos, nome do app trocado)
- [ ] Card "Modo de exibição no celular" nas preferências dele
- [ ] Parte C no fluxo de comprovante do Gaveta (se aplicável)
- [ ] Validação: lint + tsc + test + build; Playwright 360×800 (chooser →
      minimalista → sheet → preferências → SSR persiste → volta) e desktop
      idêntico com cookie minimalista
