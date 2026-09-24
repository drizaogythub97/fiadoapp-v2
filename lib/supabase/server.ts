import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    // Travas do cookie de sessão. NÃO são o padrão da biblioteca: medido
    // no Gaveta (PR #56), sem isto o cookie chega ao navegador sem
    // `httpOnly` e sem `secure` — legível por qualquer script da página e
    // trafegável em HTTP.
    //
    // Tem de estar nos DOIS clientes (aqui e no proxy). Se ficar só
    // num, o refresh do outro reescreve o cookie sem as travas.
    //
    // `secure` só em produção porque o desenvolvimento roda em HTTP.
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components nao podem escrever cookies; o middleware
          // garante o refresh da sessao a cada navegacao.
        }
      },
    },
  });
}
