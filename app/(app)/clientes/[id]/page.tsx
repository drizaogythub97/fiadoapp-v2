import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/format";
import type { ClienteResumo, Venda } from "@/lib/types/fiado";

import { ClienteDetalheClient } from "./cliente-detalhe-client";

export const metadata = { title: "Detalhe do cliente" };

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: clienteData }, { data: prefsData }, { data: vendasData }] =
    await Promise.all([
      supabase
        .from("fiado_clientes")
        .select("id, nome, sobrenome, referencia, telefone, limite_credito")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("fiado_preferencias")
        .select("limite_credito_padrao")
        .maybeSingle(),
      supabase
        .from("fiado_vendas")
        .select(
          "id, cliente_id, data_compra, data_vencimento, valor_total, valor_pago, status, observacao, quitado_em, origem, created_at",
        )
        .eq("cliente_id", id)
        // mesma ordem da cascata da RPC: mais antigas primeiro
        .order("data_compra", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (!clienteData) notFound();

  const linha = clienteData as ClienteResumo & {
    limite_credito: number | null;
  };
  // limite_efetivo = individual ou o padrão das preferências (F4d-3).
  const cliente = {
    ...linha,
    limite_efetivo:
      linha.limite_credito ??
      ((prefsData?.limite_credito_padrao as number | null) ?? null),
  };
  const vendas = (vendasData ?? []) as Venda[];
  const abertas = vendas.filter((v) => v.status !== "PAGA");
  const totalPagas = vendas.length - abertas.length;

  return (
    <ClienteDetalheClient
      cliente={cliente}
      vendasAbertas={abertas}
      totalPagas={totalPagas}
      hoje={hojeISO()}
    />
  );
}
