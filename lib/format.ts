/** Formatação pt-BR compartilhada entre as telas. */

export function formatBRL(value: number | string): string {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Máscara BRL para inputs (mesmo comportamento do v1): trata toda a
 * digitação como centavos — "1234" → "R$ 12,34".
 */
export function maskBRL(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10); // cabe em numeric(10,2)
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return (
    "R$ " +
    num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Extrai o número de uma string mascarada: "R$ 1.234,56" → 1234.56. */
export function parseBRL(masked: string): number {
  if (!masked) return 0;
  const n = parseFloat(
    masked
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isNaN(n) ? 0 : n;
}

/**
 * O relógio do comércio. Fixo de propósito: o servidor da Vercel roda em
 * UTC e, sem isto, uma venda registrada às 21h de 16/09 aparece como 17/09
 * para o lojista. Quem decide o dia é a loja, não o servidor.
 */
export const FUSO_LOJA = "America/Sao_Paulo";

const DATA_HORA_FMT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: FUSO_LOJA,
});

const DATA_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: FUSO_LOJA,
});

/** Instante ISO → "16/09/2026, 21:17" no fuso da loja. */
export function formatDataHoraBR(iso: string): string {
  return DATA_HORA_FMT.format(new Date(iso));
}

/** Instante ISO → "16/09/2026" no fuso da loja. */
export function formatInstanteBR(iso: string): string {
  return DATA_FMT.format(new Date(iso));
}

/** "2026-07-07" → "07/07/2026" (sem Date para não sofrer com fuso). */
export function formatDataBR(iso: string | null): string {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

/** Data de hoje em "aaaa-mm-dd" no fuso do comércio (America/Sao_Paulo). */
export function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

/** Soma dias a uma data "aaaa-mm-dd" (meio-dia UTC evita pulo de fuso). */
export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Rótulo de um item de venda. Quando a quantidade é 1, mostra só a descrição
 * — evita o "1x" redundante. Itens vindos do PDV (venda a prazo no caixa)
 * já embutem a quantidade real na descrição ("3 × Refrigerante") e ficam com
 * quantidade 1, então sem esta regra apareceria o confuso "1x 3 × Refrigerante".
 */
export function rotuloItemVenda(quantidade: number, descricao: string): string {
  return quantidade === 1 ? descricao : `${quantidade}x ${descricao}`;
}

/** Exibe telefone armazenado como dígitos: (11) 91234-5678 / (11) 1234-5678. */
export function formatTelefone(digits: string | null): string {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}
