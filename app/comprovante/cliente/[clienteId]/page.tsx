import { notFound, redirect } from "next/navigation";

import { ComprovanteShell } from "@/components/receipt/comprovante-shell";
import { EspelhoCliente } from "@/components/receipt/fiado-receipt";
import { TITULO_ESPELHO_CLIENTE, textoEspelhoCliente } from "@/lib/comprovante";
import { carregarEspelhoCliente } from "@/lib/comprovante-data";
import { createClient } from "@/lib/supabase/server";
import { linkWhatsAppTexto } from "@/lib/whatsapp";

export const metadata = {
  title: "Espelho do cliente",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EspelhoClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ formato?: string }>;
}) {
  const { clienteId } = await params;
  const { formato } = await searchParams;
  if (!UUID_RE.test(clienteId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS garante que só clientes/vendas do próprio usuário são retornados.
  const res = await carregarEspelhoCliente(supabase, user.id, clienteId);
  if (!res) notFound();
  const { data, marca } = res;

  const shareText = textoEspelhoCliente(data);

  return (
    <ComprovanteShell
      shareTitle={`${TITULO_ESPELHO_CLIENTE} — FiadoApp`}
      whatsappUrl={linkWhatsAppTexto(data.cliente.telefone, shareText)}
      nomeArquivo="espelho-vendas.png"
      formato={formato === "imagem" ? "imagem" : "pdf"}
    >
      <EspelhoCliente data={data} marca={marca} />
    </ComprovanteShell>
  );
}
