import { createClient } from "@/lib/supabase/server";

import { ContaClient } from "./conta-client";

export const metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nome = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const email = user?.email ?? "";
  const criadaEm = user?.created_at ?? null;

  return (
    <section className="minimal:max-sm:gap-4 flex flex-col gap-6">
      <header>
        <h1 className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
          Minha conta
        </h1>
        <p className="minimal:max-sm:text-sm text-muted-foreground mt-1 text-lg">
          Seus dados pessoais. Você pode alterar nome, e-mail e senha ou, se
          quiser, excluir definitivamente a conta.
        </p>
      </header>
      <ContaClient nomeInicial={nome} email={email} criadaEm={criadaEm} />
    </section>
  );
}
