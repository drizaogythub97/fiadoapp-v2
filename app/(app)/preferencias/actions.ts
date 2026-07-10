"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  limiteClienteSchema,
  limitePadraoSchema,
} from "@/lib/validations/preferencias";

// A troca de limite mexe em badge/alerta espalhados pelo app.
const ROTAS_AFETADAS = ["/preferencias", "/clientes", "/dashboard", "/vendas"];

export async function salvarLimitePadrao(
  limitePadrao: string,
): Promise<{ error?: string }> {
  const parsed = limitePadraoSchema.safeParse({ limitePadrao });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Valor inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  const { error } = await supabase.from("fiado_preferencias").upsert({
    user_id: user.id,
    limite_credito_padrao: parsed.data.limitePadrao,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  for (const rota of ROTAS_AFETADAS) revalidatePath(rota);
  return {};
}

export async function salvarLimiteCliente(
  clienteId: string,
  limite: string,
): Promise<{ error?: string }> {
  const parsed = limiteClienteSchema.safeParse({ clienteId, limite });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Valor inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  const { error } = await supabase
    .from("fiado_clientes")
    .update({ limite_credito: parsed.data.limite })
    .eq("id", parsed.data.clienteId)
    .eq("user_id", user.id);
  if (error) {
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  for (const rota of ROTAS_AFETADAS) revalidatePath(rota);
  return {};
}
