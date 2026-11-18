/**
 * Busca por pedaço do nome, sem acento, em qualquer ordem — e perdoando
 * erro de digitação.
 *
 * Cada tela filtrava com o texto INTEIRO colado (`includes`): "maria souza"
 * não achava "Maria Aparecida Souza", e "souza maria" não achava ninguém.
 * Agora o que se digita vira PALAVRAS, e cada uma precisa aparecer em algum
 * lugar do registro (nome, sobrenome ou referência) — em qualquer ordem e
 * com ou sem acento. Quando isso não acha nada (ou acha pouco), entram os
 * PARECIDOS: "maira" acha "Maria", "sousa" acha "Souza", "alpste" acha
 * "Alpiste".
 *
 * O Gaveta segue a mesma regra no caixa (`lib/db/busca.ts` de lá); lá o
 * banco pré-seleciona, aqui ela roda sobre a lista que a tela já tem.
 */

/** Palavras que ligam nomes ("José DA Silva") e não decidem nada sozinhas. */
const LIGACOES = new Set(["de", "da", "do", "das", "dos", "e"]);

/** Busca é coisa curta: acima disso, as palavras a mais não entram. */
const MAX_TERMOS = 6;

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

/** Tira as palavras de ligação, menos quando são tudo o que se digitou. */
function semLigacoes(palavras: string[]): string[] {
  const relevantes = palavras.filter((palavra) => !LIGACOES.has(palavra));
  return relevantes.length > 0 ? relevantes : palavras;
}

/**
 * As palavras que precisam aparecer: sem repetição e sem as de ligação —
 * quem digita "josé de silva" quer "José da Silva". Se a busca for SÓ
 * ligação ("de"), ela fica: a pessoa ainda está digitando.
 */
export function termosDaBusca(texto: string): string[] {
  return semLigacoes([
    ...new Set(
      normalizarBusca(texto)
        .split(/\s+/)
        .filter((palavra) => palavra !== ""),
    ),
  ]);
}

/** O que a busca de cliente enxerga: nome, sobrenome e referência. */
export function textoDoCliente(c: {
  nome: string;
  sobrenome: string | null;
  referencia: string | null;
}): string {
  return [c.nome, c.sobrenome, c.referencia].filter(Boolean).join(" ");
}

function contemTodas(texto: string, termos: string[]): boolean {
  const alvo = normalizarBusca(texto);
  return termos.every((termo) => alvo.includes(termo));
}

/**
 * Filtra EXATO mantendo a ordem da lista — para o que não pode trazer
 * parecido, como o relatório que vira planilha. Busca vazia devolve tudo.
 */
export function filtrarPorBusca<T>(
  itens: readonly T[],
  busca: string,
  texto: (item: T) => string,
): T[] {
  const termos = termosDaBusca(busca);
  if (termos.length === 0) return [...itens];
  return itens.filter((item) => contemTodas(texto(item), termos));
}

/**
 * Filtra mantendo a ordem da lista (clientes por nome, vendas por data); se
 * nada bater exato, devolve os PARECIDOS, do mais ao menos parecido, e avisa
 * com `aproximado` — a tela diz que são parecidos, não iguais.
 */
export function filtrarComParecidos<T>(
  itens: readonly T[],
  busca: string,
  texto: (item: T) => string,
): { itens: T[]; aproximado: boolean } {
  const exatos = filtrarPorBusca(itens, busca, texto);
  if (exatos.length > 0 || termosDaBusca(busca).length === 0) {
    return { itens: exatos, aproximado: false };
  }
  const aproximados = parecidos(itens, busca, texto);
  return { itens: aproximados, aproximado: aproximados.length > 0 };
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
 * Para as listas de sugestão, que mostram poucos itens: primeiro o que bate
 * exato, com o que mais se parece na frente ("Arroz 5kg" antes de "Biscoito
 * de arroz"); depois, até completar o limite, os parecidos por erro de
 * digitação. Empate fica em ordem alfabética.
 */
export function sugerirPorBusca<T>(
  itens: readonly T[],
  busca: string,
  texto: (item: T) => string,
  limite: number,
): T[] {
  const termos = termosDaBusca(busca);
  if (termos.length === 0) return [];
  const exatos = itens
    .map((item) => ({ item, rotulo: texto(item) }))
    .map((c) => ({ ...c, alvo: normalizarBusca(c.rotulo) }))
    .filter((c) => termos.every((termo) => c.alvo.includes(termo)))
    .map((c) => ({ ...c, pontos: pontuar(c.alvo, termos) }))
    .sort(
      (a, b) =>
        b.pontos - a.pontos || a.rotulo.localeCompare(b.rotulo, "pt-BR"),
    )
    .map(({ item }) => item);
  if (exatos.length >= limite) return exatos.slice(0, limite);
  const jaEstao = new Set(exatos);
  const resto = itens.filter((item) => !jaEstao.has(item));
  return [...exatos, ...parecidos(resto, busca, texto)].slice(0, limite);
}

// ── Parecido: erro de digitação ─────────────────────────────────────────

/**
 * Aproxima a grafia do som, para "Sousa" e "Souza" — ou "Thiago" e
 * "Tiago", "Raphael" e "Rafael", "Kátia" e "Cátia", "Ivone" e "Yvone",
 * "Jéssica" e "Géssica", "Rafaella" e "Rafaela" — serem a MESMA palavra. Só
 * vale na comparação aproximada; o filtro exato não passa por aqui.
 */
function simplificarSom(palavra: string): string {
  return palavra
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/^h/, "")
    .replace(/y/g, "i")
    .replace(/w/g, "v")
    .replace(/k/g, "c")
    .replace(/c(?=[ei])/g, "s")
    .replace(/g(?=[ei])/g, "j")
    .replace(/z/g, "s")
    // Só letra dobrada: número repetido é outro número ("500" não é "50").
    .replace(/(\p{L})\1+/gu, "$1");
}

/** Palavras para a comparação aproximada: sem acento nem pontuação. */
function palavrasDoSom(texto: string): string[] {
  return normalizarBusca(texto)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((palavra) => palavra !== "")
    .map(simplificarSom);
}

/**
 * Distância de edição com troca de vizinhas: quantas letras é preciso
 * trocar, tirar, pôr ou inverter para uma palavra virar a outra ("maira" →
 * "maria" é 1). Para no `limite` — passou dele, tanto faz o quanto.
 */
function distancia(a: string, b: string, limite: number): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let duasAtras: number[] = [];
  let umaAtras = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(
        umaAtras[j] + 1,
        atual[j - 1] + 1,
        umaAtras[j - 1] + custo,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, duasAtras[j - 2] + 1);
      }
      atual.push(d);
      menor = Math.min(menor, d);
    }
    if (menor > limite) return limite + 1;
    duasAtras = umaAtras;
    umaAtras = atual;
  }
  return Math.min(umaAtras[b.length], limite + 1);
}

/**
 * Quantos erros cabem numa palavra: nenhum até 2 letras ("jo" errado é
 * outra coisa), 1 até 7, 2 daí em diante.
 */
function tolerancia(tamanho: number): number {
  return tamanho <= 2 ? 0 : tamanho <= 7 ? 1 : 2;
}

/**
 * O quanto a palavra digitada se parece com ALGUMA palavra do registro, de
 * 0 (nada) a 1 (contida nela). Compara com a palavra inteira, com o começo
 * dela — quem ainda está digitando — e com ela colada à seguinte
 * ("cocacola" × "Coca Cola").
 */
function parecenca(termo: string, palavrasDoRegistro: string[]): number {
  const limite = tolerancia(termo.length);
  let melhor = 0;
  for (let i = 0; i < palavrasDoRegistro.length; i++) {
    const palavra = palavrasDoRegistro[i];
    // Palavra curta só casa inteira: o "50" de "50%" não é o "500" de outro
    // nome — pedaço curto é trabalho do filtro exato (achado E de docs/10).
    if (termo.length <= 2 ? palavra === termo : palavra.includes(termo)) {
      return 1;
    }
    if (limite === 0) continue;
    const alvos = [palavra, palavra + (palavrasDoRegistro[i + 1] ?? "")];
    if (termo.length >= 4) {
      alvos.push(
        palavra.slice(0, termo.length),
        palavra.slice(0, termo.length + 1),
      );
    }
    for (const alvo of alvos) {
      const d = distancia(termo, alvo, limite);
      if (d <= limite) melhor = Math.max(melhor, 1 - d / (termo.length + 1));
    }
  }
  return melhor;
}

/**
 * Os parecidos com a busca, do mais ao menos parecido. Toda palavra
 * digitada precisa ter par no registro, com a tolerância de erro do tamanho
 * dela.
 */
export function parecidos<T>(
  itens: readonly T[],
  busca: string,
  texto: (item: T) => string,
): T[] {
  const termos = semLigacoes([...new Set(palavrasDoSom(busca))]).slice(
    0,
    MAX_TERMOS,
  );
  if (termos.length === 0) return [];
  return itens
    .map((item) => {
      const palavrasDoRegistro = palavrasDoSom(texto(item));
      let nota = 0;
      for (const termo of termos) {
        const p = parecenca(termo, palavrasDoRegistro);
        if (p === 0) return null;
        nota += p;
      }
      return { item, rotulo: texto(item), nota };
    })
    .filter((c): c is { item: T; rotulo: string; nota: number } => c !== null)
    .sort(
      (a, b) => b.nota - a.nota || a.rotulo.localeCompare(b.rotulo, "pt-BR"),
    )
    .map(({ item }) => item);
}

// ── Sugestões de descrição da Nova venda ────────────────────────────────

function todaMaiuscula(texto: string): boolean {
  return texto === texto.toUpperCase() && texto !== texto.toLowerCase();
}

/**
 * A quantidade que a venda a prazo do Gaveta põe na frente da descrição
 * ("3 × Refrigerante", com o item em quantidade 1 — ver `rotuloItemVenda`).
 * Na sugestão ela não serve: a quantidade tem campo próprio, e escolher
 * "3 × ALPISTE" gravaria o "3 ×" como nome do produto. Medido em 18/11: 72
 * dos 203 itens vindos do Gaveta tinham o prefixo.
 */
const QUANTIDADE_NA_FRENTE = /^\d+(?:[.,]\d+)?\s*[×xX]\s+/;

/**
 * As descrições já vendidas, cada produto UMA vez só.
 *
 * O mesmo produto chega escrito de jeitos diferentes: "Alpiste 500g"
 * digitado aqui e "ALPISTE 500G" — ou "2 × ALPISTE 500G" — vindo do
 * cadastro do Gaveta, pela venda a prazo do caixa. A lista de sugestões
 * mostrava todos, um embaixo do outro. Agora sai a quantidade da frente, a
 * grafia é agrupada sem caixa, sem acento e sem espaço repetido, e fica a
 * MAIS USADA; no empate, a que não é toda maiúscula, que lê melhor.
 */
export function sugestoesSemRepeticao(descricoes: readonly string[]): string[] {
  const grupos = new Map<string, Map<string, number>>();
  for (const bruta of descricoes) {
    const descricao = bruta
      .trim()
      .replace(QUANTIDADE_NA_FRENTE, "")
      .replace(/\s+/g, " ");
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
