import { z } from "zod";

const opcional = (max: number, rotulo: string) =>
  z
    .string()
    .trim()
    .max(max, `${rotulo} muito longo(a).`)
    .transform((v) => (v === "" ? null : v));

/**
 * Cadastro/edição de cliente (paridade v1: nome, sobrenome, referência,
 * telefone, limite de crédito). Limite vazio = sem limite (null) —
 * e limite NUNCA bloqueia venda (decisão F2: só alerta/badge).
 */
export const clienteSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente.")
    .max(80, "Nome muito longo."),
  sobrenome: opcional(80, "Sobrenome"),
  referencia: opcional(80, "Referência"),
  telefone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo.")
    .regex(/^[\d\s().+-]*$/, "Telefone deve conter apenas números.")
    .transform((v) => {
      const digits = v.replace(/\D/g, "");
      return digits === "" ? null : digits;
    }),
  limiteCredito: z
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
    .transform((v) => (v === "" ? null : Math.round(Number(v) * 100) / 100)),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
