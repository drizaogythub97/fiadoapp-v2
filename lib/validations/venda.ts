import { z } from "zod";

import { clienteSchema } from "@/lib/validations/cliente";

const dataISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Data inválida.");

const valorMonetario = z
  .number({ error: "Valor inválido." })
  .nonnegative("Valor inválido.")
  .max(99_999_999, "Valor muito alto.")
  .transform((v) => Math.round(v * 100) / 100);

export const itemVendaSchema = z.object({
  descricao: z
    .string()
    .trim()
    .min(1, "Informe a descrição do produto.")
    .max(120, "Descrição muito longa."),
  quantidade: z
    .number({ error: "Quantidade inválida." })
    .int("Quantidade inválida.")
    .min(1, "Quantidade mínima é 1.")
    .max(99_999, "Quantidade muito alta."),
  valorUnitario: valorMonetario,
});

/**
 * Nova venda (paridade v1): cliente já cadastrado (clienteId) OU cliente
 * novo inline (sem limite de crédito — igual ao v1). Os itens chegam já
 * convertidos da máscara BRL para número no cliente, mas são revalidados
 * aqui. A RPC fiado_registrar_venda refaz as mesmas checagens no banco.
 */
export const vendaSchema = z
  .object({
    clienteId: z.uuid("Cliente inválido.").nullable(),
    clienteNovo: clienteSchema.omit({ limiteCredito: true }).nullable(),
    dataCompra: dataISO,
    dataVencimento: dataISO.nullable(),
    observacao: z
      .string()
      .trim()
      .max(500, "Observação muito longa.")
      .transform((v) => (v === "" ? null : v)),
    itens: z
      .array(itemVendaSchema)
      .min(1, "Adicione pelo menos um produto.")
      .max(100, "Muitos produtos numa venda só."),
  })
  .refine((d) => (d.clienteId === null) !== (d.clienteNovo === null), {
    message: "Escolha um cliente já cadastrado ou preencha um novo.",
    path: ["clienteId"],
  })
  .refine(
    (d) =>
      d.itens.reduce(
        (soma, i) => soma + Math.round(i.valorUnitario * i.quantidade * 100),
        0,
      ) > 0,
    { message: "O valor total da venda precisa ser maior que zero.", path: ["itens"] },
  );

export type VendaInput = z.infer<typeof vendaSchema>;

/**
 * Quitação (decisão F2): "total" e "selecionadas" quitam vendas inteiras;
 * "parcial" abate um valor em CASCATA das vendas mais antigas. Overpay é
 * rejeitado pela RPC fiado_registrar_pagamento.
 */
export const pagamentoSchema = z.discriminatedUnion(
  "modo",
  [
    z.object({
      modo: z.literal("total"),
      clienteId: z.uuid("Cliente inválido."),
    }),
    z.object({
      modo: z.literal("selecionadas"),
      clienteId: z.uuid("Cliente inválido."),
      vendaIds: z
        .array(z.uuid("Venda inválida."))
        .min(1, "Selecione pelo menos uma venda.")
        .max(500, "Seleção muito grande."),
    }),
    z.object({
      modo: z.literal("parcial"),
      clienteId: z.uuid("Cliente inválido."),
      valor: z
        .number({ error: "Informe um valor válido." })
        .positive("Informe um valor maior que zero.")
        .max(99_999_999, "Valor muito alto.")
        .transform((v) => Math.round(v * 100) / 100),
    }),
  ],
  { error: "Tipo de quitação inválido." },
);

export type PagamentoInput = z.infer<typeof pagamentoSchema>;
