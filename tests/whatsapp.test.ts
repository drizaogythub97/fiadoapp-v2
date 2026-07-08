import { describe, expect, it } from "vitest";

import {
  textoComprovanteVenda,
  textoEspelhoCliente,
  type ComprovanteVendaData,
  type EspelhoClienteData,
} from "@/lib/comprovante";
import {
  diasDeAtraso,
  linkCobrancaWhatsApp,
  linkWhatsAppTexto,
} from "@/lib/whatsapp";

describe("linkCobrancaWhatsApp", () => {
  const base = {
    nome: "Maria",
    telefone: "11912345678",
    valorEmAberto: 185.3,
  };

  it("monta o link wa.me com DDI 55 e a mensagem do v1", () => {
    const link = linkCobrancaWhatsApp(base)!;
    expect(link.startsWith("https://wa.me/5511912345678?text=")).toBe(true);
    const msg = decodeURIComponent(link.split("text=")[1]);
    expect(msg).toContain("Olá, Maria!");
    // formatBRL usa espaço não separável entre "R$" e o número
    expect(msg).toContain("185,30");
    expect(msg).toContain("em aberto aqui conosco");
    expect(msg).toContain("estou à disposição");
    expect(msg).not.toContain("vencido há");
  });

  it("inclui os dias de atraso com singular/plural", () => {
    const um = decodeURIComponent(
      linkCobrancaWhatsApp({ ...base, diasAtraso: 1 })!.split("text=")[1],
    );
    expect(um).toContain("(vencido há 1 dia)");
    const cinco = decodeURIComponent(
      linkCobrancaWhatsApp({ ...base, diasAtraso: 5 })!.split("text=")[1],
    );
    expect(cinco).toContain("(vencido há 5 dias)");
  });

  it("aceita telefone com máscara e devolve null sem telefone ou sem dívida", () => {
    expect(
      linkCobrancaWhatsApp({ ...base, telefone: "(11) 91234-5678" }),
    ).toContain("5511912345678");
    expect(linkCobrancaWhatsApp({ ...base, telefone: null })).toBeNull();
    expect(linkCobrancaWhatsApp({ ...base, telefone: "" })).toBeNull();
    expect(linkCobrancaWhatsApp({ ...base, valorEmAberto: 0 })).toBeNull();
  });
});

describe("linkWhatsAppTexto", () => {
  it("codifica o texto e devolve null sem telefone", () => {
    const link = linkWhatsAppTexto("11912345678", "linha 1\nlinha 2")!;
    expect(link).toBe(
      "https://wa.me/5511912345678?text=linha%201%0Alinha%202",
    );
    expect(linkWhatsAppTexto(null, "oi")).toBeNull();
  });
});

describe("diasDeAtraso", () => {
  it("0 quando não venceu ou vence hoje", () => {
    expect(diasDeAtraso("2026-07-08", "2026-07-07")).toBe(0);
    expect(diasDeAtraso("2026-07-07", "2026-07-07")).toBe(0);
    expect(diasDeAtraso(null, "2026-07-07")).toBe(0);
  });

  it("conta dias corridos, inclusive na virada de mês/ano", () => {
    expect(diasDeAtraso("2026-07-06", "2026-07-07")).toBe(1);
    expect(diasDeAtraso("2026-06-30", "2026-07-07")).toBe(7);
    expect(diasDeAtraso("2025-12-31", "2026-01-02")).toBe(2);
  });
});

describe("textoComprovanteVenda", () => {
  const data: ComprovanteVendaData = {
    vendaId: "x",
    cliente: {
      nome: "Maria",
      sobrenome: "Silva",
      referencia: "Loja",
      telefone: "11912345678",
    },
    dataCompra: "2026-07-07",
    dataVencimento: "2026-08-06",
    status: "PARCIAL",
    quitadoEm: null,
    observacao: "Combinou pagar na sexta",
    itens: [
      { descricao: "Ração 15kg", quantidade: 2, valorUnitario: 79.9, valorTotal: 159.8 },
    ],
    pagamentos: [{ pagoEm: "2026-07-07T12:00:00Z", valor: 59.8 }],
    valorTotal: 159.8,
    valorPago: 59.8,
  };

  it("gera o espelho com itens, total, pago, falta e observação", () => {
    const texto = textoComprovanteVenda(data);
    expect(texto).toContain("*Espelho da venda — FiadoApp*");
    expect(texto).toContain("Cliente: Maria Silva (Loja)");
    expect(texto).toContain("Compra: 07/07/2026");
    expect(texto).toContain("- 2x Ração 15kg —");
    expect(texto).toContain("Pago:");
    expect(texto).toContain("Falta:");
    expect(texto).toContain("Situação: Parcialmente paga");
    expect(texto).toContain("Obs.: Combinou pagar na sexta");
  });

  it("venda paga vira comprovante e não mostra 'Falta'", () => {
    const texto = textoComprovanteVenda({
      ...data,
      status: "PAGA",
      valorPago: 159.8,
      observacao: null,
    });
    expect(texto).toContain("*Comprovante de venda — FiadoApp*");
    expect(texto).not.toContain("Falta:");
    expect(texto).toContain("Situação: Paga");
  });
});

describe("textoEspelhoCliente", () => {
  const data: EspelhoClienteData = {
    cliente: {
      nome: "Maria",
      sobrenome: "Silva",
      referencia: "Loja",
      telefone: "11912345678",
    },
    geradoEm: "2026-07-08T12:00:00Z",
    vendas: [
      {
        dataCompra: "2026-06-01",
        dataVencimento: "2026-07-01",
        status: "PARCIAL",
        observacao: "Combinou pagar na sexta",
        itens: [
          { descricao: "Ração 15kg", quantidade: 2, valorUnitario: 79.9, valorTotal: 159.8 },
        ],
        valorTotal: 159.8,
        valorPago: 59.8,
      },
      {
        dataCompra: "2026-07-05",
        dataVencimento: null,
        status: "ATIVA",
        observacao: null,
        itens: [
          { descricao: "Milho 25kg", quantidade: 1, valorUnitario: 85.5, valorTotal: 85.5 },
        ],
        valorTotal: 85.5,
        valorPago: 0,
      },
    ],
    totalEmAberto: 185.5,
  };

  it("agrupa todas as vendas em aberto com itens e total geral", () => {
    const texto = textoEspelhoCliente(data);
    expect(texto).toContain("*Espelho das vendas em aberto — FiadoApp*");
    expect(texto).toContain("Cliente: Maria Silva (Loja)");
    expect(texto).toContain("*Venda de 01/06/2026*");
    expect(texto).toContain("Vencimento: 01/07/2026");
    expect(texto).toContain("- 2x Ração 15kg —");
    expect(texto).toContain("Obs.: Combinou pagar na sexta");
    expect(texto).toContain("*Venda de 05/07/2026*");
    expect(texto).toContain("- 1x Milho 25kg —");
    // formatBRL usa espaço não separável — comparar só o número
    expect(texto).toContain("185,50");
  });

  it("mostra pago/falta só na venda parcialmente paga", () => {
    const texto = textoEspelhoCliente(data);
    const [primeira, segunda] = texto.split("*Venda de 05/07/2026*");
    expect(primeira).toContain("Pago:");
    expect(primeira).toContain("Falta:");
    expect(segunda).not.toContain("Pago:");
    expect(segunda).not.toContain("Falta:");
  });
});
