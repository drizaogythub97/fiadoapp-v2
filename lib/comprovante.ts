import { formatBRL, formatDataBR } from "@/lib/format";
import type { VendaStatus } from "@/lib/types/fiado";

/** Dados apresentacionais dos comprovantes (rotas /comprovante/*). */

export type ComprovanteCliente = {
  nome: string;
  sobrenome: string | null;
  referencia: string | null;
  telefone: string | null;
};

export type ComprovanteVendaData = {
  vendaId: string;
  cliente: ComprovanteCliente;
  dataCompra: string;
  dataVencimento: string | null;
  status: VendaStatus;
  quitadoEm: string | null;
  observacao: string | null;
  itens: {
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }[];
  pagamentos: { pagoEm: string; valor: number }[];
  valorTotal: number;
  valorPago: number;
};

export type ComprovanteQuitacaoData = {
  cliente: ComprovanteCliente;
  pagoEm: string;
  vendas: {
    dataCompra: string;
    valorTotal: number;
    valorPago: number;
    quitada: boolean;
  }[];
  totalPago: number;
  saldoRestante: number;
};

export const NOTA_COMPROVANTE =
  "Este documento confirma os registros do sistema FiadoApp.";

export function nomeCompletoCliente(c: ComprovanteCliente): string {
  return c.sobrenome ? `${c.nome} ${c.sobrenome}` : c.nome;
}

/** Venda em aberto é "espelho"; venda paga é comprovante (como o dono fala). */
export function tituloComprovanteVenda(status: VendaStatus): string {
  return status === "PAGA" ? "Comprovante de venda" : "Espelho da venda";
}

export const STATUS_LABEL: Record<VendaStatus, string> = {
  ATIVA: "Em aberto",
  PARCIAL: "Parcialmente paga",
  PAGA: "Paga",
};

function dataHoraBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

/**
 * Texto plano do espelho/comprovante de venda — usado no Web Share (caixa
 * de apps do celular) e no envio direto por WhatsApp (*negrito* do WhatsApp).
 */
export function textoComprovanteVenda(data: ComprovanteVendaData): string {
  const restante = data.valorTotal - data.valorPago;
  const linhas: string[] = [
    `*${tituloComprovanteVenda(data.status)} — FiadoApp*`,
    `Cliente: ${nomeCompletoCliente(data.cliente)}${
      data.cliente.referencia ? ` (${data.cliente.referencia})` : ""
    }`,
    `Compra: ${formatDataBR(data.dataCompra)}`,
  ];
  if (data.dataVencimento) {
    linhas.push(`Vencimento: ${formatDataBR(data.dataVencimento)}`);
  }
  linhas.push("", "Itens:");
  for (const item of data.itens) {
    linhas.push(
      `- ${item.quantidade}x ${item.descricao} — ${formatBRL(item.valorTotal)}`,
    );
  }
  linhas.push("", `*Total: ${formatBRL(data.valorTotal)}*`);
  if (data.valorPago > 0) {
    linhas.push(`Pago: ${formatBRL(data.valorPago)}`);
  }
  if (restante > 0 && data.valorPago > 0) {
    linhas.push(`Falta: ${formatBRL(restante)}`);
  }
  linhas.push(`Situação: ${STATUS_LABEL[data.status]}`);
  if (data.observacao) {
    linhas.push("", `Obs.: ${data.observacao}`);
  }
  return linhas.join("\n");
}

/** Texto plano do comprovante de quitação. */
export function textoComprovanteQuitacao(
  data: ComprovanteQuitacaoData,
): string {
  const linhas: string[] = [
    "*Comprovante de quitação — FiadoApp*",
    `Cliente: ${nomeCompletoCliente(data.cliente)}${
      data.cliente.referencia ? ` (${data.cliente.referencia})` : ""
    }`,
    `Pago em: ${dataHoraBR(data.pagoEm)}`,
    "",
    "Vendas:",
  ];
  for (const v of data.vendas) {
    linhas.push(
      `- Venda de ${formatDataBR(v.dataCompra)} — pago ${formatBRL(v.valorPago)}${
        v.quitada ? " (quitada)" : " (abatida)"
      }`,
    );
  }
  linhas.push("", `*Total pago: ${formatBRL(data.totalPago)}*`);
  linhas.push(
    data.saldoRestante > 0
      ? `Saldo restante: ${formatBRL(data.saldoRestante)}`
      : "Cliente sem dívida. ✅",
  );
  return linhas.join("\n");
}
