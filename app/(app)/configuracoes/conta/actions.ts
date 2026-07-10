"use server";

import { createClient as createSbClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServiceRoleKey, publicEnv } from "@/lib/env";
import { BUCKET_LOGOS } from "@/lib/marca";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  checkPasswordStrength,
} from "@/lib/validations/password";

export type ActionResult = { ok: boolean; error?: string };

const nameSchema = z
  .string()
  .trim()
  .min(2, "Informe seu nome (mínimo 2 caracteres).")
  .max(120, "Nome muito longo (máx. 120 caracteres).");

const emailSchema = z.email("Digite um e-mail válido.");

// =====================================================================
// Atualizar nome
// =====================================================================

export async function atualizarNome(fullName: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(fullName);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Nome inválido.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  // Fonte do Fiado: user_metadata. O nome é identidade (a conta é a mesma
  // no ecossistema), então espelhamos em profiles para o Gaveta ficar
  // coerente — melhor esforço, sem depender do resultado.
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data },
  });
  if (error) {
    return { ok: false, error: "Não foi possível salvar." };
  }
  await supabase
    .from("profiles")
    .update({ full_name: parsed.data })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return { ok: true };
}

// =====================================================================
// Reautenticação antes de mudanças sensíveis (padrão Gaveta)
// =====================================================================

async function reautenticar(
  senhaAtual: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (!senhaAtual || senhaAtual.length === 0) {
    return { ok: false, error: "Informe sua senha atual." };
  }

  const rate = await checkRateLimit("reauth");
  if (!rate.ok) {
    return { ok: false, error: rate.message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: senhaAtual,
  });
  if (error) {
    if (/rate limit|too many/i.test(error.message)) {
      return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };
    }
    return { ok: false, error: "Senha atual incorreta." };
  }

  return { ok: true, email: user.email };
}

// =====================================================================
// Trocar e-mail
// =====================================================================

export async function trocarEmail(
  senhaAtual: string,
  novoEmail: string,
): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(novoEmail.trim().toLowerCase());
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "E-mail inválido.",
    };
  }

  const auth = await reautenticar(senhaAtual);
  if (!auth.ok) return auth;

  if (parsed.data === auth.email.toLowerCase()) {
    return { ok: false, error: "O novo e-mail é igual ao atual." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    {
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/configuracoes/conta`,
    },
  );
  if (error) {
    if (/already (registered|exists)/i.test(error.message)) {
      return { ok: false, error: "Este e-mail já está em uso." };
    }
    if (/rate limit|too many/i.test(error.message)) {
      return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };
    }
    return { ok: false, error: "Não foi possível solicitar a troca." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// =====================================================================
// Trocar senha
// =====================================================================

export async function trocarSenha(
  senhaAtual: string,
  novaSenha: string,
): Promise<ActionResult> {
  if (novaSenha.length < PASSWORD_MIN) {
    return {
      ok: false,
      error: `A nova senha deve ter ao menos ${PASSWORD_MIN} caracteres.`,
    };
  }
  if (novaSenha.length > PASSWORD_MAX) {
    return { ok: false, error: "A nova senha é muito longa." };
  }
  if (senhaAtual === novaSenha) {
    return { ok: false, error: "A nova senha deve ser diferente da atual." };
  }

  const auth = await reautenticar(senhaAtual);
  if (!auth.ok) return auth;

  const fraca = checkPasswordStrength(novaSenha, { email: auth.email });
  if (fraca) return { ok: false, error: fraca };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) {
    if (/rate limit|too many/i.test(error.message)) {
      return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };
    }
    return { ok: false, error: "Não foi possível alterar a senha." };
  }

  return { ok: true };
}

// =====================================================================
// Excluir conta — a conta é a MESMA do ecossistema (Gaveta incluído):
// excluir aqui apaga o usuário do Auth e, em cascata, os dados dos dois
// apps. O aviso na UI deixa isso explícito.
// =====================================================================

export type DeleteAccountResult = { ok: false; error: string };

export async function excluirConta(
  senha: string,
): Promise<DeleteAccountResult | void> {
  if (!senha || senha.length === 0) {
    return { ok: false, error: "Informe sua senha para confirmar." };
  }

  const rate = await checkRateLimit("reauth");
  if (!rate.ok) {
    return { ok: false, error: rate.message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }
  const userId = user.id;

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: senha,
  });
  if (signInError) {
    return { ok: false, error: "Senha incorreta." };
  }

  // Logos no Storage (do Fiado e do Gaveta — a conta é uma só).
  const { data: files } = await supabase.storage
    .from(BUCKET_LOGOS)
    .list(userId);
  if (files && files.length > 0) {
    await supabase.storage
      .from(BUCKET_LOGOS)
      .remove(files.map((f) => `${userId}/${f.name}`));
  }

  const admin = createSbClient(publicEnv.supabaseUrl, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return { ok: false, error: "Não foi possível excluir a conta agora." };
  }

  await supabase.auth.signOut();
  redirect("/login");
}
