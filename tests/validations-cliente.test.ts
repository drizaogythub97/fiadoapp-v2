import { describe, expect, it } from "vitest";

import { clienteSchema } from "@/lib/validations/cliente";

const base = {
  nome: "Maria",
  sobrenome: "",
  referencia: "",
  telefone: "",
  limiteCredito: "",
};

describe("clienteSchema", () => {
  it("aceita cliente só com nome; opcionais viram null", () => {
    const parsed = clienteSchema.parse(base);
    expect(parsed.nome).toBe("Maria");
    expect(parsed.sobrenome).toBeNull();
    expect(parsed.referencia).toBeNull();
    expect(parsed.telefone).toBeNull();
    expect(parsed.limiteCredito).toBeNull();
  });

  it("rejeita nome vazio ou só espaços", () => {
    expect(clienteSchema.safeParse({ ...base, nome: "   " }).success).toBe(
      false,
    );
  });

  it("normaliza telefone para apenas dígitos", () => {
    const parsed = clienteSchema.parse({
      ...base,
      telefone: "(11) 91234-5678",
    });
    expect(parsed.telefone).toBe("11912345678");
  });

  it("rejeita telefone com letras", () => {
    expect(
      clienteSchema.safeParse({ ...base, telefone: "11 abc 99" }).success,
    ).toBe(false);
  });

  it("converte limite com vírgula e arredonda para 2 casas", () => {
    const parsed = clienteSchema.parse({ ...base, limiteCredito: "300,505" });
    expect(parsed.limiteCredito).toBe(300.51);
  });

  it("rejeita limite negativo ou não numérico", () => {
    expect(
      clienteSchema.safeParse({ ...base, limiteCredito: "-5" }).success,
    ).toBe(false);
    expect(
      clienteSchema.safeParse({ ...base, limiteCredito: "abc" }).success,
    ).toBe(false);
  });

  it("apara espaços de todos os campos", () => {
    const parsed = clienteSchema.parse({
      nome: "  João  ",
      sobrenome: " Silva ",
      referencia: " Loja ",
      telefone: " 11 91234 5678 ",
      limiteCredito: " 50 ",
    });
    expect(parsed.nome).toBe("João");
    expect(parsed.sobrenome).toBe("Silva");
    expect(parsed.referencia).toBe("Loja");
    expect(parsed.telefone).toBe("11912345678");
    expect(parsed.limiteCredito).toBe(50);
  });
});
