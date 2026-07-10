import { describe, expect, it } from "vitest";

import {
  limiteClienteSchema,
  limitePadraoSchema,
} from "@/lib/validations/preferencias";

describe("limitePadraoSchema", () => {
  it("vazio vira null (sem limite)", () => {
    const r = limitePadraoSchema.parse({ limitePadrao: "  " });
    expect(r.limitePadrao).toBeNull();
  });

  it("aceita vírgula decimal e arredonda em 2 casas", () => {
    const r = limitePadraoSchema.parse({ limitePadrao: "500,555" });
    expect(r.limitePadrao).toBe(500.56);
  });

  it("rejeita negativo e não numérico", () => {
    expect(limitePadraoSchema.safeParse({ limitePadrao: "-1" }).success).toBe(
      false,
    );
    expect(limitePadraoSchema.safeParse({ limitePadrao: "abc" }).success).toBe(
      false,
    );
  });

  it("rejeita valor acima do teto", () => {
    expect(
      limitePadraoSchema.safeParse({ limitePadrao: "100000000" }).success,
    ).toBe(false);
  });
});

describe("limiteClienteSchema", () => {
  it("exige uuid válido", () => {
    expect(
      limiteClienteSchema.safeParse({ clienteId: "123", limite: "10" })
        .success,
    ).toBe(false);
    expect(
      limiteClienteSchema.safeParse({
        clienteId: "8b43f787-756d-4751-8339-70cc54944a75",
        limite: "10",
      }).success,
    ).toBe(true);
  });
});
