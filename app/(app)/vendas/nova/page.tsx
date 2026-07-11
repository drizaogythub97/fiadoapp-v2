import { createClient } from "@/lib/supabase/server";
import type { ClienteComSaldo } from "@/lib/types/fiado";

import { VendaForm } from "./venda-form";

export const metadata = { title: "Nova venda" };

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  const supabase = await createClient();

  const [{ data: clientesData }, { data: itensData }] = await Promise.all([
    supabase.rpc("fiado_clientes_com_saldo"),
    // Sugestões de descrição (paridade v1): dedupe aqui porque o PostgREST
    // não tem distinct — o cap de 1000 linhas só limitaria as sugestões.
    supabase
      .from("fiado_itens_venda")
      .select("descricao")
      .order("descricao")
      .limit(1000),
  ]);

  const clientes = (clientesData ?? []) as ClienteComSaldo[];
  const sugestoes = Array.from(
    new Set(
      ((itensData ?? []) as { descricao: string }[]).map((i) =>
        i.descricao.trim(),
      ),
    ),
  );

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="minimal:max-sm:text-2xl text-3xl font-bold tracking-tight">
          Nova venda
        </h1>
        <p className="minimal:max-sm:text-base text-muted-foreground mt-1 text-lg">
          Registre uma venda fiado para um cliente.
        </p>
      </header>

      <VendaForm
        clientes={clientes}
        sugestoesDescricao={sugestoes}
        clienteInicialId={cliente}
      />
    </section>
  );
}
