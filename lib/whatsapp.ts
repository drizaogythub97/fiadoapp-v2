import { formatBRL } from "@/lib/format";

/**
 * Link de cobrança pelo WhatsApp (paridade v1): mensagem amigável com o
 * valor em aberto e, se houver, os dias de atraso da venda vencida mais
 * antiga. Devolve null sem telefone ou sem dívida.
 */
export function linkCobrancaWhatsApp({
  nome,
  telefone,
  valorEmAberto,
  diasAtraso = 0,
}: {
  nome: string;
  telefone: string | null;
  valorEmAberto: number;
  diasAtraso?: number;
}): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (!digitos || valorEmAberto <= 0) return null;

  let msg = `Olá, ${nome}! Passando para lembrar que você tem ${formatBRL(
    valorEmAberto,
  )} em aberto aqui conosco`;
  if (diasAtraso > 0) {
    msg += ` (vencido há ${diasAtraso} dia${diasAtraso > 1 ? "s" : ""})`;
  }
  msg += ". Qualquer dúvida, estou à disposição! 😊";

  return `https://wa.me/55${digitos}?text=${encodeURIComponent(msg)}`;
}

/**
 * Link wa.me para enviar um texto pronto (espelho/comprovante de venda)
 * direto ao telefone cadastrado do cliente. Null sem telefone.
 */
export function linkWhatsAppTexto(
  telefone: string | null,
  texto: string,
): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  return `https://wa.me/55${digitos}?text=${encodeURIComponent(texto)}`;
}

/** Dias corridos entre um vencimento "aaaa-mm-dd" e hoje (0 se não venceu). */
export function diasDeAtraso(vencimento: string | null, hoje: string): number {
  if (!vencimento || vencimento >= hoje) return 0;
  const ms =
    Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${vencimento}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
