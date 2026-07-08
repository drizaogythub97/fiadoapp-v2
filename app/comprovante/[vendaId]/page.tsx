import { notFound, redirect } from "next/navigation";

import { ComprovanteVenda } from "@/components/receipt/fiado-receipt";
import { PrintToolbar } from "@/components/receipt/print-toolbar";
import styles from "@/components/receipt/print-page.module.css";
import {
  textoComprovanteVenda,
  tituloComprovanteVenda,
  type ComprovanteVendaData,
} from "@/lib/comprovante";
import { createClient } from "@/lib/supabase/server";
import type {
  ClienteResumo,
  ItemVenda,
  Pagamento,
  Venda,
} from "@/lib/types/fiado";
import { linkWhatsAppTexto } from "@/lib/whatsapp";

export const metadata = {
  title: "Comprovante",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ComprovanteVendaPage({
  params,
}: {
  params: Promise<{ vendaId: string }>;
}) {
  const { vendaId } = await params;
  if (!UUID_RE.test(vendaId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS garante que só a venda do próprio usuário é retornada.
  const [{ data: vendaData }, { data: itensData }, { data: pagamentosData }] =
    await Promise.all([
      supabase
        .from("fiado_vendas")
        .select(
          "id, data_compra, data_vencimento, valor_total, valor_pago, status, observacao, quitado_em, fiado_clientes(id, nome, sobrenome, referencia, telefone)",
        )
        .eq("id", vendaId)
        .maybeSingle(),
      supabase
        .from("fiado_itens_venda")
        .select("id, descricao, quantidade, valor_unitario, valor_total")
        .eq("venda_id", vendaId),
      supabase
        .from("fiado_pagamentos")
        .select("id, venda_id, valor_pago, pago_em")
        .eq("venda_id", vendaId)
        .order("pago_em", { ascending: true }),
    ]);

  if (!vendaData) notFound();
  const venda = vendaData as unknown as Venda & {
    fiado_clientes: ClienteResumo | null;
  };
  const cliente = venda.fiado_clientes;
  if (!cliente) notFound();

  const data: ComprovanteVendaData = {
    vendaId: venda.id,
    cliente,
    dataCompra: venda.data_compra,
    dataVencimento: venda.data_vencimento,
    status: venda.status,
    quitadoEm: venda.quitado_em,
    observacao: venda.observacao,
    itens: ((itensData ?? []) as ItemVenda[]).map((i) => ({
      descricao: i.descricao,
      quantidade: i.quantidade,
      valorUnitario: i.valor_unitario,
      valorTotal: i.valor_total,
    })),
    pagamentos: ((pagamentosData ?? []) as Pagamento[]).map((p) => ({
      pagoEm: p.pago_em,
      valor: p.valor_pago,
    })),
    valorTotal: venda.valor_total,
    valorPago: venda.valor_pago,
  };

  const shareText = textoComprovanteVenda(data);

  return (
    <div className={styles.screen}>
      <PrintToolbar
        shareTitle={`${tituloComprovanteVenda(data.status)} — FiadoApp`}
        shareText={shareText}
        whatsappUrl={linkWhatsAppTexto(cliente.telefone, shareText)}
      />
      <div className={styles.paper}>
        <ComprovanteVenda data={data} />
      </div>
    </div>
  );
}
