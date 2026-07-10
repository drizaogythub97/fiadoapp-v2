import { hojeISO, somarDias } from "@/lib/format";
import type { VendaStatus } from "@/lib/types/fiado";

/** Dados e agregações da tela de Analytics (paridade com o v1). */

export type VendaAnalytics = {
  id: string;
  clienteId: string;
  nome: string;
  sobrenome: string | null;
  referencia: string | null;
  /** "aaaa-mm-dd" — data da compra, eixo de todas as agregações (como no v1). */
  dataCompra: string;
  status: VendaStatus;
  valorTotal: number;
  valorPago: number;
};

export type AtalhoPeriodo = "mes" | "30" | "90" | "ano";

export const ATALHOS_PERIODO: { valor: AtalhoPeriodo; rotulo: string }[] = [
  { valor: "mes", rotulo: "Este mês" },
  { valor: "30", rotulo: "30 dias" },
  { valor: "90", rotulo: "90 dias" },
  { valor: "ano", rotulo: "Este ano" },
];

/** Período (de/até) de cada atalho, com "hoje" injetável para testes. */
export function periodoDoAtalho(
  atalho: AtalhoPeriodo,
  hoje: string = hojeISO(),
): { de: string; ate: string } {
  switch (atalho) {
    case "mes":
      return { de: `${hoje.slice(0, 8)}01`, ate: hoje };
    case "30":
      return { de: somarDias(hoje, -29), ate: hoje };
    case "90":
      return { de: somarDias(hoje, -89), ate: hoje };
    case "ano":
      return { de: `${hoje.slice(0, 5)}01-01`, ate: hoje };
  }
}

export function filtrarPeriodo(
  vendas: VendaAnalytics[],
  de: string,
  ate: string,
): VendaAnalytics[] {
  let lista = vendas;
  if (de) lista = lista.filter((v) => v.dataCompra >= de);
  if (ate) lista = lista.filter((v) => v.dataCompra <= ate);
  return lista;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ResumoAnalytics = {
  /** Σ valor_total das vendas do período. */
  faturamento: number;
  /** Σ valor_pago — inclui pagamentos parciais (correção vs v1). */
  recebido: number;
  /** Σ restante (valor_total - valor_pago) das vendas não pagas. */
  emAberto: number;
  vendas: number;
  clientes: number;
  vendasPagas: number;
  vendasAbertas: number;
};

export function resumoAnalytics(vendas: VendaAnalytics[]): ResumoAnalytics {
  const faturamento = round2(vendas.reduce((s, v) => s + v.valorTotal, 0));
  const recebido = round2(vendas.reduce((s, v) => s + v.valorPago, 0));
  const vendasPagas = vendas.filter((v) => v.status === "PAGA").length;
  return {
    faturamento,
    recebido,
    emAberto: round2(faturamento - recebido),
    vendas: vendas.length,
    clientes: new Set(vendas.map((v) => v.clienteId)).size,
    vendasPagas,
    vendasAbertas: vendas.length - vendasPagas,
  };
}

export type PontoDia = { dia: string; total: number };

/** Trava de segurança para períodos digitados à mão (≈ 4 anos, dia a dia). */
const MAX_DIAS_GRAFICO = 1500;

/**
 * Faturamento por dia, com TODOS os dias do período (dias sem venda = 0 —
 * o eixo do tempo é contínuo; o v1 pulava os dias vazios e distorcia a linha).
 */
export function faturamentoPorDia(
  vendas: VendaAnalytics[],
  de: string,
  ate: string,
): PontoDia[] {
  if (!de || !ate || de > ate) return [];
  const porDia = new Map<string, number>();
  for (const v of vendas) {
    porDia.set(v.dataCompra, (porDia.get(v.dataCompra) ?? 0) + v.valorTotal);
  }
  const pontos: PontoDia[] = [];
  let dia = de;
  while (dia <= ate && pontos.length < MAX_DIAS_GRAFICO) {
    pontos.push({ dia, total: round2(porDia.get(dia) ?? 0) });
    dia = somarDias(dia, 1);
  }
  return pontos;
}

export type TopCliente = {
  clienteId: string;
  nome: string;
  referencia: string | null;
  total: number;
  qtdVendas: number;
};

/** Top clientes por faturamento no período (10 no v1). */
export function topClientes(
  vendas: VendaAnalytics[],
  limite = 10,
): TopCliente[] {
  const mapa = new Map<string, TopCliente>();
  for (const v of vendas) {
    const atual = mapa.get(v.clienteId);
    if (atual) {
      atual.total = round2(atual.total + v.valorTotal);
      atual.qtdVendas += 1;
    } else {
      mapa.set(v.clienteId, {
        clienteId: v.clienteId,
        nome: v.sobrenome ? `${v.nome} ${v.sobrenome}` : v.nome,
        referencia: v.referencia,
        total: round2(v.valorTotal),
        qtdVendas: 1,
      });
    }
  }
  return [...mapa.values()]
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, limite);
}

/** Valor "redondo" ≥ max para o topo do eixo Y (1/2/2,5/5 × 10^k). */
export function tetoEixo(max: number): number {
  if (max <= 0) return 100;
  const expoente = Math.floor(Math.log10(max));
  const base = Math.pow(10, expoente);
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (max <= m * base) return m * base;
  }
  return 10 * base;
}
