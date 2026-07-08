import { describe, expect, it } from "vitest";

import { pagamentoSchema, vendaSchema } from "@/lib/validations/venda";

const UUID = "8b43f787-756d-4751-8339-70cc54944a75";

const itemBase = { descricao: "Ração 15kg", quantidade: 2, valorUnitario: 79.9 };

const vendaBase = {
  clienteId: UUID,
  clienteNovo: null,
  dataCompra: "2026-07-07",
  dataVencimento: "2026-08-06",
  observacao: "",
  itens: [itemBase],
};

describe("vendaSchema", () => {
  it("aceita venda para cliente existente", () => {
    const parsed = vendaSchema.parse(vendaBase);
    expect(parsed.clienteId).toBe(UUID);
    expect(parsed.observacao).toBeNull();
    expect(parsed.itens[0].valorUnitario).toBe(79.9);
  });

  it("aceita venda com cliente novo inline (opcionais viram null)", () => {
    const parsed = vendaSchema.parse({
      ...vendaBase,
      clienteId: null,
      clienteNovo: {
        nome: "Maria",
        sobrenome: "",
        referencia: "",
        telefone: "(11) 91234-5678",
      },
    });
    expect(parsed.clienteNovo?.nome).toBe("Maria");
    expect(parsed.clienteNovo?.sobrenome).toBeNull();
    expect(parsed.clienteNovo?.telefone).toBe("11912345678");
  });

  it("rejeita cliente existente E novo ao mesmo tempo (ou nenhum)", () => {
    expect(
      vendaSchema.safeParse({
        ...vendaBase,
        clienteNovo: {
          nome: "Maria",
          sobrenome: "",
          referencia: "",
          telefone: "",
        },
      }).success,
    ).toBe(false);
    expect(
      vendaSchema.safeParse({ ...vendaBase, clienteId: null }).success,
    ).toBe(false);
  });

  it("rejeita venda sem itens e venda com total zero", () => {
    expect(vendaSchema.safeParse({ ...vendaBase, itens: [] }).success).toBe(
      false,
    );
    expect(
      vendaSchema.safeParse({
        ...vendaBase,
        itens: [{ ...itemBase, valorUnitario: 0 }],
      }).success,
    ).toBe(false);
  });

  it("rejeita quantidade não inteira, zero ou negativa", () => {
    for (const quantidade of [0, -1, 1.5]) {
      expect(
        vendaSchema.safeParse({
          ...vendaBase,
          itens: [{ ...itemBase, quantidade }],
        }).success,
      ).toBe(false);
    }
  });

  it("rejeita data em formato inválido e aceita vencimento nulo", () => {
    expect(
      vendaSchema.safeParse({ ...vendaBase, dataCompra: "07/07/2026" })
        .success,
    ).toBe(false);
    expect(
      vendaSchema.safeParse({ ...vendaBase, dataVencimento: null }).success,
    ).toBe(true);
  });

  it("arredonda valor unitário para 2 casas", () => {
    const parsed = vendaSchema.parse({
      ...vendaBase,
      itens: [{ ...itemBase, valorUnitario: 10.555 }],
    });
    expect(parsed.itens[0].valorUnitario).toBe(10.56);
  });
});

describe("pagamentoSchema", () => {
  it("aceita os três modos de quitação", () => {
    expect(
      pagamentoSchema.safeParse({ modo: "total", clienteId: UUID }).success,
    ).toBe(true);
    expect(
      pagamentoSchema.safeParse({
        modo: "selecionadas",
        clienteId: UUID,
        vendaIds: [UUID],
      }).success,
    ).toBe(true);
    expect(
      pagamentoSchema.safeParse({
        modo: "parcial",
        clienteId: UUID,
        valor: 50,
      }).success,
    ).toBe(true);
  });

  it("rejeita seleção vazia e valor não positivo", () => {
    expect(
      pagamentoSchema.safeParse({
        modo: "selecionadas",
        clienteId: UUID,
        vendaIds: [],
      }).success,
    ).toBe(false);
    for (const valor of [0, -10]) {
      expect(
        pagamentoSchema.safeParse({ modo: "parcial", clienteId: UUID, valor })
          .success,
      ).toBe(false);
    }
  });

  it("rejeita modo desconhecido e uuid inválido", () => {
    expect(
      pagamentoSchema.safeParse({ modo: "outro", clienteId: UUID }).success,
    ).toBe(false);
    expect(
      pagamentoSchema.safeParse({ modo: "total", clienteId: "123" }).success,
    ).toBe(false);
  });

  it("arredonda o valor parcial para 2 casas", () => {
    const parsed = pagamentoSchema.parse({
      modo: "parcial",
      clienteId: UUID,
      valor: 33.333,
    });
    expect(parsed.modo === "parcial" && parsed.valor).toBe(33.33);
  });
});
