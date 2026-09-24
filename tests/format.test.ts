import { describe, expect, it } from "vitest";

import {
  formatDataBR,
  formatDataHoraBR,
  formatInstanteBR,
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

describe("fuso da loja (o servidor roda em UTC, a loja não)", () => {
  // Esta suíte roda com TZ=UTC (ver vitest.config.ts), como a Vercel. Sem
  // isso, na máquina de quem desenvolve — em Brasília — estes testes
  // passariam mesmo com o fuso solto, concordando com o bug.

  it("uma venda da noite não pula para o dia seguinte", () => {
    // 16/09 00:17 UTC é 15/09 21:17 em São Paulo. Quem decide o dia é a
    // loja: para o lojista, essa venda é de segunda, não de terça.
    expect(formatInstanteBR("2026-09-16T00:17:00Z")).toBe("15/09/2026");
    expect(formatDataHoraBR("2026-09-16T00:17:00Z")).toBe("15/09/2026, 21:17");
  });

  it("mantém o dia quando o horário não cruza a virada", () => {
    expect(formatInstanteBR("2026-09-16T15:39:41Z")).toBe("16/09/2026");
    expect(formatDataHoraBR("2026-09-16T15:39:41Z")).toBe("16/09/2026, 12:39");
  });

  it("o primeiro minuto do dia em São Paulo já é o dia novo", () => {
    expect(formatInstanteBR("2026-01-01T03:00:00Z")).toBe("01/01/2026");
  });
});
