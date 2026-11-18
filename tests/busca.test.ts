import { describe, expect, it } from "vitest";

import {
  filtrarComParecidos,
  filtrarPorBusca,
  normalizarBusca,
  parecidos,
  sugerirPorBusca,
  sugestoesSemRepeticao,
  termosDaBusca,
  textoDoCliente,
} from "@/lib/busca";

const JOSE = { nome: "José Carlos", sobrenome: "da Conceição", referencia: "Zé do Bar" };
const MARIA = { nome: "Maria Aparecida", sobrenome: "Souza", referencia: "Cida" };
const JOANA = { nome: "Joana", sobrenome: null, referencia: null };
const CLIENTES = [JOSE, MARIA, JOANA];

describe("parecidos (erro de digitação)", () => {
  const nome = (s: string) => s;
  const achar = (itens: string[], busca: string) => parecidos(itens, busca, nome);

  it("perdoa uma letra trocada, faltando, sobrando ou invertida", () => {
    expect(achar(["Maria Aparecida", "Mario", "Marta"], "maira")).toEqual([
      "Maria Aparecida",
    ]);
    expect(achar(["Alpiste 500g", "Capa de Gaiola"], "alpste")).toEqual([
      "Alpiste 500g",
    ]);
  });

  it("junta grafias que soam igual", () => {
    expect(achar(["Maria Souza"], "sousa")).toEqual(["Maria Souza"]);
    expect(achar(["Rafael Santos"], "raphael")).toEqual(["Rafael Santos"]);
    expect(achar(["José da Conceição"], "conseissao")).toEqual([
      "José da Conceição",
    ]);
  });

  it("não inventa parentesco", () => {
    expect(achar(["Marcos"], "carlos")).toEqual([]);
    expect(achar(["Maria Souza"], "maira lima")).toEqual([]);
    // Palavra curta só casa inteira, e número repetido não encolhe.
    expect(achar(["Ração 500g"], "50")).toEqual([]);
  });
});

describe("filtrarComParecidos (listas)", () => {
  const buscar = (termo: string) => {
    const r = filtrarComParecidos(CLIENTES, termo, textoDoCliente);
    return { nomes: r.itens.map((c) => c.nome), aproximado: r.aproximado };
  };

  it("com algo igual, devolve só o igual", () => {
    expect(buscar("souza")).toEqual({ nomes: ["Maria Aparecida"], aproximado: false });
  });

  it("sem nada igual, devolve os parecidos e avisa", () => {
    expect(buscar("maira sousa")).toEqual({ nomes: ["Maria Aparecida"], aproximado: true });
    expect(buscar("jose conseisao")).toEqual({ nomes: ["José Carlos"], aproximado: true });
  });

  it("sem igual nem parecido, a lista fica vazia — sem aviso de parecido", () => {
    expect(buscar("xyzw")).toEqual({ nomes: [], aproximado: false });
  });
});

describe("normalizarBusca", () => {
  it("tira acento, til e cedilha e ignora a caixa", () => {
    expect(normalizarBusca("Ração")).toBe("racao");
    expect(normalizarBusca("PÃO DE AÇÚCAR")).toBe("pao de acucar");
  });
});

describe("termosDaBusca", () => {
  it("quebra em palavras, sem espaço sobrando nem repetição", () => {
    expect(termosDaBusca("  Maria   SOUZA souza ")).toEqual(["maria", "souza"]);
  });

  it("deixa de fora as palavras de ligação, menos quando são tudo", () => {
    expect(termosDaBusca("josé de silva")).toEqual(["jose", "silva"]);
    expect(termosDaBusca("de")).toEqual(["de"]);
  });
});

describe("filtrarPorBusca (clientes)", () => {
  const buscar = (termo: string) =>
    filtrarPorBusca(CLIENTES, termo, textoDoCliente).map((c) => c.nome);

  it("acha pelo sobrenome e pela referência, sem acento", () => {
    expect(buscar("conceicao")).toEqual(["José Carlos"]);
    expect(buscar("ze bar")).toEqual(["José Carlos"]);
    expect(buscar("cida")).toEqual(["Maria Aparecida"]);
  });

  it("acha com as palavras fora de ordem e separadas no cadastro", () => {
    // O texto colado "maria souza" não existe: entre as duas há "Aparecida".
    expect(buscar("maria souza")).toEqual(["Maria Aparecida"]);
    expect(buscar("souza maria")).toEqual(["Maria Aparecida"]);
  });

  it("toda palavra precisa casar", () => {
    expect(buscar("maria conceicao")).toEqual([]);
  });

  it("mantém a ordem da lista e devolve tudo sem busca", () => {
    expect(buscar("jo")).toEqual(["José Carlos", "Joana"]);
    expect(buscar("   ")).toEqual(["José Carlos", "Maria Aparecida", "Joana"]);
  });
});

describe("sugerirPorBusca", () => {
  const nome = (s: string) => s;

  it("põe na frente o que começa com o que se digitou", () => {
    const produtos = ["Biscoito de arroz", "Arroz integral", "Arroz 5kg"];
    expect(sugerirPorBusca(produtos, "arroz", nome, 8)).toEqual([
      "Arroz 5kg",
      "Arroz integral",
      "Biscoito de arroz",
    ]);
  });

  it("começo de palavra vale mais que meio de palavra", () => {
    expect(sugerirPorBusca(["Aparecida", "Cida Souza"], "cida", nome, 8)).toEqual([
      "Cida Souza",
      "Aparecida",
    ]);
  });

  it("respeita o limite e não sugere nada sem busca", () => {
    expect(sugerirPorBusca(["a1", "a2", "a3"], "a", nome, 2)).toHaveLength(2);
    expect(sugerirPorBusca(["a1"], "  ", nome, 8)).toEqual([]);
  });
});

describe("sugestoesSemRepeticao", () => {
  it("junta a mesma descrição escrita em caixa ou acento diferentes", () => {
    // O caso que o dono viu: digitado aqui × vindo do cadastro do Gaveta.
    const unicas = sugestoesSemRepeticao([
      "Alpiste 500g",
      "ALPISTE 500G",
      "Ração Filhotes",
      "RAÇAO FILHOTES",
      "Racao mix",
      "Ração Mix",
    ]);
    expect(unicas).toHaveLength(3);
  });

  it("fica a grafia mais usada", () => {
    expect(
      sugestoesSemRepeticao(["MILHO 5KG", "MILHO 5KG", "Milho 5kg"]),
    ).toEqual(["MILHO 5KG"]);
  });

  it("no empate, fica a que não é toda maiúscula", () => {
    expect(sugestoesSemRepeticao(["FUMO", "Fumo"])).toEqual(["Fumo"]);
  });

  it("ignora espaço sobrando e linha vazia, e devolve em ordem alfabética", () => {
    expect(
      sugestoesSemRepeticao(["  Fumo ", "Capa  de Gaiola", "Capa de Gaiola", "  "]),
    ).toEqual(["Capa de Gaiola", "Fumo"]);
  });
});

describe("sugerirPorBusca com erro de digitação", () => {
  it("completa com os parecidos quando o exato não enche a lista", () => {
    const sugestoes = ["Alpiste 500g", "Capa de Gaiola", "Ração Mix"];
    expect(sugerirPorBusca(sugestoes, "alpste", (s) => s, 8)).toEqual([
      "Alpiste 500g",
    ]);
  });
});
