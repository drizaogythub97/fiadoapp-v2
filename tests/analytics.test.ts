import { describe, expect, it } from "vitest";

import {
  faturamentoPorDia,
  filtrarPeriodo,
  periodoDoAtalho,
  resumoAnalytics,
  tetoEixo,
  topClientes,
  type VendaAnalytics,
} from "@/lib/analytics";

function venda(parcial: Partial<VendaAnalytics>): VendaAnalytics {
  return {
    id: crypto.randomUUID(),
    clienteId: "c1",
    nome: "Ana",
    sobrenome: null,
    referencia: null,
    dataCompra: "2026-07-01",
    status: "ATIVA",
    valorTotal: 100,
    valorPago: 0,
    ...parcial,
  };
}

describe("periodoDoAtalho", () => {
  it("este mês vai do dia 1 até hoje", () => {
    expect(periodoDoAtalho("mes", "2026-07-09")).toEqual({
      de: "2026-07-01",
      ate: "2026-07-09",
    });
  });

  it("30 dias inclui hoje (29 para trás)", () => {
    expect(periodoDoAtalho("30", "2026-07-09")).toEqual({
      de: "2026-06-10",
      ate: "2026-07-09",
    });
  });

  it("90 dias cruza a virada de mês", () => {
    expect(periodoDoAtalho("90", "2026-07-09")).toEqual({
      de: "2026-04-11",
      ate: "2026-07-09",
    });
  });

  it("este ano começa em 1º de janeiro", () => {
    expect(periodoDoAtalho("ano", "2026-07-09")).toEqual({
      de: "2026-01-01",
      ate: "2026-07-09",
    });
  });
});

describe("filtrarPeriodo", () => {
  const vendas = [
    venda({ dataCompra: "2026-06-30" }),
    venda({ dataCompra: "2026-07-01" }),
    venda({ dataCompra: "2026-07-05" }),
  ];

  it("aplica de/até inclusivos sobre a data da compra", () => {
    const r = filtrarPeriodo(vendas, "2026-07-01", "2026-07-05");
    expect(r.map((v) => v.dataCompra)).toEqual(["2026-07-01", "2026-07-05"]);
  });

  it("sem limites devolve tudo", () => {
    expect(filtrarPeriodo(vendas, "", "")).toHaveLength(3);
  });
});

describe("resumoAnalytics", () => {
  it("soma faturamento, recebido (parciais incluídos) e em aberto", () => {
    const r = resumoAnalytics([
      venda({ valorTotal: 100, valorPago: 100, status: "PAGA" }),
      venda({ valorTotal: 80.1, valorPago: 30.05, status: "PARCIAL" }),
      venda({ valorTotal: 50, valorPago: 0, status: "ATIVA", clienteId: "c2" }),
    ]);
    expect(r.faturamento).toBe(230.1);
    expect(r.recebido).toBe(130.05);
    expect(r.emAberto).toBe(100.05);
    expect(r.vendas).toBe(3);
    expect(r.clientes).toBe(2);
    expect(r.vendasPagas).toBe(1);
    expect(r.vendasAbertas).toBe(2);
  });

  it("período vazio zera tudo", () => {
    const r = resumoAnalytics([]);
    expect(r).toEqual({
      faturamento: 0,
      recebido: 0,
      emAberto: 0,
      vendas: 0,
      clientes: 0,
      vendasPagas: 0,
      vendasAbertas: 0,
    });
  });
});

describe("faturamentoPorDia", () => {
  it("preenche dias sem venda com zero e soma os repetidos", () => {
    const pontos = faturamentoPorDia(
      [
        venda({ dataCompra: "2026-07-01", valorTotal: 10 }),
        venda({ dataCompra: "2026-07-01", valorTotal: 5.5 }),
        venda({ dataCompra: "2026-07-03", valorTotal: 20 }),
      ],
      "2026-07-01",
      "2026-07-04",
    );
    expect(pontos).toEqual([
      { dia: "2026-07-01", total: 15.5 },
      { dia: "2026-07-02", total: 0 },
      { dia: "2026-07-03", total: 20 },
      { dia: "2026-07-04", total: 0 },
    ]);
  });

  it("período invertido ou vazio devolve lista vazia", () => {
    expect(faturamentoPorDia([], "2026-07-05", "2026-07-01")).toEqual([]);
    expect(faturamentoPorDia([], "", "2026-07-01")).toEqual([]);
  });

  it("trava períodos absurdos digitados à mão", () => {
    const pontos = faturamentoPorDia([], "2000-01-01", "2030-01-01");
    expect(pontos.length).toBe(1500);
  });
});

describe("topClientes", () => {
  it("agrupa por cliente, ordena por total e corta no limite", () => {
    const vendas = [
      venda({ clienteId: "a", nome: "Ana", valorTotal: 50 }),
      venda({ clienteId: "a", nome: "Ana", valorTotal: 30 }),
      venda({
        clienteId: "b",
        nome: "Bruno",
        sobrenome: "Silva",
        referencia: "Loja",
        valorTotal: 100,
      }),
      venda({ clienteId: "c", nome: "Caio", valorTotal: 10 }),
    ];
    const top = topClientes(vendas, 2);
    expect(top).toHaveLength(2);
    expect(top[0]).toMatchObject({
      nome: "Bruno Silva",
      referencia: "Loja",
      total: 100,
      qtdVendas: 1,
    });
    expect(top[1]).toMatchObject({ nome: "Ana", total: 80, qtdVendas: 2 });
  });

  it("desempata por nome (pt-BR)", () => {
    const vendas = [
      venda({ clienteId: "x", nome: "Érica", valorTotal: 10 }),
      venda({ clienteId: "y", nome: "Ana", valorTotal: 10 }),
    ];
    expect(topClientes(vendas).map((c) => c.nome)).toEqual(["Ana", "Érica"]);
  });
});

describe("tetoEixo", () => {
  it("arredonda para 1/2/2,5/5 × 10^k", () => {
    expect(tetoEixo(0)).toBe(100);
    expect(tetoEixo(87)).toBe(100);
    expect(tetoEixo(100)).toBe(100);
    expect(tetoEixo(101)).toBe(200);
    expect(tetoEixo(230)).toBe(250);
    expect(tetoEixo(3340)).toBe(5000);
    expect(tetoEixo(9999)).toBe(10000);
  });
});
