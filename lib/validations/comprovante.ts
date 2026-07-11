import { z } from "zod";

/** Pedido de emissão de comprovante (server action `dadosComprovante`). */
export const pedidoComprovanteSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("venda"),
    vendaId: z.string().uuid(),
  }),
  z.object({
    tipo: z.literal("quitacao"),
    clienteId: z.string().uuid(),
    em: z
      .string()
      .max(64)
      .refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida."),
  }),
  z.object({
    tipo: z.literal("espelho-cliente"),
    clienteId: z.string().uuid(),
  }),
]);
