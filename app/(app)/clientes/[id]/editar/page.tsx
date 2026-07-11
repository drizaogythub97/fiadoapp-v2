import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { atualizarCliente } from "../../actions";
import { ClienteForm } from "../../cliente-form";

export const metadata = { title: "Editar cliente" };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("fiado_clientes")
    .select("id, nome, sobrenome, referencia, telefone, limite_credito")
    .eq("id", id)
    .single();

  if (!cliente) notFound();

  const action = atualizarCliente.bind(null, cliente.id as string);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="minimal:max-sm:text-2xl text-3xl font-bold tracking-tight">
          Editar cliente
        </h1>
        <p className="minimal:max-sm:text-base text-muted-foreground mt-1 text-lg">
          Atualize os dados de {cliente.nome as string}.
        </p>
      </header>
      <ClienteForm
        action={action}
        submitLabel="Salvar alterações"
        initialValues={{
          nome: (cliente.nome as string) ?? "",
          sobrenome: (cliente.sobrenome as string | null) ?? "",
          referencia: (cliente.referencia as string | null) ?? "",
          telefone: (cliente.telefone as string | null) ?? "",
          limiteCredito:
            cliente.limite_credito != null
              ? String(cliente.limite_credito)
              : "",
        }}
      />
    </section>
  );
}
