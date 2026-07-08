import { describe, expect, it } from "vitest";

import {
  formatDataBR,
  maskBRL,
  parseBRL,
  somarDias,
} from "@/lib/format";

describe("maskBRL (digitação em centavos, como o v1)", () => {
  it("formata dígitos como moeda", () => {
    expect(maskBRL("1")).toBe("R$ 0,01");
    expect(maskBRL("1234")).toBe("R$ 12,34");
    expect(maskBRL("123456")).toBe("R$ 1.234,56");
  });

  it("ignora tudo que não é dígito e aceita vazio", () => {
    expect(maskBRL("R$ 12,34x")).toBe("R$ 12,34");
    expect(maskBRL("")).toBe("");
    expect(maskBRL("abc")).toBe("");
  });
});

describe("parseBRL", () => {
  it("converte string mascarada em número", () => {
    expect(parseBRL("R$ 1.234,56")).toBe(1234.56);
    expect(parseBRL("R$ 0,01")).toBe(0.01);
  });

  it("devolve 0 para vazio ou lixo", () => {
    expect(parseBRL("")).toBe(0);
    expect(parseBRL("abc")).toBe(0);
  });

  it("é o inverso da máscara", () => {
    expect(parseBRL(maskBRL("334000"))).toBe(3340);
  });
});

describe("formatDataBR", () => {
  it("converte ISO em dd/mm/aaaa sem sofrer com fuso", () => {
    expect(formatDataBR("2026-07-07")).toBe("07/07/2026");
    expect(formatDataBR("2026-01-01")).toBe("01/01/2026");
  });

  it("aceita null e timestamps", () => {
    expect(formatDataBR(null)).toBe("");
    expect(formatDataBR("2026-07-07T03:00:00Z")).toBe("07/07/2026");
  });
});

describe("somarDias", () => {
  it("soma 30 dias virando o mês", () => {
    expect(somarDias("2026-07-07", 30)).toBe("2026-08-06");
  });

  it("atravessa a virada do ano", () => {
    expect(somarDias("2026-12-15", 30)).toBe("2027-01-14");
  });

  it("respeita ano bissexto", () => {
    expect(somarDias("2028-01-31", 30)).toBe("2028-03-01");
  });
});
