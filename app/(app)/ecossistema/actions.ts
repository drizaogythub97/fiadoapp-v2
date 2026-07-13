"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { removerLogoSeguro } from "@/lib/ecossistema-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const ativoSchema = z.boolean();

/**
 * Liga/desliga o atalho do ecossistema (estágio 1). A preferência vale a
 * CONTA (tabela compartilhada `ecossistema_prefs`), então o atalho aparece
 * ou some nos dois apps ao mesmo tempo.
 */
export async function salvarSwitcher(
  ativo: boolean,
): Promise<{ error?: string }> {
  const parsed = ativoSchema.safeParse(ativo);
  if (!parsed.success) {
    return { error: "Não foi possível salvar. Tente de novo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const { error } = await supabase.from("ecossistema_prefs").upsert({
    user_id: user.id,
    switcher_ativo: parsed.data,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return { error: "Não foi possível salvar. Tente de novo." };
  }

  // O switcher vive no layout — revalida a árvore toda.
  revalidatePath("/", "layout");
  return {};
}

/**
 * Liga/desliga a ponte "Fiado no PDV" (Fase 1). Preferência da CONTA
 * (tabela compartilhada), então vale nos dois apps: ligada aqui, o caixa
 * do Gaveta passa a oferecer a forma de pagamento "Venda a Prazo (Fiado)".
 * Opt-in: nasce desligada. NÃO tem política de retorno destrutiva — desligar
 * só esconde a opção; as vendas a prazo já lançadas são a-receber reais e
 * permanecem (a desativação com escolha Manter/Excluir vem na Fase 4).
 */
export async function salvarFiadoPdv(
  ativo: boolean,
): Promise<{ error?: string }> {
  const parsed = ativoSchema.safeParse(ativo);
  if (!parsed.success) {
    return { error: "Não foi possível salvar. Tente de novo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const { error } = await supabase.from("ecossistema_prefs").upsert({
    user_id: user.id,
    fiado_pdv_ativo: parsed.data,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return { error: "Não foi possível salvar. Tente de novo." };
  }

  revalidatePath("/ecossistema");
  return {};
}

/**
 * Desativa a ponte "Fiado no PDV" (Fase 4) com REAUTENTICAÇÃO por senha (são
 * registros financeiros) e escolha do que fazer com as vendas a prazo já
 * lançadas no caixa:
 * - "manter": só desliga a opção; as vendas (a-receber reais) permanecem.
 * - "excluir": remove TODAS as vendas de origem Gaveta pelos dois lados
 *   (RPC-ponte, estorna estoque) e então desliga.
 * Ativar continua simples (salvarFiadoPdv) — sem senha.
 */
export async function desativarFiadoPdv(
  senha: string,
  modo: "manter" | "excluir",
): Promise<{ ok: boolean; error?: string }> {
  if (modo !== "manter" && modo !== "excluir") {
    return { ok: false, error: "Opção inválida." };
  }
  if (!senha) return { ok: false, error: "Informe sua senha." };

  const rate = await checkRateLimit("reauth");
  if (!rate.ok) return { ok: false, error: rate.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { ok: false, error: "Sessão expirada. Entre de novo." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: senha,
  });
  if (signInError) {
    if (/rate limit|too many/i.test(signInError.message)) {
      return { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." };
    }
    return { ok: false, error: "Senha incorreta." };
  }

  if (modo === "excluir") {
    const { data: vendas } = await supabase
      .from("fiado_vendas")
      .select("id")
      .eq("user_id", user.id)
      .eq("origem", "gaveta");
    for (const v of vendas ?? []) {
      const { error } = await supabase.rpc("excluir_venda_fiado", {
        p_venda_id: v.id,
      });
      if (error) {
        return { ok: false, error: "Não foi possível excluir as vendas. Tente de novo." };
      }
    }
  }

  const { error } = await supabase.from("ecossistema_prefs").upsert({
    user_id: user.id,
    fiado_pdv_ativo: false,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }

  revalidatePath("/ecossistema");
  revalidatePath("/caixa");
  return { ok: true };
}

/**
 * Liga/desliga a MARCA ÚNICA (estágio 2), com política de retorno.
 * - ATIVAR: guarda a marca ATUAL de cada app (backup) e faz a marca DESTE
 *   app (FiadoApp) valer nos dois. Com a ponte ligada, salvar a marca em
 *   qualquer app grava nos dois.
 * - DESATIVAR: cada app VOLTA à marca que tinha antes de ativar; o backup
 *   é limpo e o arquivo usado durante a sessão é removido se ficou órfão.
 */
export async function salvarMarcaUnica(
  ativo: boolean,
): Promise<{ error?: string }> {
  const parsed = ativoSchema.safeParse(ativo);
  if (!parsed.success) {
    return { error: "Não foi possível salvar. Tente de novo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const now = new Date().toISOString();
  const { data: prev } = await supabase
    .from("ecossistema_prefs")
    .select(
      "marca_unica, bak_fiado_brand_name, bak_fiado_brand_logo_path, bak_gaveta_brand_name, bak_gaveta_brand_logo_path",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const jaAtivo = Boolean(prev?.marca_unica);

  if (parsed.data && !jaAtivo) {
    // ── ATIVAR ── guarda as duas marcas; a do FiadoApp passa a valer.
    const [{ data: fiadoMarca }, { data: perfil }] = await Promise.all([
      supabase
        .from("fiado_preferencias")
        .select("brand_name, brand_logo_path")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("brand_name, brand_logo_path")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    const { error } = await supabase.from("ecossistema_prefs").upsert({
      user_id: user.id,
      marca_unica: true,
      bak_fiado_brand_name: fiadoMarca?.brand_name ?? null,
      bak_fiado_brand_logo_path: fiadoMarca?.brand_logo_path ?? null,
      bak_gaveta_brand_name: perfil?.brand_name ?? null,
      bak_gaveta_brand_logo_path: perfil?.brand_logo_path ?? null,
      updated_at: now,
    });
    if (error) return { error: "Não foi possível salvar. Tente de novo." };
    await supabase
      .from("profiles")
      .update({
        brand_name: fiadoMarca?.brand_name ?? null,
        brand_logo_path: fiadoMarca?.brand_logo_path ?? null,
      })
      .eq("id", user.id);
  } else if (!parsed.data && jaAtivo) {
    // ── DESATIVAR ── cada app volta à marca anterior; limpa backup.
    const { data: atual } = await supabase
      .from("fiado_preferencias")
      .select("brand_logo_path")
      .eq("user_id", user.id)
      .maybeSingle();
    const arquivoSessao = (atual?.brand_logo_path as string | null) ?? null;
    await Promise.all([
      supabase.from("fiado_preferencias").upsert({
        user_id: user.id,
        brand_name: prev?.bak_fiado_brand_name ?? null,
        brand_logo_path: prev?.bak_fiado_brand_logo_path ?? null,
        updated_at: now,
      }),
      supabase
        .from("profiles")
        .update({
          brand_name: prev?.bak_gaveta_brand_name ?? null,
          brand_logo_path: prev?.bak_gaveta_brand_logo_path ?? null,
        })
        .eq("id", user.id),
    ]);
    await supabase.from("ecossistema_prefs").upsert({
      user_id: user.id,
      marca_unica: false,
      bak_fiado_brand_name: null,
      bak_fiado_brand_logo_path: null,
      bak_gaveta_brand_name: null,
      bak_gaveta_brand_logo_path: null,
      updated_at: now,
    });
    // O arquivo da sessão só é apagado se não voltou a ser usado por algum
    // app (o guarda protege os logos restaurados).
    await removerLogoSeguro(supabase, user.id, arquivoSessao);
  } else {
    // Sem transição real: só garante a flag.
    await supabase.from("ecossistema_prefs").upsert({
      user_id: user.id,
      marca_unica: parsed.data,
      updated_at: now,
    });
  }

  revalidatePath("/", "layout");
  return {};
}
