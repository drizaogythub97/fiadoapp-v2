import { formatBRL, formatDataBR, rotuloItemVenda } from "@/lib/format";
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

export type EspelhoClienteData = {
  cliente: ComprovanteCliente;
  geradoEm: string;
  vendas: {
    dataCompra: string;
    dataVencimento: string | null;
    status: VendaStatus;
    observacao: string | null;
    itens: {
      descricao: string;
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
    }[];
    valorTotal: number;
    valorPago: number;
  }[];
  totalEmAberto: number;
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

export const TITULO_ESPELHO_CLIENTE = "Espelho das vendas em aberto";

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
      `- ${rotuloItemVenda(item.quantidade, item.descricao)} — ${formatBRL(item.valorTotal)}`,
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

/**
 * Texto plano do espelho do cliente (todas as vendas em aberto agrupadas) —
 * equivalente ao "Relatório de Vendas Ativas" do v1.
 */
export function textoEspelhoCliente(data: EspelhoClienteData): string {
  const linhas: string[] = [
    `*${TITULO_ESPELHO_CLIENTE} — FiadoApp*`,
    `Cliente: ${nomeCompletoCliente(data.cliente)}${
      data.cliente.referencia ? ` (${data.cliente.referencia})` : ""
    }`,
    `Gerado em: ${dataHoraBR(data.geradoEm)}`,
  ];
  for (const venda of data.vendas) {
    const restante = venda.valorTotal - venda.valorPago;
    linhas.push("", `*Venda de ${formatDataBR(venda.dataCompra)}*`);
    if (venda.dataVencimento) {
      linhas.push(`Vencimento: ${formatDataBR(venda.dataVencimento)}`);
    }
    for (const item of venda.itens) {
      linhas.push(
        `- ${rotuloItemVenda(item.quantidade, item.descricao)} — ${formatBRL(item.valorTotal)}`,
      );
    }
    if (venda.valorPago > 0) {
      linhas.push(
        `Total: ${formatBRL(venda.valorTotal)} · Pago: ${formatBRL(venda.valorPago)} · Falta: ${formatBRL(restante)}`,
      );
    } else {
      linhas.push(`Total: ${formatBRL(venda.valorTotal)}`);
    }
    if (venda.observacao) {
      linhas.push(`Obs.: ${venda.observacao}`);
    }
  }
  linhas.push("", `*Total em aberto: ${formatBRL(data.totalEmAberto)}*`);
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

/* ── Pedido de comprovante (F5b) ─────────────────────────────────────────
 * Identifica um documento emissível pelos fluxos do app. No desktop vira a
 * URL da rota /comprovante/*; no celular alimenta o emissor direto
 * (useEmissorComprovante), que gera PDF/PNG e abre o compartilhamento
 * nativo sem sair da tela. */

export type PedidoComprovante =
  | { tipo: "venda"; vendaId: string }
  | { tipo: "quitacao"; clienteId: string; em: string }
  | { tipo: "espelho-cliente"; clienteId: string };

export function urlDoComprovante(pedido: PedidoComprovante): string {
  switch (pedido.tipo) {
    case "venda":
      return `/comprovante/${pedido.vendaId}`;
    case "quitacao":
      return `/comprovante/quitacao/${pedido.clienteId}?em=${encodeURIComponent(pedido.em)}`;
    case "espelho-cliente":
      return `/comprovante/cliente/${pedido.clienteId}`;
  }
}

/** URL da rota de preview já com o formato escolhido (fluxo desktop). */
export function urlDoComprovanteComFormato(
  pedido: PedidoComprovante,
  formato: "pdf" | "imagem",
): string {
  const url = urlDoComprovante(pedido);
  if (formato !== "imagem") return url;
  return `${url}${url.includes("?") ? "&" : "?"}formato=imagem`;
}
