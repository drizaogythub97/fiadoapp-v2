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
