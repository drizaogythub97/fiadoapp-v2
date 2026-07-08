import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Marca exibida nos comprovantes: nome/logo da loja configurados no GAVETA
 * (tabela `profiles` do mesmo Supabase — SOMENTE leitura, decisão da F4d).
 * Sem personalização, cai no padrão FiadoApp.
 */

export type MarcaComprovante = {
  nome: string;
  logoUrl: string;
};

export const MARCA_PADRAO: MarcaComprovante = {
  nome: "FiadoApp",
  logoUrl: "/logo.png",
};

export async function marcaDoUsuario(
  supabase: SupabaseClient,
  userId: string,
): Promise<MarcaComprovante> {
  const { data } = await supabase
    .from("profiles")
    .select("brand_name, brand_logo_path")
    .eq("id", userId)
    .maybeSingle();

  const nomeCustom = ((data?.brand_name as string | null) ?? "").trim();
  const logoPath = (data?.brand_logo_path as string | null) ?? null;
  return {
    nome: nomeCustom || MARCA_PADRAO.nome,
    logoUrl: logoPath
      ? supabase.storage.from("brand-logos").getPublicUrl(logoPath).data
          .publicUrl
      : MARCA_PADRAO.logoUrl,
  };
}
