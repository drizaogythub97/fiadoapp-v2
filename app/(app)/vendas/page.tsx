import { Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/format";
import type { VendaComCliente } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";

import { VendasClient } from "./vendas-client";

export const metadata = { title: "Vendas" };

export default async function VendasPage() {
  const supabase = await createClient();
  // Mais recentes primeiro; 500 cobre com folga o uso real (~250 vendas).
  // Consulta completa com filtros por período entra nos Relatórios (F4d).
  const { data, error } = await supabase
    .from("fiado_vendas")
    .select(
      "id, cliente_id, data_compra, data_vencimento, valor_total, valor_pago, status, observacao, quitado_em, created_at, fiado_clientes(id, nome, sobrenome, referencia, telefone)",
    )
    .order("data_compra", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  const vendas = (data ?? []) as unknown as VendaComCliente[];

  return (
    <section className="minimal:max-sm:gap-4 flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
            Vendas
          </h1>
          <p className="minimal:max-sm:text-sm text-muted-foreground mt-1 text-lg">
            Acompanhe as vendas fiado e registre novas.
          </p>
        </div>
        <Link
          href="/vendas/nova"
          className={cn(
            buttonVariants(),
            "minimal:max-sm:h-11 minimal:max-sm:text-base h-13 px-6 text-lg font-medium sm:self-start",
          )}
        >
          <Plus aria-hidden="true" className="size-5" />
          Nova venda
        </Link>
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-base">
          Não foi possível carregar as vendas. Tente recarregar a página.
        </p>
      ) : (
        <VendasClient vendas={vendas} hoje={hojeISO()} />
      )}
    </section>
  );
}
