/** Formatação pt-BR compartilhada entre as telas. */

export function formatBRL(value: number | string): string {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
