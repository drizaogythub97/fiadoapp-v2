"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ZodIssue } from "zod";

import { createClient } from "@/lib/supabase/server";
import { clienteSchema } from "@/lib/validations/cliente";

export type ClienteFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<
      "nome" | "sobrenome" | "referencia" | "telefone" | "limiteCredito",
      string
    >
  >;
  values?: {
    nome?: string;
    sobrenome?: string;
    referencia?: string;
    telefone?: string;
    limiteCredito?: string;
  };
};

function readForm(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? ""),
    sobrenome: String(formData.get("sobrenome") ?? ""),
    referencia: String(formData.get("referencia") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    limiteCredito: String(formData.get("limiteCredito") ?? ""),
  };
}

function collectFieldErrors(
  issues: ZodIssue[],
): ClienteFormState["fieldErrors"] {
  const fieldErrors: ClienteFormState["fieldErrors"] = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (
      key === "nome" ||
      key === "sobrenome" ||
      key === "referencia" ||
      key === "telefone" ||
      key === "limiteCredito"
    ) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function criarCliente(
  _prev: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  const raw = readForm(formData);
  const parsed = clienteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fieldErrors: collectFieldErrors(parsed.error.issues),
      values: raw,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  const { error } = await supabase.from("fiado_clientes").insert({
    user_id: user.id,
    nome: parsed.data.nome,
    sobrenome: parsed.data.sobrenome,
    referencia: parsed.data.referencia,
    telefone: parsed.data.telefone,
    limite_credito: parsed.data.limiteCredito,
  });

  if (error) {
    return { error: "Não foi possível salvar. Tente novamente.", values: raw };
  }

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  redirect("/clientes");
}

export async function atualizarCliente(
  id: string,
  _prev: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  const raw = readForm(formData);
  const parsed = clienteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fieldErrors: collectFieldErrors(parsed.error.issues),
      values: raw,
    };
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
    .update({
      nome: parsed.data.nome,
      sobrenome: parsed.data.sobrenome,
      referencia: parsed.data.referencia,
      telefone: parsed.data.telefone,
      limite_credito: parsed.data.limiteCredito,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Não foi possível salvar. Tente novamente.", values: raw };
  }

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  redirect("/clientes");
}

export async function excluirCliente(id: string): Promise<{ error?: string }> {
  if (!id) return { error: "Cliente inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  // on delete cascade no banco leva vendas, itens e pagamentos juntos
  // (paridade v1: exclusão de cliente é em cascata).
  const { error } = await supabase
    .from("fiado_clientes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Não foi possível excluir. Tente novamente." };
  }

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  return {};
}
