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

  // Vendas a prazo deste cliente lançadas no Gaveta precisam remover também
  // a venda do lado do Gaveta (e estornar o estoque) — o cascade do banco só
  // apaga o lado FiadoApp. A RPC-ponte remove os dois lados; fazemos isso
  // antes de apagar o cliente (exclusão consistente, F6 Fase 3).
  const { data: vendasGaveta } = await supabase
    .from("fiado_vendas")
    .select("id")
    .eq("cliente_id", id)
    .eq("user_id", user.id)
    .eq("origem", "gaveta");
  for (const v of vendasGaveta ?? []) {
    const { error: rpcError } = await supabase.rpc("excluir_venda_fiado", {
      p_venda_id: v.id,
    });
    if (rpcError) {
      return { error: "Não foi possível excluir. Tente novamente." };
    }
  }

  // on delete cascade no banco leva as vendas restantes (origem fiado), itens
  // e pagamentos junto com o cliente (paridade v1).
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
