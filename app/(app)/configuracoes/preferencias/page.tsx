import { BUCKET_LOGOS } from "@/lib/marca";
import { createClient } from "@/lib/supabase/server";
import { getThemeFromCookie } from "@/lib/theme/cookie";
import type { ClienteComSaldo } from "@/lib/types/fiado";

import { PreferenciasClient } from "./preferencias-client";

export const metadata = { title: "Preferências" };

export default async function PreferenciasPage() {
  const supabase = await createClient();

  const [tema, { data: prefs }, { data: clientesData, error }] =
    await Promise.all([
      getThemeFromCookie(),
      supabase
        .from("fiado_preferencias")
        .select("limite_credito_padrao, brand_name, brand_logo_path")
        .maybeSingle(),
      supabase.rpc("fiado_clientes_com_saldo"),
    ]);

  const limitePadrao = (prefs?.limite_credito_padrao as number | null) ?? null;
  const marcaNome = ((prefs?.brand_name as string | null) ?? "").trim();
  const logoPath = (prefs?.brand_logo_path as string | null) ?? null;
  const logoUrl = logoPath
    ? supabase.storage.from(BUCKET_LOGOS).getPublicUrl(logoPath).data.publicUrl
    : null;
  const clientes = (clientesData ?? []) as ClienteComSaldo[];

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Preferências</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Ajuste o tema, a marca da sua loja e os limites de crédito.
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-base">
          Não foi possível carregar as preferências. Tente recarregar a página.
        </p>
      ) : (
        <PreferenciasClient
          temaInicial={tema}
          limitePadraoInicial={limitePadrao}
          clientes={clientes}
          marcaNome={marcaNome}
          logoUrl={logoUrl}
        />
      )}
    </section>
  );
}
