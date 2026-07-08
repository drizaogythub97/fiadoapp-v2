import { notFound, redirect } from "next/navigation";

import { ComprovanteQuitacao } from "@/components/receipt/fiado-receipt";
import { PrintToolbar } from "@/components/receipt/print-toolbar";
import styles from "@/components/receipt/print-page.module.css";
import {
  textoComprovanteQuitacao,
  type ComprovanteQuitacaoData,
} from "@/lib/comprovante";
import { createClient } from "@/lib/supabase/server";
import type { ClienteResumo } from "@/lib/types/fiado";
import { linkWhatsAppTexto } from "@/lib/whatsapp";

export const metadata = {
  title: "Comprovante de quitação",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PagamentoComVenda = {
  valor_pago: number;
  pago_em: string;
  fiado_vendas: {
    cliente_id: string;
    data_compra: string;
    valor_total: number;
    valor_pago: number;
    status: string;
  } | null;
};

export default async function ComprovanteQuitacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ em?: string }>;
}) {
  const { clienteId } = await params;
  const { em } = await searchParams;
  if (!UUID_RE.test(clienteId) || !em || Number.isNaN(Date.parse(em))) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // O ato de quitação é identificado pelo timestamp: a RPC usa um único
  // now() para todos os pagamentos da cascata/seleção.
  const [{ data: clienteData }, { data: pagamentosData }, { data: abertas }] =
    await Promise.all([
      supabase
        .from("fiado_clientes")
        .select("id, nome, sobrenome, referencia, telefone")
        .eq("id", clienteId)
        .maybeSingle(),
      supabase
        .from("fiado_pagamentos")
        .select(
          "valor_pago, pago_em, fiado_vendas(cliente_id, data_compra, valor_total, valor_pago, status)",
        )
        .eq("pago_em", em),
      supabase
        .from("fiado_vendas")
        .select("valor_total, valor_pago")
        .eq("cliente_id", clienteId)
        .neq("status", "PAGA"),
    ]);

  if (!clienteData) notFound();
  const cliente = clienteData as ClienteResumo;

  const pagamentos = ((pagamentosData ?? []) as unknown as PagamentoComVenda[])
    .filter((p) => p.fiado_vendas?.cliente_id === clienteId)
    .sort((a, b) =>
      (a.fiado_vendas?.data_compra ?? "").localeCompare(
        b.fiado_vendas?.data_compra ?? "",
      ),
    );
  if (pagamentos.length === 0) notFound();

  const saldoRestante =
    Math.round(
      ((abertas ?? []) as { valor_total: number; valor_pago: number }[]).reduce(
        (s, v) => s + (v.valor_total - v.valor_pago),
        0,
      ) * 100,
    ) / 100;

  const data: ComprovanteQuitacaoData = {
    cliente,
    pagoEm: pagamentos[0].pago_em,
    vendas: pagamentos.map((p) => ({
      dataCompra: p.fiado_vendas?.data_compra ?? "",
      valorTotal: p.fiado_vendas?.valor_total ?? 0,
      valorPago: p.valor_pago,
      quitada: p.fiado_vendas?.status === "PAGA",
    })),
    totalPago:
      Math.round(pagamentos.reduce((s, p) => s + p.valor_pago, 0) * 100) / 100,
    saldoRestante,
  };

  const shareText = textoComprovanteQuitacao(data);

  return (
    <div className={styles.screen}>
      <PrintToolbar
        shareTitle="Comprovante de quitação — FiadoApp"
        shareText={shareText}
        whatsappUrl={linkWhatsAppTexto(cliente.telefone, shareText)}
      />
      <div className={styles.paper}>
        <ComprovanteQuitacao data={data} />
      </div>
    </div>
  );
}
