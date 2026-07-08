import { notFound, redirect } from "next/navigation";

import { EspelhoCliente } from "@/components/receipt/fiado-receipt";
import { PrintToolbar } from "@/components/receipt/print-toolbar";
import styles from "@/components/receipt/print-page.module.css";
import {
  TITULO_ESPELHO_CLIENTE,
  textoEspelhoCliente,
  type EspelhoClienteData,
} from "@/lib/comprovante";
import { createClient } from "@/lib/supabase/server";
import type { ClienteResumo, ItemVenda, Venda } from "@/lib/types/fiado";
import { linkWhatsAppTexto } from "@/lib/whatsapp";

export const metadata = {
  title: "Espelho do cliente",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type VendaComItens = Venda & { fiado_itens_venda: ItemVenda[] };

export default async function EspelhoClientePage({
  params,
}: {
  params: Promise<{ clienteId: string }>;
}) {
  const { clienteId } = await params;
  if (!UUID_RE.test(clienteId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS garante que só clientes/vendas do próprio usuário são retornados.
  const [{ data: clienteData }, { data: vendasData }] = await Promise.all([
    supabase
      .from("fiado_clientes")
      .select("id, nome, sobrenome, referencia, telefone")
      .eq("id", clienteId)
      .maybeSingle(),
    supabase
      .from("fiado_vendas")
      .select(
        "id, data_compra, data_vencimento, valor_total, valor_pago, status, observacao, fiado_itens_venda(id, descricao, quantidade, valor_unitario, valor_total)",
      )
      .eq("cliente_id", clienteId)
      .neq("status", "PAGA")
      // mesma ordem da cascata da RPC: mais antigas primeiro
      .order("data_compra", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!clienteData) notFound();
  const cliente = clienteData as ClienteResumo;
  const vendas = (vendasData ?? []) as unknown as VendaComItens[];

  const totalEmAberto =
    Math.round(
      vendas.reduce((soma, v) => soma + (v.valor_total - v.valor_pago), 0) *
        100,
    ) / 100;

  const data: EspelhoClienteData = {
    cliente,
    geradoEm: new Date().toISOString(),
    vendas: vendas.map((v) => ({
      dataCompra: v.data_compra,
      dataVencimento: v.data_vencimento,
      status: v.status,
      observacao: v.observacao,
      itens: (v.fiado_itens_venda ?? []).map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitario: i.valor_unitario,
        valorTotal: i.valor_total,
      })),
      valorTotal: v.valor_total,
      valorPago: v.valor_pago,
    })),
    totalEmAberto,
  };

  const shareText = textoEspelhoCliente(data);

  return (
    <div className={styles.screen}>
      <PrintToolbar
        shareTitle={`${TITULO_ESPELHO_CLIENTE} — FiadoApp`}
        shareText={shareText}
        whatsappUrl={linkWhatsAppTexto(cliente.telefone, shareText)}
      />
      <div className={styles.paper}>
        <EspelhoCliente data={data} />
      </div>
    </div>
  );
}
