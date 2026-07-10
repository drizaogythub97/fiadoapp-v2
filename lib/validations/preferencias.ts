import { z } from "zod";

/**
 * Preferências (F4d-3). O limite padrão segue a mesma regra do limite por
 * cliente: vazio = sem limite (null); NUNCA bloqueia venda (decisão F2).
 */

const limiteOpcional = z
  .string()
  .trim()
  .transform((v) => v.replace(",", "."))
  .refine(
    (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
    "Limite de crédito inválido.",
  )
  .refine(
    (v) => v === "" || Number(v) <= 99_999_999,
    "Limite de crédito muito alto.",
  )
  .transform((v) => (v === "" ? null : Math.round(Number(v) * 100) / 100));

export const limitePadraoSchema = z.object({
  limitePadrao: limiteOpcional,
});

export const limiteClienteSchema = z.object({
  clienteId: z.uuid("Cliente inválido."),
  limite: limiteOpcional,
});
