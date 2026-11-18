import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  devices,
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";

import {
  createTestUser,
  deleteTestUser,
  userClient,
  type TestUser,
} from "../rls/helpers";

/**
 * Busca de cliente e sugestões de produto da Nova venda, pelo caminho de
 * verdade (tela + banco), com uma conta DESCARTÁVEL criada e apagada aqui.
 *
 * Os dois defeitos que o dono viu (16/11/2026):
 *
 * 1. a busca só achava o texto COLADO — "maria souza" não achava "Maria
 *    Aparecida Souza", e "souza maria" não achava ninguém;
 * 2. no celular, as sugestões de produto da Nova venda se embaralhavam: a
 *    mesma descrição aparecia duas vezes ("Alpiste 500g" digitado aqui e
 *    "ALPISTE 500G" vindo do cadastro do Gaveta), e o nome comprido que vem
 *    de lá quebrava a linha dentro de uma opção de altura FIXA, invadindo
 *    a opção de baixo.
 */

test.describe.configure({ mode: "serial" });
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  "Precisa do .env.local para criar a conta descartável.",
);

const ESTADO = path.resolve(__dirname, "../../test-results/.auth/busca.json");

// Nomes no formato que o cadastro do Gaveta manda: maiúsculos e compridos.
const LONGOS = [
  "RACAO GOLDEN FORMULA CAES ADULTOS SABOR FRANGO 15KG",
  "RACAO PREMIER GATOS CASTRADOS SALMAO 10KG",
  "RACAO SPECIAL DOG CARNE E VEGETAIS 20KG",
];

const JOSE = {
  nome: "José Carlos",
  sobrenome: "da Conceição",
  referencia: "Zé do Bar",
};
const MARIA = {
  nome: "Maria Aparecida",
  sobrenome: "Souza",
  referencia: "Cida",
};
const COMPRIDA = {
  nome: "Antonia Aparecida dos Santos",
  sobrenome: "Figueiredo de Albuquerque",
  referencia: "Filha da Dona Cida do Mercadinho",
};

let user: TestUser;

test.beforeAll(async ({ browser }, testInfo) => {
  user = await createTestUser("e2e-busca");
  const app = userClient(user.accessToken);

  const { data: clientes, error } = await app
    .from("fiado_clientes")
    .insert([JOSE, MARIA, COMPRIDA].map((c) => ({ user_id: user.id, ...c })))
    .select("id, nome");
  expect(error).toBeNull();
  const idDe = (nome: string) =>
    (clientes ?? []).find((c: { nome: string }) => c.nome === nome)!.id;

  const vender = (clienteId: string, descricoes: string[]) =>
    app.rpc("fiado_registrar_venda", {
      p_itens: descricoes.map((descricao) => ({
        descricao,
        quantidade: 1,
        valor_unitario: 10,
      })),
      p_cliente_id: clienteId,
      p_cliente: null,
      p_data_compra: "2026-11-10",
      p_data_vencimento: null,
      p_observacao: null,
    });

  // Uma venda digitada aqui e outra como as que chegam do caixa do Gaveta.
  const daqui = await vender(idDe(JOSE.nome), [
    "Alpiste 500g",
    "Ração Mix",
    "Capa de Gaiola",
  ]);
  expect(daqui.error).toBeNull();
  const doGaveta = await vender(idDe(MARIA.nome), [
    "ALPISTE 500G",
    // Como o caixa do Gaveta grava quando vende mais de uma unidade.
    "2 × ALPISTE 500G",
    "RAÇÃO MIX",
    ...LONGOS,
  ]);
  expect(doGaveta.error).toBeNull();
  await app
    .from("fiado_vendas")
    .update({ origem: "gaveta" })
    .eq("id", doGaveta.data as string);

  // Um login só, pela tela; as outras abas reaproveitam a sessão. O
  // `newContext` daqui também lê o `storageState` do `test.use` abaixo,
  // então o arquivo nasce vazio e o login o preenche.
  mkdirSync(path.dirname(ESTADO), { recursive: true });
  writeFileSync(ESTADO, JSON.stringify({ cookies: [], origins: [] }));
  const contexto = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
  });
  const page = await contexto.newPage();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard");
  await contexto.storageState({ path: ESTADO });
  await contexto.close();
});

test.afterAll(async () => {
  // O cascade de auth.users leva clientes, vendas e itens junto.
  if (user) await deleteTestUser(user);
});

test.use({ storageState: ESTADO });

/** Toda opção cabe na própria caixa e nenhuma invade a de baixo. */
async function semSobreposicao(lista: Locator, larguraDaTela: number) {
  const opcoes = lista.getByRole("button");
  const caixas = [];
  for (let i = 0; i < (await opcoes.count()); i++) {
    const opcao = opcoes.nth(i);
    const transborda = await opcao.evaluate(
      (el) =>
        el.scrollHeight > el.clientHeight + 1 ||
        el.scrollWidth > el.clientWidth + 1,
    );
    expect(transborda, `a opção ${i + 1} transborda a própria caixa`).toBe(
      false,
    );
    caixas.push((await opcao.boundingBox())!);
  }
  for (let i = 1; i < caixas.length; i++) {
    expect(caixas[i].y).toBeGreaterThanOrEqual(
      caixas[i - 1].y + caixas[i - 1].height - 0.5,
    );
  }
  const caixaDaLista = (await lista.boundingBox())!;
  expect(caixaDaLista.x).toBeGreaterThanOrEqual(0);
  expect(caixaDaLista.x + caixaDaLista.width).toBeLessThanOrEqual(
    larguraDaTela,
  );
}

const descricao = (page: Page) => page.getByLabel(/^Descrição/).first();
const sugestoesDoProduto = (page: Page) =>
  page.locator("ul[id$='-descricao-sugestoes']");

test.describe("computador", () => {
  test("Clientes: acha pelo sobrenome, pela referência e fora de ordem", async ({
    page,
  }) => {
    await page.goto("/clientes");
    const busca = page.getByLabel("Buscar cliente");
    const encontrados = page.getByRole("link", { name: /^Detalhar / });

    await busca.fill("conceicao");
    await expect(encontrados).toHaveCount(1);
    await expect(encontrados.first()).toHaveAccessibleName(/José Carlos/);

    // O texto colado "maria souza" não existe: entre os dois há "Aparecida".
    await busca.fill("souza maria");
    await expect(encontrados).toHaveCount(1);
    await expect(encontrados.first()).toHaveAccessibleName(/Maria Aparecida/);

    await busca.fill("ze bar");
    await expect(encontrados).toHaveCount(1);
    await expect(encontrados.first()).toHaveAccessibleName(/José Carlos/);
  });

  test("Nova venda: a mesma descrição aparece uma vez só", async ({ page }) => {
    await page.goto("/vendas/nova");

    await page.getByLabel("Buscar cliente já cadastrado").fill("souza maria");
    await expect(
      page.locator("#cliente-busca-resultados").getByRole("button"),
    ).toHaveText([/Maria Aparecida Souza/]);

    // "Alpiste 500g" (daqui), "ALPISTE 500G" e "2 × ALPISTE 500G" (do Gaveta)
    // viram uma opção só.
    await descricao(page).fill("alpiste");
    await expect(sugestoesDoProduto(page).getByRole("button")).toHaveCount(1);
  });

  test("Nova venda: o campo continua ligado à própria lista de sugestões", async ({
    page,
  }) => {
    // Duas aberturas da tela: com o contador antigo, que vivia no módulo e
    // seguia contando no servidor, a segunda já saía com outro número
    // ("item-2") do que o navegador esperava ("item-1"). O React não corrige
    // atributo na hidratação, e o `aria-controls` do campo ficava apontando
    // para uma lista que não existe.
    await page.goto("/vendas/nova");
    await page.reload();

    await descricao(page).fill("alpiste");
    await expect(sugestoesDoProduto(page)).toBeVisible();
    expect(await descricao(page).getAttribute("aria-controls")).toBe(
      await sugestoesDoProduto(page).getAttribute("id"),
    );

    // E a linha nova não repete o id de nenhum campo da primeira.
    await page.getByRole("button", { name: "Adicionar produto" }).click();
    const ids = await page
      .locator("[id^='item-']")
      .evaluateAll((campos) => campos.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("com erro de digitação, a busca traz o parecido e avisa", async ({
    page,
  }) => {
    // Lista: nada escrito assim — "maira" (letras invertidas), "sousa" (com
    // s) —, então vêm os parecidos, com o aviso de que não são iguais.
    await page.goto("/clientes");
    await page.getByLabel("Buscar cliente").fill("maira sousa");
    await expect(page.getByText(/escrito assim/)).toBeVisible();
    const encontrados = page.getByRole("link", { name: /^Detalhar / });
    await expect(encontrados).toHaveCount(1);
    await expect(encontrados.first()).toHaveAccessibleName(/Maria Aparecida/);

    // Nova venda: cliente e produto, cada um com uma letra fora do lugar.
    await page.goto("/vendas/nova");
    await page.getByLabel("Buscar cliente já cadastrado").fill("jose conseisao");
    await expect(
      page.locator("#cliente-busca-resultados").getByRole("button"),
    ).toHaveText([/José Carlos/]);
    await descricao(page).fill("alpste");
    // Uma opção só; a grafia é a mais usada (aqui, a que veio do Gaveta).
    await expect(sugestoesDoProduto(page).getByRole("button")).toHaveText([
      /^alpiste 500g$/i,
    ]);
  });
});

for (const modo of ["simples", "minimalista"] as const) {
  test.describe(`celular, modo ${modo}`, () => {
    const pixel = devices["Pixel 7"];
    test.use({
      viewport: pixel.viewport,
      userAgent: pixel.userAgent,
      deviceScaleFactor: pixel.deviceScaleFactor,
      isMobile: pixel.isMobile,
      hasTouch: pixel.hasTouch,
    });

    test.beforeEach(async ({ context }) => {
      const base = test.info().project.use.baseURL!;
      await context.addCookies([
        { name: "fiado_ui_mode", value: modo, url: base },
      ]);
    });

    test("Nova venda: sugestões de produto sem nada por cima de nada", async ({
      page,
    }, testInfo) => {
      await page.goto("/vendas/nova");
      await descricao(page).fill("racao");

      const lista = sugestoesDoProduto(page);
      // "Ração Mix" e "RAÇÃO MIX" viram uma, mais os três nomes compridos.
      await expect(lista.getByRole("button")).toHaveCount(4);
      await semSobreposicao(lista, pixel.viewport.width);
      await lista.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.screenshot({
        path: testInfo.outputPath(`sugestoes-${modo}.png`),
      });
    });

    test("Painel: busca rápida com nome comprido não se sobrepõe", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await page.getByLabel("Busca rápida de cliente").fill("mercadinho");

      const lista = page.locator("#busca-rapida-resultados");
      await expect(lista.getByRole("button")).toHaveCount(1);
      await semSobreposicao(lista, pixel.viewport.width);
    });
  });
}
