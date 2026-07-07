import { criarCliente } from "../actions";
import { ClienteForm } from "../cliente-form";

export const metadata = { title: "Novo cliente" };

export default function NovoClientePage() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Novo cliente</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Só o nome é obrigatório — o resto pode preencher depois.
        </p>
      </header>
      <ClienteForm action={criarCliente} submitLabel="Cadastrar cliente" />
    </section>
  );
}
