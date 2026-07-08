import { describe, expect, it } from "vitest";

import {
  FILTROS_INICIAIS,
  csvRelatorio,
  filtrarVendasRelatorio,
  periodoLabel,
  resumoRelatorio,
  type VendaRelatorio,
} from "@/lib/relatorio";

function venda(parcial: Partial<VendaRelatorio>): VendaRelatorio {
  return {
    id: "v1",
    nome: "Maria",
    sobrenome: null,
    referencia: null,
    dataCompra: "2026-07-01",
    dataVencimento: "2026-07-31",
    status: "ATIVA",
    valorTotal: 100,
    valorPago: 0,
    itens: [
      { descricao: "Item", quantidade: 1, valorUnitario: 100, valorTotal: 100 },
    ],
    ...parcial,
  };
}

const VENDAS: VendaRelatorio[] = [
  venda({ id: "a", nome: "Ana", dataCompra: "2026-06-01" }),
  venda({
    id: "b",
    nome: "Bruno",
    referencia: "Oficina",
    dataCompra: "2026-06-15",
    status: "PARCIAL",
    valorTotal: 200,
    valorPago: 50,
  }),
  venda({
    id: "c",
    nome: "Ágata",
    dataCompra: "2026-07-01",
    status: "PAGA",
    valorTotal: 80,
    valorPago: 80,
  }),
];

describe("filtrarVendasRelatorio", () => {
  it("sem filtros devolve tudo", () => {
    expect(filtrarVendasRelatorio(VENDAS, FILTROS_INICIAIS)).toHaveLength(3);
  });

  it("filtra por período sobre a data da compra (inclusivo)", () => {
    const soJunho = filtrarVendasRelatorio(VENDAS, {
      ...FILTROS_INICIAIS,
      de: "2026-06-01",
      ate: "2026-06-30",
    });
    expect(soJunho.map((v) => v.id)).toEqual(["a", "b"]);
  });

  it("situação: 'abertas' inclui PARCIAL; 'pagas' só PAGA", () => {
    const abertas = filtrarVendasRelatorio(VENDAS, {
      ...FILTROS_INICIAIS,
      situacao: "abertas",
    });
    expect(abertas.map((v) => v.id)).toEqual(["a", "b"]);
    const pagas = filtrarVendasRelatorio(VENDAS, {
      ...FILTROS_INICIAIS,
      situacao: "pagas",
    });
    expect(pagas.map((v) => v.id)).toEqual(["c"]);
  });

  it("inicial ignora acento (Á conta como A)", () => {
    const comA = filtrarVendasRelatorio(VENDAS, {
      ...FILTROS_INICIAIS,
      inicial: "A",
    });
    expect(comA.map((v) => v.id)).toEqual(["a", "c"]);
  });

  it("busca por nome ou referência, sem diferenciar acento/caixa", () => {
    const oficina = filtrarVendasRelatorio(VENDAS, {
      ...FILTROS_INICIAIS,
      busca: "OFICINA",
    });
    expect(oficina.map((v) => v.id)).toEqual(["b"]);
    const agata = filtrarVendasRelatorio(VENDAS, {
      ...FILTROS_INICIAIS,
      busca: "agata",
    });
    expect(agata.map((v) => v.id)).toEqual(["c"]);
  });
});

describe("resumoRelatorio", () => {
  it("A Receber é o RESTANTE das não pagas (correção vs v1)", () => {
    const r = resumoRelatorio(VENDAS);
    expect(r.registros).toBe(3);
    expect(r.totalGeral).toBe(380);
    expect(r.totalPago).toBe(130);
    // 100 (ATIVA) + 150 (restante da PARCIAL) — não 300
    expect(r.aReceber).toBe(250);
  });
});

describe("periodoLabel", () => {
  it("monta o rótulo conforme os lados preenchidos", () => {
    expect(periodoLabel("", "")).toBe("");
    expect(periodoLabel("2026-06-01", "2026-06-30")).toBe(
      "Período: 01/06/2026 a 30/06/2026",
    );
    expect(periodoLabel("2026-06-01", "")).toBe(
      "Período: a partir de 01/06/2026",
    );
    expect(periodoLabel("", "2026-06-30")).toBe("Período: até 30/06/2026");
  });
});

describe("csvRelatorio", () => {
  it("gera BOM, cabeçalho e uma linha por item (dados da venda só na 1ª)", () => {
    const csv = csvRelatorio([
      venda({
        nome: "Maria",
        sobrenome: "Silva",
        referencia: "Loja",
        status: "PARCIAL",
        valorTotal: 200,
        valorPago: 50,
        itens: [
          {
            descricao: "Ração 15kg",
            quantidade: 2,
            valorUnitario: 79.9,
            valorTotal: 159.8,
          },
          {
            descricao: "Milho",
            quantidade: 1,
            valorUnitario: 40.2,
            valorTotal: 40.2,
          },
        ],
      }),
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    const linhas = csv.slice(1).trimEnd().split("\r\n");
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toContain("#;Cliente;Referência");
    expect(linhas[1]).toContain("1;Maria Silva;Loja;01/07/2026;31/07/2026");
    expect(linhas[1]).toContain("Parcialmente paga;200,00;50,00;150,00");
    expect(linhas[1]).toContain("Ração 15kg;2;79,90;159,80");
    // Segunda linha de item: colunas da venda vazias
    expect(linhas[2].startsWith(";;;;;;;;;Milho;1;40,20;40,20")).toBe(true);
  });

  it("venda sem itens sai numa linha só; campos com ; ou aspas são escapados", () => {
    const csv = csvRelatorio([
      venda({ nome: 'Zé; o "Bom"', itens: [] }),
    ]);
    const linhas = csv.slice(1).trimEnd().split("\r\n");
    expect(linhas).toHaveLength(2);
    expect(linhas[1]).toContain('"Zé; o ""Bom"""');
  });
});
