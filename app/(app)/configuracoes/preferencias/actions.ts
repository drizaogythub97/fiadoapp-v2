"use server";

import { revalidatePath } from "next/cache";

import { BUCKET_LOGOS } from "@/lib/marca";
import { marcaUnicaAtiva } from "@/lib/ecossistema-server";
import { createClient } from "@/lib/supabase/server";
import {
  limiteClienteSchema,
  limitePadraoSchema,
} from "@/lib/validations/preferencias";

// A troca de limite mexe em badge/alerta espalhados pelo app.
const ROTAS_AFETADAS = [
  "/configuracoes/preferencias",
  "/clientes",
  "/dashboard",
  "/vendas",
];

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

// =====================================================================
// Marca da loja — recurso NATIVO do Fiado (decisão do dono 2026-07-09;
// a marca compartilhada com o Gaveta virá como integração opt-in na F6).
// Padrões de upload portados do Gaveta: magic bytes + limite de tamanho.
// =====================================================================

const MAX_LOGO_BYTES = 1_500_000; // ~1,5 MB depois do recorte/reencode

type TipoImagem = "webp" | "png" | "jpeg";

function detectarTipoImagem(bytes: Uint8Array): TipoImagem | null {
  if (bytes.length < 12) return null;
  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  // WebP: RIFF .... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export async function salvarNomeMarca(
  nome: string,
): Promise<{ error?: string }> {
  const limpo = nome.trim();
  if (limpo.length > 60) {
    return { error: "Use até 60 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("fiado_preferencias").upsert({
    user_id: user.id,
    brand_name: limpo.length === 0 ? null : limpo,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  // Marca única ligada (ecossistema): o nome também vale no Gaveta.
  if (await marcaUnicaAtiva(supabase, user.id)) {
    await supabase
      .from("profiles")
      .update({ brand_name: limpo.length === 0 ? null : limpo })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
  return {};
}

export type LogoUploadResult = { ok: boolean; error?: string };

export async function uploadLogoMarca(
  formData: FormData,
): Promise<LogoUploadResult> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Arquivo não enviado." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Imagem maior que 1,5 MB." };
  }
  if (!["image/webp", "image/png", "image/jpeg"].includes(file.type)) {
    return { ok: false, error: "Use uma imagem PNG, JPEG ou WebP." };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const tipo = detectarTipoImagem(buffer);
  if (!tipo) {
    return {
      ok: false,
      error: "Arquivo não é uma imagem válida (PNG / JPEG / WebP).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const ext = tipo === "jpeg" ? "jpg" : tipo;
  // Prefixo fiado- separa dos arquivos do Gaveta na mesma pasta do usuário.
  const key = `${user.id}/fiado-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_LOGOS)
    .upload(key, buffer, {
      contentType: `image/${tipo}`,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: "Não foi possível enviar a imagem." };
  }

  const { data: atual } = await supabase
    .from("fiado_preferencias")
    .select("brand_logo_path")
    .eq("user_id", user.id)
    .maybeSingle();
  const anterior = (atual?.brand_logo_path as string | null) ?? null;

  const { error: updError } = await supabase.from("fiado_preferencias").upsert({
    user_id: user.id,
    brand_logo_path: key,
    updated_at: new Date().toISOString(),
  });
  if (updError) {
    await supabase.storage.from(BUCKET_LOGOS).remove([key]);
    return { ok: false, error: "Não foi possível salvar a logo." };
  }

  // Marca única ligada: o MESMO arquivo passa a valer no Gaveta (bucket
  // compartilhado). O arquivo antigo de lá é removido para não órfã-lo.
  if (await marcaUnicaAtiva(supabase, user.id)) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("brand_logo_path")
      .eq("id", user.id)
      .maybeSingle();
    const anteriorGaveta = (perfil?.brand_logo_path as string | null) ?? null;
    await supabase
      .from("profiles")
      .update({ brand_logo_path: key })
      .eq("id", user.id);
    if (anteriorGaveta && anteriorGaveta !== key && anteriorGaveta !== anterior) {
      await supabase.storage.from(BUCKET_LOGOS).remove([anteriorGaveta]);
    }
  }

  if (anterior && anterior !== key) {
    await supabase.storage.from(BUCKET_LOGOS).remove([anterior]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removerLogoMarca(): Promise<LogoUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { data: atual } = await supabase
    .from("fiado_preferencias")
    .select("brand_logo_path")
    .eq("user_id", user.id)
    .maybeSingle();
  const path = (atual?.brand_logo_path as string | null) ?? null;
  if (!path) return { ok: true };

  await supabase.storage.from(BUCKET_LOGOS).remove([path]);
  await supabase
    .from("fiado_preferencias")
    .update({ brand_logo_path: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  // Marca única ligada: remover também vale nos dois apps.
  if (await marcaUnicaAtiva(supabase, user.id)) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("brand_logo_path")
      .eq("id", user.id)
      .maybeSingle();
    const doGaveta = (perfil?.brand_logo_path as string | null) ?? null;
    if (doGaveta && doGaveta !== path) {
      await supabase.storage.from(BUCKET_LOGOS).remove([doGaveta]);
    }
    await supabase
      .from("profiles")
      .update({ brand_logo_path: null })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
