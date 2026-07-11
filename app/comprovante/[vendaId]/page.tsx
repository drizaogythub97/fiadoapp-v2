import { notFound, redirect } from "next/navigation";

import { ComprovanteShell } from "@/components/receipt/comprovante-shell";
import { ComprovanteVenda } from "@/components/receipt/fiado-receipt";
import {
  textoComprovanteVenda,
  tituloComprovanteVenda,
} from "@/lib/comprovante";
import { carregarComprovanteVenda } from "@/lib/comprovante-data";
import { createClient } from "@/lib/supabase/server";
import { linkWhatsAppTexto } from "@/lib/whatsapp";

export const metadata = {
  title: "Comprovante",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ComprovanteVendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ vendaId: string }>;
  searchParams: Promise<{ formato?: string }>;
}) {
  const { vendaId } = await params;
  const { formato } = await searchParams;
  if (!UUID_RE.test(vendaId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS garante que só a venda do próprio usuário é retornada.
  const res = await carregarComprovanteVenda(supabase, user.id, vendaId);
  if (!res) notFound();
  const { data, marca } = res;

  const shareText = textoComprovanteVenda(data);

  return (
    <ComprovanteShell
      shareTitle={`${tituloComprovanteVenda(data.status)} — FiadoApp`}
      whatsappUrl={linkWhatsAppTexto(data.cliente.telefone, shareText)}
      nomeArquivo="comprovante-venda.png"
      formato={formato === "imagem" ? "imagem" : "pdf"}
    >
      <ComprovanteVenda data={data} marca={marca} />
    </ComprovanteShell>
  );
}
