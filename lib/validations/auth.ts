import { z } from "zod";

const email = z.email("Digite um e-mail válido.");

// F1: apenas login. Cadastro/recuperação (com política de senha completa em
// `./password.ts`) entram em fase posterior — a conta é a mesma do Gaveta.
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;
