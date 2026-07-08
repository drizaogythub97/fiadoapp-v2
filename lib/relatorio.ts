import { formatDataBR } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/comprovante";
import type { VendaStatus } from "@/lib/types/fiado";

/** Dados e regras da tela de Relatórios (paridade com o v1). */

export type ItemRelatorio = {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type VendaRelatorio = {
  id: string;
  nome: string;
  sobrenome: string | null;
  referencia: string | null;
  dataCompra: string;
  dataVencimento: string | null;
  status: VendaStatus;
  valorTotal: number;
  valorPago: number;
  itens: ItemRelatorio[];
};

export type SituacaoFiltro = "todas" | "abertas" | "pagas";

export type FiltrosRelatorio = {
  /** "aaaa-mm-dd" ou "" (sem limite) — sobre a data da compra, como no v1. */
  de: string;
  ate: string;
  situacao: SituacaoFiltro;
  /** Inicial do nome do cliente ("" = todas). */
  inicial: string;
  /** Busca livre por nome/sobrenome/referência. */
  busca: string;
};

export const FILTROS_INICIAIS: FiltrosRelatorio = {
  de: "",
  ate: "",
  situacao: "todas",
  inicial: "",
  busca: "",
};

export const SITUACAO_FILTRO_LABEL: Record<SituacaoFiltro, string> = {
  todas: "Todas as vendas",
  abertas: "Somente em aberto",
  pagas: "Somente pagas",
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function nomeClienteRelatorio(v: VendaRelatorio): string {
  return v.sobrenome ? `${v.nome} ${v.sobrenome}` : v.nome;
}

export function filtrarVendasRelatorio(
  vendas: VendaRelatorio[],
  filtros: FiltrosRelatorio,
): VendaRelatorio[] {
  let lista = vendas;
  if (filtros.de) lista = lista.filter((v) => v.dataCompra >= filtros.de);
  if (filtros.ate) lista = lista.filter((v) => v.dataCompra <= filtros.ate);
  if (filtros.situacao === "abertas") {
    lista = lista.filter((v) => v.status !== "PAGA");
  }
  if (filtros.situacao === "pagas") {
    lista = lista.filter((v) => v.status === "PAGA");
  }
  if (filtros.inicial) {
    const inicial = norm(filtros.inicial);
    lista = lista.filter((v) => norm(v.nome).startsWith(inicial));
  }
  const termo = norm(filtros.busca.trim());
  if (termo) {
    lista = lista.filter((v) =>
      norm(`${v.nome} ${v.sobrenome ?? ""} ${v.referencia ?? ""}`).includes(
        termo,
      ),
    );
  }
  return lista;
}

export type ResumoRelatorio = {
  registros: number;
  totalGeral: number;
  totalPago: number;
  aReceber: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Totais do conjunto filtrado. Correção vs v1: "A Receber" é o RESTANTE
 * das vendas não pagas (desconta pagamentos parciais), não o valor cheio.
 */
export function resumoRelatorio(vendas: VendaRelatorio[]): ResumoRelatorio {
  const totalGeral = round2(vendas.reduce((s, v) => s + v.valorTotal, 0));
  const totalPago = round2(vendas.reduce((s, v) => s + v.valorPago, 0));
  const aReceber = round2(
    vendas
      .filter((v) => v.status !== "PAGA")
      .reduce((s, v) => s + (v.valorTotal - v.valorPago), 0),
  );
  return { registros: vendas.length, totalGeral, totalPago, aReceber };
}

/** "Período: 01/06/2026 a 30/06/2026" (ou só um dos lados), "" sem filtro. */
export function periodoLabel(de: string, ate: string): string {
  if (!de && !ate) return "";
  if (de && ate) return `Período: ${formatDataBR(de)} a ${formatDataBR(ate)}`;
  if (de) return `Período: a partir de ${formatDataBR(de)}`;
  return `Período: até ${formatDataBR(ate)}`;
}

// ── CSV (mesmas colunas do v1 + Pago/Restante do v2) ─────────────────────

const numeroCSV = (n: number) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function campoCSV(valor: string): string {
  return /[";\n]/.test(valor) ? `"${valor.replaceAll('"', '""')}"` : valor;
}

/**
 * CSV separado por ";" com BOM UTF-8 (abre direto no Excel pt-BR).
 * Uma linha por item; os dados da venda só na primeira linha (como no v1).
 */
export function csvRelatorio(vendas: VendaRelatorio[]): string {
  const linhas: string[][] = [
    [
      "#",
      "Cliente",
      "Referência",
      "Data Compra",
      "Vencimento",
      "Situação",
      "Total Venda (R$)",
      "Pago (R$)",
      "Restante (R$)",
      "Item",
      "Qtd",
      "Valor Unit. (R$)",
      "Subtotal Item (R$)",
    ],
  ];
  vendas.forEach((v, i) => {
    const dadosVenda = [
      String(i + 1),
      nomeClienteRelatorio(v),
      v.referencia ?? "",
      formatDataBR(v.dataCompra),
      formatDataBR(v.dataVencimento),
      STATUS_LABEL[v.status],
      numeroCSV(v.valorTotal),
      numeroCSV(v.valorPago),
      numeroCSV(round2(v.valorTotal - v.valorPago)),
    ];
    if (v.itens.length === 0) {
      linhas.push([...dadosVenda, "", "", "", ""]);
      return;
    }
    v.itens.forEach((item, j) => {
      linhas.push([
        ...(j === 0 ? dadosVenda : dadosVenda.map(() => "")),
        item.descricao,
        String(item.quantidade),
        numeroCSV(item.valorUnitario),
        numeroCSV(item.valorTotal),
      ]);
    });
  });
  const corpo = linhas.map((l) => l.map(campoCSV).join(";")).join("\r\n");
  // BOM UTF-8 explícito para o Excel reconhecer a codificação
  return "﻿" + corpo + "\r\n";
}
