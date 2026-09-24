# Varredura de desempenho e segurança — FiadoApp (24/09/2026)

Mesma varredura que foi feita no Gaveta em 16–18/09/2026. O Gaveta serve de
**referência medida**: os dois apps dividem stack, banco e conta na Vercel,
então o que lá foi provado vale como precedente aqui.

Regra seguida do começo ao fim: **medir antes de concluir**. Cada achado
abaixo diz o que é **medido** e o que é **estimado** — e o que confirmaria a
estimativa.

---

## Resumo em uma tabela

| # | Achado | Tipo | Gravidade | Esforço |
| --- | --- | --- | --- | --- |
| 1 | Funções rodam em Washington, banco em São Paulo | Desempenho | 🔴 Alta | 1 linha |
| 2 | 3 chamadas ao Auth por tela (`getUser` no proxy + layout + página) | Desempenho | 🔴 Alta | Média |
| 3 | Next 16.2.9 com 1 vulnerabilidade crítica e 9 altas | Segurança | 🔴 Alta | Baixo |
| 4 | As 4 RPCs do Fiado executam sem login | Segurança | 🟠 Média | 1 migration |
| 5 | Duas consultas em série no layout, sem dependência entre si | Desempenho | 🟡 Média | Baixo |
| 6 | Cookies de sessão sem `httpOnly`/`secure` | Segurança | 🟡 Média | Baixo |
| 7 | Service worker intercepta toda requisição sem motivo | Desempenho | 🟡 Baixa | 1 linha |
| 8 | `start_url` na raiz gasta uma ida e volta na abertura | Desempenho | 🟡 Baixa | Baixo |
| 9 | Data de criação da conta sem fuso fixo | Correção | 🟡 Baixa | 1 linha |
| 10 | Cliente de navegador sem nenhum uso | Limpeza | ⚪ Nenhuma | 1 arquivo |

---

## 1. 🔴 As funções rodam em Washington e o banco está em São Paulo

**Medido, em produção, agora:**

```
fiadoapp.net/login   →  X-Vercel-Id: gru1::iad1::...   TTFB ~205 ms
gaveta-erp.vercel.app/login →  X-Vercel-Id: gru1::gru1::...   TTFB ~112 ms
```

O `gru1::iad1` diz tudo: a requisição **entra** em São Paulo e é **executada**
em Washington (`iad1`). O banco, confirmado pelo próprio host de conexão, está
em `aws-1-sa-east-1` — **São Paulo**.

Não existe `vercel.json` no repositório, então a Vercel usa a região padrão da
conta. O Gaveta tinha exatamente isso e foi corrigido com um arquivo de duas
linhas.

**Por que os 93 ms medidos são o piso e não o teto:** a `/login` foi escolhida
de propósito porque **não faz nenhuma chamada ao banco** — sem cookie de
sessão, o `getUser()` devolve nulo sem sair para a rede. Ou seja, aqueles
93 ms são o custo de estar longe do usuário, com o banco fora da conta.

**Estimado (a confirmar):** nas telas autenticadas cada ida ao banco sai de
~10 ms para ~120 ms, porque atravessa o continente. Pelo achado 2, o painel
faz **6 idas e voltas em série** — o que coloca a estimativa na casa dos
**600–700 ms só de rede**, contra ~60 ms se a função estivesse em `gru1`.

**O que confirma:** um Preview com a região fixada e uma medição autenticada,
que foi o método usado no Gaveta (lá a busca do caixa caiu de 557 ms para
265 ms).

**Correção** — `vercel.json` na raiz:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["gru1"]
}
```

**Risco: nenhum.** Não muda uma linha de código do app.

---

## 2. 🔴 Três chamadas ao Auth por tela

O `getUser()` é uma **chamada HTTP ao servidor de Auth**. Hoje ela acontece
três vezes para desenhar o painel:

| Onde | Arquivo | Custo |
| --- | --- | --- |
| Proxy | `lib/supabase/middleware.ts:63` | 1 ida e volta |
| Layout | `app/(app)/layout.tsx:20` | 1 ida e volta |
| Página | `app/(app)/dashboard/page.tsx:30` | 1 ida e volta |

E nada é reaproveitado, porque `createClient()` em `lib/supabase/server.ts`
**não está em cache** — cada chamada monta um cliente novo.

**Correção, igual à do Gaveta** (`docs/11` de lá, PRs #49 e #50):

1. `createClient` e um novo `obterUsuario()` embrulhados em `React.cache()`
   → o layout e a página passam a dividir **uma** chamada por requisição.
2. No proxy, trocar `getUser()` por **`getClaims()`**, que confere a
   assinatura ES256 localmente contra a chave pública do projeto — **zero
   chamadas de rede**.

Isso leva as 3 idas ao Auth para **1**.

> ### ⚠️ Armadilha obrigatória: o laço de redirecionamento
>
> Trocar `getUser()` por `getClaims()` no proxy **introduz um defeito** se
> feito sem o conserto junto. O `getClaims()` só confere a assinatura, e uma
> assinatura continua válida depois que a sessão foi revogada (Sair em outro
> aparelho, conta apagada). Aí o layout vê a sessão morta e manda para
> `/login`, o proxy vê a assinatura boa e manda de volta para `/dashboard`:
> o navegador morre em **ERR_TOO_MANY_REDIRECTS**.
>
> No Gaveta isso aconteceu de verdade, e **os 110 testes e2e não pegaram** —
> só a prova dedicada de sessão revogada pegou. A correção é conferir com
> estado **só em `/login` e `/signup`**, onde o custo é irrelevante porque
> quem está logado quase nunca pede essas telas. Ver
> `lib/supabase/middleware.ts` do Gaveta, linhas 106–125.

**Custo de segurança, explicitado:** a sessão revogada passa a ser detectada
uma vez por página (no layout) em vez de uma vez por requisição. O banco
continua validando a assinatura em toda consulta pela RLS, e a decisão do
proxy é só "entra ou vai para o login".

---

## 3. 🔴 Next 16.2.9 com 1 vulnerabilidade crítica e 9 altas

`npm audit --omit=dev` na data desta varredura:

```
15 vulnerabilities (5 moderate, 9 high, 1 critical)
```

As correntes principais são `sharp` (libvips/libheif — CVE-2026-33327,
-33328, -35590, -35591), `undici` (cinco avisos, incluindo vazamento de
informação entre usuários por diretivas de cache) e `qs`.

O Gaveta foi para **16.3.5** por isso na sprint passada; o `npm audit fix
--force` aqui aponta para **16.3.6**.

**Correção:** subir o Next e rodar a suíte. É a única dívida desta lista que
piora sozinha com o tempo.

---

## 4. 🟠 As quatro RPCs do Fiado executam sem login

**Medido, contra a produção, sem nenhuma sessão — só com a chave pública que
já vai no pacote JavaScript:**

```
POST /rest/v1/rpc/fiado_resumo_dashboard    →  HTTP 200
POST /rest/v1/rpc/fiado_clientes_com_saldo  →  HTTP 200
GET  /rest/v1/fiado_clientes?select=*       →  HTTP 200
```

**Não há vazamento de dados.** As três respostas voltaram vazias, porque a
RLS está íntegra: 5 tabelas com RLS ligada e 4 políticas cada, e sem
`auth.uid()` nenhuma política casa. Isso foi conferido no catálogo **e**
provado pela requisição.

O que existe é **superfície de abuso de CPU**: qualquer pessoa na internet
pode fazer o banco trabalhar sem se identificar. O
`fiado_clientes_com_saldo` agrega vendas e pagamentos — não é trabalho de
graça.

**Por que acontece:** o privilégio padrão do schema concede execução a
`PUBLIC`, e o `anon` herda. Conferido no catálogo:

```
acl: =X/postgres | postgres=X/postgres | anon=X/postgres | ...
```

> **O detalhe que engana:** revogar só de `anon` **não resolve**. O `=X/`
> do começo é o `PUBLIC`, e é dele que o `anon` herda. Tem de revogar dos
> dois. Foi assim que se descobriu no Gaveta (achado 6 de `docs/12` de lá).

**Correção** — uma migration com quatro linhas:

```sql
revoke execute on function public.fiado_clientes_com_saldo() from public, anon;
revoke execute on function public.fiado_registrar_pagamento(uuid, numeric, uuid[]) from public, anon;
revoke execute on function public.fiado_registrar_venda(jsonb, uuid, jsonb, date, date, text) from public, anon;
revoke execute on function public.fiado_resumo_dashboard() from public, anon;
```

E adotar a regra 5.1 do `CLAUDE.md` do Gaveta: **RPC nova nasce sem o papel
anônimo**.

> **Não mexer no privilégio padrão do schema.** `ALTER DEFAULT PRIVILEGES`
> resolveria de uma vez, mas vale para o papel `postgres` inteiro e atingiria
> também as funções futuras do Gaveta, que divide este banco. Decisão tomada
> na sprint passada, documentada na migration `0024` do Gaveta.

---

## 5. 🟡 Duas consultas em série no layout

`app/(app)/layout.tsx` busca a marca e depois a preferência do ecossistema,
uma esperando a outra, sem nenhuma dependência entre elas:

```ts
const marca = await marcaDoUsuario(supabase, user.id);   // linha 33
const uiMode = await getUiModeFromCookie();
const { data: ecoPrefs } = await supabase                // linha 39
  .from("ecossistema_prefs") ...
```

Com a função em Washington isso é uma ida e volta desperdiçada por tela. Um
`Promise.all` resolve, exatamente como está feito no layout do Gaveta.

---

## 6. 🟡 Cookies de sessão sem `httpOnly` e sem `secure`

Nem `lib/supabase/server.ts` nem `lib/supabase/middleware.ts` passam
`cookieOptions`. O Gaveta tinha o mesmo e foi corrigido no PR #56, depois de
**medir** que os cookies de fato chegavam ao navegador sem as travas — a
documentação da biblioteca dá a entender que o padrão já é seguro, e não é.

**Correção**, nos **dois** clientes (se ficar só num, o refresh do proxy
reescreve o cookie sem as travas):

```ts
cookieOptions: {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
},
```

O `secure` só em produção porque o desenvolvimento roda em HTTP.

---

## 7. 🟡 O service worker intercepta toda requisição para nada

`public/sw.js` termina com:

```js
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
```

Isso faz **toda** requisição passar pelo service worker para no fim fazer o
que o navegador já faria sozinho. O handler precisa existir (é o que mantém o
app instalável), mas não precisa chamar `respondWith`:

```js
self.addEventListener("fetch", () => {});
```

Medido no Gaveta na sprint do PWA (PR #59).

---

## 8. 🟡 `start_url` na raiz gasta uma ida e volta na abertura

`app/manifest.webmanifest` abre em `/`, que só existe para redirecionar ao
painel. No celular cada ida e volta custa a latência inteira da rede — no
Gaveta isso foi medido em **874 ms abrindo pela raiz contra 596 ms abrindo
direto no painel** (Pixel 7 emulado, CPU 4× mais lenta, 4G a 150 ms).

> **A ordem importa:** o manifesto **não tem `id`**. Mudar o `start_url` sem
> acrescentar `"id": "/"` faz o Chrome tratar como **outro app** — o ícone
> instalado vira um app diferente. Os dois campos entram juntos:
>
> ```json
> { "id": "/", "start_url": "/dashboard", ... }
> ```

E resolver a raiz no proxy, com a sessão que aquela requisição já verificou,
em vez de renderizar uma página só para responder um redirecionamento.

---

## 9. 🟡 Data de criação da conta sem fuso fixo

`app/(app)/configuracoes/conta/conta-client.tsx:27`:

```ts
const DATA_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric",
});   // ← sem timeZone
```

É um componente `"use client"`, mas **o Next renderiza componentes de cliente
no servidor** para o HTML inicial — e o servidor da Vercel roda em UTC. O
primeiro desenho pode mostrar o dia errado e trocar depois da hidratação.

**O resto do app está correto**, e isso merece registro: `lib/format.ts`,
`lib/comprovante.ts`, `components/receipt/fiado-receipt.tsx` e as telas de
vendas e histórico **todas fixam** `America/Sao_Paulo`. Este é o único ponto
fora do padrão.

**Vale trazer do Gaveta as duas travas** que impedem a classe inteira de
voltar (PR #57): uma regra de ESLint proibindo formatador de data fora do
módulo central, e a suíte unitária rodando em `TZ=UTC` — porque a máquina do
desenvolvedor, em Brasília, faz o teste **concordar com o bug**.

---

## 10. ⚪ Cliente de navegador sem nenhum uso

`lib/supabase/client.ts` existe e **não é importado por ninguém** (conferido
em `app/`, `components/` e `lib/`). O Gaveta apagou o seu e registrou no
`CLAUDE.md` que não há cliente de navegador. Um arquivo a menos é uma
superfície a menos.

---

## O que está bom e não deve ser mexido

Não é tudo dívida. Estes pontos estão **melhores do que o esperado**, e em
alguns casos melhores do que estavam no Gaveta:

- **RLS íntegra e provada.** 5 tabelas, RLS ligada, 4 políticas cada, e a
  prova prática de que o anônimo não lê nada.
- **CSP estrita com nonce por requisição**, com `strict-dynamic` e liberação
  da toolbar da Vercel **só** em Preview. É um trabalho bem feito.
- **Rate limiting** com Upstash nas rotas de autenticação, com janela
  deslizante por ação e comportamento *fail-open* documentado.
- **Consultas limitadas e sem N+1.** `/vendas` traz 500 com join embutido,
  `/inadimplentes` traz 1000 — uma consulta só, nada de laço.
- **`loading.tsx` espalhado** pelas rotas, que é o que dá resposta imediata
  na navegação.
- **Fuso fixado** em todos os formatadores de instante, menos o do achado 9.

---

## Ordem sugerida

1. **`vercel.json` com `gru1`** — uma linha, risco zero, é a maior alavanca.
   Medir o antes e o depois numa tela autenticada.
2. **Next 16.3.6** — é a dívida que piora sozinha.
3. **Migration do `revoke`** — quatro linhas, e a regra no `CLAUDE.md`.
4. **Cookies `httpOnly`/`secure`** — nos dois clientes.
5. **Cascata do Auth** (`cache` + `getClaims`) — **com a prova de sessão
   revogada obrigatória antes de mesclar**.
6. **`Promise.all` no layout**, service worker, `start_url` + `id`, fuso da
   tela de conta, apagar o cliente de navegador.

Os itens 1 a 4 são independentes entre si e não tocam em layout nenhum. O 5 é
o único que pede a prova dedicada descrita no achado 2.
