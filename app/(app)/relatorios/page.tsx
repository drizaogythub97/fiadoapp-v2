import { createClient } from "@/lib/supabase/server";
import type { VendaRelatorio } from "@/lib/relatorio";
import type { ItemVenda, VendaStatus } from "@/lib/types/fiado";

import { RelatoriosClient } from "./relatorios-client";

export const metadata = { title: "Relatórios" };

type Linha = {
  id: string;
  data_compra: string;
  data_vencimento: string | null;
  valor_total: number;
  valor_pago: number;
  status: VendaStatus;
  fiado_clientes: {
    nome: string;
    sobrenome: string | null;
    referencia: string | null;
  } | null;
  fiado_itens_venda: ItemVenda[];
};

export default async function RelatoriosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const emitidoPor =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "";

  // Todas as vendas com itens: os filtros/exports rodam no cliente sobre o
  // conjunto completo (uso real ~250 vendas; 1000 dá folga).
  const { data, error } = await supabase
    .from("fiado_vendas")
    .select(
      "id, data_compra, data_vencimento, valor_total, valor_pago, status, fiado_clientes(nome, sobrenome, referencia), fiado_itens_venda(id, descricao, quantidade, valor_unitario, valor_total)",
    )
    .order("data_compra", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);

  const vendas: VendaRelatorio[] = ((data ?? []) as unknown as Linha[]).map(
    (v) => ({
      id: v.id,
      nome: v.fiado_clientes?.nome ?? "Cliente removido",
      sobrenome: v.fiado_clientes?.sobrenome ?? null,
      referencia: v.fiado_clientes?.referencia ?? null,
      dataCompra: v.data_compra,
      dataVencimento: v.data_vencimento,
      status: v.status,
      valorTotal: v.valor_total,
      valorPago: v.valor_pago,
      itens: (v.fiado_itens_venda ?? []).map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitario: i.valor_unitario,
        valorTotal: i.valor_total,
      })),
    }),
  );

  return (
    <section className="flex flex-col gap-6">
      <header className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Filtre, imprima e exporte suas vendas.
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-base">
          Não foi possível carregar as vendas. Tente recarregar a página.
        </p>
      ) : (
        <RelatoriosClient vendas={vendas} emitidoPor={emitidoPor} />
      )}
    </section>
  );
}
