import { createClient } from "@/lib/supabase/server";
import type { VendaAnalytics } from "@/lib/analytics";
import type { VendaStatus } from "@/lib/types/fiado";

import { AnalyticsClient } from "./analytics-client";

export const metadata = { title: "Analytics" };

type Linha = {
  id: string;
  cliente_id: string;
  data_compra: string;
  valor_total: number;
  valor_pago: number;
  status: VendaStatus;
  fiado_clientes: {
    nome: string;
    sobrenome: string | null;
    referencia: string | null;
  } | null;
};

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Todas as vendas (sem itens): o filtro de período e as agregações rodam
  // no cliente sobre o conjunto completo, como em /relatorios (uso real
  // ~250 vendas; 1000 dá folga).
  const { data, error } = await supabase
    .from("fiado_vendas")
    .select(
      "id, cliente_id, data_compra, valor_total, valor_pago, status, fiado_clientes(nome, sobrenome, referencia)",
    )
    .order("data_compra", { ascending: true })
    .limit(1000);

  const vendas: VendaAnalytics[] = ((data ?? []) as unknown as Linha[]).map(
    (v) => ({
      id: v.id,
      clienteId: v.cliente_id,
      nome: v.fiado_clientes?.nome ?? "Cliente removido",
      sobrenome: v.fiado_clientes?.sobrenome ?? null,
      referencia: v.fiado_clientes?.referencia ?? null,
      dataCompra: v.data_compra,
      status: v.status,
      valorTotal: v.valor_total,
      valorPago: v.valor_pago,
    }),
  );

  return (
    <section className="minimal:max-sm:gap-4 flex flex-col gap-6">
      <header>
        <h1 className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
          Analytics
        </h1>
        <p className="minimal:max-sm:text-sm text-muted-foreground mt-1 text-lg">
          Acompanhe o desempenho das suas vendas no período.
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-base">
          Não foi possível carregar as vendas. Tente recarregar a página.
        </p>
      ) : (
        <AnalyticsClient vendas={vendas} />
      )}
    </section>
  );
}
