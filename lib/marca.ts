import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Marca da loja exibida no header e nos comprovantes — recurso NATIVO do
 * FiadoApp (fiado_preferencias.brand_*), decisão do dono em 2026-07-09:
 * os apps do ecossistema são autônomos. A "marca compartilhada" com o
 * Gaveta virá como integração opt-in em fase futura (F6).
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

/** Bucket compartilhado de infra; os arquivos do Fiado usam fiado-*. */
export const BUCKET_LOGOS = "brand-logos";

export async function marcaDoUsuario(
  supabase: SupabaseClient,
  userId: string,
): Promise<MarcaComprovante> {
  const { data } = await supabase
    .from("fiado_preferencias")
    .select("brand_name, brand_logo_path")
    .eq("user_id", userId)
    .maybeSingle();

  const nomeCustom = ((data?.brand_name as string | null) ?? "").trim();
  const logoPath = (data?.brand_logo_path as string | null) ?? null;
  return {
    nome: nomeCustom || MARCA_PADRAO.nome,
    logoUrl: logoPath
      ? supabase.storage.from(BUCKET_LOGOS).getPublicUrl(logoPath).data
          .publicUrl
      : MARCA_PADRAO.logoUrl,
  };
}
