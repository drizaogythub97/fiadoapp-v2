/**
 * Busca por pedaço do nome, sem acento e em qualquer ordem.
 *
 * Cada tela filtrava com o texto INTEIRO colado (`includes`): "maria souza"
 * não achava "Maria Aparecida Souza", e "souza maria" não achava ninguém.
 * Agora o que se digita vira PALAVRAS, e cada uma precisa aparecer em algum
 * lugar do registro (nome, sobrenome ou referência) — em qualquer ordem e
 * com ou sem acento. O Gaveta segue a mesma regra no caixa; lá a busca roda
 * no banco, aqui sobre a lista que a tela já tem.
 */

/** Palavras que ligam nomes ("José DA Silva") e não decidem nada sozinhas. */
const LIGACOES = new Set(["de", "da", "do", "das", "dos", "e"]);

const LETRA_OU_NUMERO = /[\p{L}\p{N}]/u;

/** Minúsculo e sem acento: "Ração" e "RACAO" viram o mesmo texto. */
export function normalizarBusca(texto: string): string {
  return (
    texto
      .normalize("NFD")
      // \p{M} = as marcas que o NFD separou da letra (acento, til, cedilha).
      .replace(/\p{M}/gu, "")
      .toLowerCase()
  );
}

/**
 * As palavras que precisam aparecer: sem repetição e sem as de ligação —
 * quem digita "josé de silva" quer "José da Silva". Se a busca for SÓ
 * ligação ("de"), ela fica: a pessoa ainda está digitando.
 */
export function termosDaBusca(texto: string): string[] {
  const todas = [
    ...new Set(
      normalizarBusca(texto)
        .split(/\s+/)
        .filter((palavra) => palavra !== ""),
    ),
  ];
  const relevantes = todas.filter((palavra) => !LIGACOES.has(palavra));
  return relevantes.length > 0 ? relevantes : todas;
}

/** O que a busca de cliente enxerga: nome, sobrenome e referência. */
export function textoDoCliente(c: {
  nome: string;
  sobrenome: string | null;
  referencia: string | null;
}): string {
  return [c.nome, c.sobrenome, c.referencia].filter(Boolean).join(" ");
}

/**
 * Filtra mantendo a ordem da lista — para as telas que já têm a sua
 * (clientes por nome, vendas por data). Busca vazia devolve tudo.
 */
export function filtrarPorBusca<T>(
  itens: readonly T[],
  busca: string,
  texto: (item: T) => string,
): T[] {
  const termos = termosDaBusca(busca);
  if (termos.length === 0) return [...itens];
  return itens.filter((item) => {
    const alvo = normalizarBusca(texto(item));
    return termos.every((termo) => alvo.includes(termo));
  });
}

/**
 * Quanto o texto (já normalizado) se parece com a busca: por palavra,
 * começo do texto vale 3, começo de outra palavra vale 2, meio vale 1.
 */
function pontuar(texto: string, termos: string[]): number {
  let total = 0;
  for (const termo of termos) {
    if (texto.startsWith(termo)) {
      total += 3;
      continue;
    }
    let posicao = texto.indexOf(termo);
    let pontos = posicao >= 0 ? 1 : 0;
    while (posicao > 0) {
      if (!LETRA_OU_NUMERO.test(texto[posicao - 1])) {
        pontos = 2;
        break;
      }
      posicao = texto.indexOf(termo, posicao + 1);
    }
    total += pontos;
  }
  return total;
}

/**
 * Filtra e põe na frente o que mais se parece com o que foi digitado — para
 * as listas de sugestão, que mostram poucos itens: com "arroz", "Arroz 5kg"
 * vem antes de "Biscoito de arroz". Empate fica em ordem alfabética.
 */
export function sugerirPorBusca<T>(
  itens: readonly T[],
  busca: string,
  texto: (item: T) => string,
  limite: number,
): T[] {
  const termos = termosDaBusca(busca);
  if (termos.length === 0) return [];
  return itens
    .map((item) => ({ item, rotulo: texto(item) }))
    .map((c) => ({ ...c, alvo: normalizarBusca(c.rotulo) }))
    .filter((c) => termos.every((termo) => c.alvo.includes(termo)))
    .map((c) => ({ ...c, pontos: pontuar(c.alvo, termos) }))
    .sort(
      (a, b) =>
        b.pontos - a.pontos || a.rotulo.localeCompare(b.rotulo, "pt-BR"),
    )
    .slice(0, limite)
    .map(({ item }) => item);
}

function todaMaiuscula(texto: string): boolean {
  return texto === texto.toUpperCase() && texto !== texto.toLowerCase();
}

/**
 * As descrições já vendidas, cada produto UMA vez só.
 *
 * O mesmo produto chega escrito de jeitos diferentes: "Alpiste 500g"
 * digitado aqui e "ALPISTE 500G" vindo do cadastro do Gaveta, pela venda a
 * prazo do caixa. A lista de sugestões mostrava os dois, um embaixo do
 * outro. Agora a grafia é agrupada sem caixa, sem acento e sem espaço
 * repetido, e fica a MAIS USADA; no empate, a que não é toda maiúscula,
 * que lê melhor.
 */
export function sugestoesSemRepeticao(descricoes: readonly string[]): string[] {
  const grupos = new Map<string, Map<string, number>>();
  for (const bruta of descricoes) {
    const descricao = bruta.trim().replace(/\s+/g, " ");
    if (descricao === "") continue;
    const chave = normalizarBusca(descricao);
    const grafias = grupos.get(chave) ?? new Map<string, number>();
    grafias.set(descricao, (grafias.get(descricao) ?? 0) + 1);
    grupos.set(chave, grafias);
  }
  return [...grupos.values()]
    .map(
      (grafias) =>
        [...grafias.entries()].sort(
          ([a, usosA], [b, usosB]) =>
            usosB - usosA ||
            Number(todaMaiuscula(a)) - Number(todaMaiuscula(b)) ||
            a.localeCompare(b, "pt-BR"),
        )[0][0],
    )
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}
