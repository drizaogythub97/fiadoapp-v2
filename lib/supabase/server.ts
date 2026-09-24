import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { publicEnv } from "@/lib/env";

/**
 * Cliente do Supabase do lado do servidor — UM por requisição.
 *
 * O `cache` do React guarda o resultado pela duração da requisição: layout,
 * página e o que mais rodar no mesmo render recebem a mesma instância, em vez
 * de cada um montar a sua lendo os cookies de novo. Fora de um render (Server
 * Action, Route Handler) o `cache` não guarda nada e a função se comporta
 * como antes.
 */
export const createClient = cache(async () => {
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
});

/**
 * O usuário da sessão, validado no servidor do Auth — UMA vez por requisição.
 *
 * `getUser()` é uma chamada de REDE ao Auth do Supabase. Antes, o proxy, o
 * layout e a página faziam cada um a sua: desenhar o painel validava a mesma
 * sessão três vezes. Com o `cache`, a primeira viaja e as demais reaproveitam
 * a resposta dentro da mesma requisição.
 *
 * Continua sendo `getUser()` — nunca `getSession()`. A validação é a mesma,
 * só não se repete. E é aqui que a sessão REVOGADA é pega (Sair em outro
 * aparelho, conta apagada), porque este caminho tem estado, ao contrário do
 * `getClaims()` do proxy.
 */
export const obterUsuario = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
