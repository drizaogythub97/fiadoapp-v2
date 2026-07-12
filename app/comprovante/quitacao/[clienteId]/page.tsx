import { notFound, redirect } from "next/navigation";

import { ComprovanteShell } from "@/components/receipt/comprovante-shell";
import { ComprovanteQuitacao } from "@/components/receipt/fiado-receipt";
import { textoComprovanteQuitacao } from "@/lib/comprovante";
import { carregarComprovanteQuitacao } from "@/lib/comprovante-data";
import { createClient } from "@/lib/supabase/server";
import { linkWhatsAppTexto } from "@/lib/whatsapp";

export const metadata = {
  title: "Comprovante de quitação",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ComprovanteQuitacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ em?: string; formato?: string }>;
}) {
  const { clienteId } = await params;
  const { em, formato } = await searchParams;
  if (!UUID_RE.test(clienteId) || !em || Number.isNaN(Date.parse(em))) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await carregarComprovanteQuitacao(
    supabase,
    user.id,
    clienteId,
    em,
  );
  if (!res) notFound();
  const { data, marca } = res;

  const shareText = textoComprovanteQuitacao(data);

  return (
    <ComprovanteShell
      shareTitle="Comprovante de quitação — FiadoApp"
      whatsappUrl={linkWhatsAppTexto(data.cliente.telefone, shareText)}
      nomeArquivo="comprovante-quitacao.png"
      formato={formato === "imagem" ? "imagem" : "pdf"}
    >
      <ComprovanteQuitacao data={data} marca={marca} />
    </ComprovanteShell>
  );
}
