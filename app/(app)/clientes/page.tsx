import { Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { ClienteComSaldo } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";

import { ClientesClient } from "./clientes-client";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fiado_clientes_com_saldo");
  const clientes = (data ?? []) as ClienteComSaldo[];

  return (
    <section className="minimal:max-sm:gap-4 flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
            Clientes
          </h1>
          <p className="minimal:max-sm:text-sm text-muted-foreground mt-1 text-lg">
            Busque, cadastre e acompanhe quem compra fiado.
          </p>
        </div>
        <Link
          href="/clientes/novo"
          className={cn(
            buttonVariants(),
            "h-13 px-6 text-lg font-medium sm:self-start",
          )}
        >
          <Plus aria-hidden="true" className="size-5" />
          Novo cliente
        </Link>
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-base">
          Não foi possível carregar os clientes. Tente recarregar a página.
        </p>
      ) : (
        <ClientesClient clientes={clientes} buscaInicial={q ?? ""} />
      )}
    </section>
  );
}
