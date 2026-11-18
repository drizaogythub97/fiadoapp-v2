import { sugestoesSemRepeticao } from "@/lib/busca";
import { createClient } from "@/lib/supabase/server";
import type { ClienteComSaldo } from "@/lib/types/fiado";

import { VendaForm } from "./venda-form";

export const metadata = { title: "Nova venda" };

/** Teto do PostgREST por resposta, no padrão do Supabase. */
const POR_PAGINA = 1000;
/** Teto de segurança: 20 mil itens vendidos já é outra escala de loja. */
const MAX_ITENS = 20_000;

/**
 * Todas as descrições já vendidas, em páginas (o PostgREST não tem
 * `distinct`, então a repetição sai depois, em `sugestoesSemRepeticao`).
 *
 * Antes vinham só as 1000 PRIMEIRAS em ordem alfabética. Passando disso — e
 * cada venda a prazo feita no caixa do Gaveta soma itens aqui —, o que
 * começasse pelo fim do alfabeto sumia das sugestões sem aviso.
 */
async function descricoesVendidas(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string[]> {
  const descricoes: string[] = [];
  for (let de = 0; de < MAX_ITENS; de += POR_PAGINA) {
    const { data } = await supabase
      .from("fiado_itens_venda")
      .select("descricao")
      .order("id")
      .range(de, de + POR_PAGINA - 1);
    const pagina = (data ?? []) as { descricao: string }[];
    descricoes.push(...pagina.map((i) => i.descricao));
    // Página incompleta = acabou.
    if (pagina.length < POR_PAGINA) break;
  }
  return descricoes;
}

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  const supabase = await createClient();

  const [{ data: clientesData }, descricoes] = await Promise.all([
    supabase.rpc("fiado_clientes_com_saldo"),
    // Sugestões de descrição (paridade v1), já sem a mesma coisa escrita de
    // dois jeitos — o que vem do Gaveta chega em MAIÚSCULAS.
    descricoesVendidas(supabase),
  ]);

  const clientes = (clientesData ?? []) as ClienteComSaldo[];
  const sugestoes = sugestoesSemRepeticao(descricoes);

  return (
    <section className="minimal:max-sm:gap-4 flex flex-col gap-6">
      <header>
        <h1 className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
          Nova venda
        </h1>
        <p className="minimal:max-sm:text-sm text-muted-foreground mt-1 text-lg">
          Registre uma venda fiado para um cliente.
        </p>
      </header>

      <VendaForm
        clientes={clientes}
        sugestoesDescricao={sugestoes}
        clienteInicialId={cliente}
      />
    </section>
  );
}
