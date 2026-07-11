import { CheckCircle2, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatTelefone, hojeISO } from "@/lib/format";
import type { ClienteResumo, Venda } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";
import { diasDeAtraso, linkCobrancaWhatsApp } from "@/lib/whatsapp";

export const metadata = { title: "Inadimplentes" };

type VendaVencida = Pick<
  Venda,
  "id" | "valor_total" | "valor_pago" | "data_vencimento"
> & {
  fiado_clientes: ClienteResumo | null;
};

type Inadimplente = {
  cliente: ClienteResumo;
  vendasVencidas: number;
  totalDevido: number;
  diasAtraso: number;
};

export default async function InadimplentesPage() {
  const hoje = hojeISO();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fiado_vendas")
    .select(
      "id, valor_total, valor_pago, data_vencimento, fiado_clientes(id, nome, sobrenome, referencia, telefone)",
    )
    .neq("status", "PAGA")
    .lt("data_vencimento", hoje)
    .limit(1000);

  const vendas = (data ?? []) as unknown as VendaVencida[];

  // Agrega por cliente (como o v1), mas o devido é o RESTANTE da venda —
  // correção do modelo v2: pagamento parcial abate do valor exibido.
  const porCliente = new Map<string, Inadimplente>();
  for (const v of vendas) {
    if (!v.fiado_clientes) continue;
    const atual = porCliente.get(v.fiado_clientes.id) ?? {
      cliente: v.fiado_clientes,
      vendasVencidas: 0,
      totalDevido: 0,
      diasAtraso: 0,
    };
    atual.vendasVencidas += 1;
    atual.totalDevido += v.valor_total - v.valor_pago;
    atual.diasAtraso = Math.max(
      atual.diasAtraso,
      diasDeAtraso(v.data_vencimento, hoje),
    );
    porCliente.set(v.fiado_clientes.id, atual);
  }
  const inadimplentes = Array.from(porCliente.values()).sort(
    (a, b) => b.diasAtraso - a.diasAtraso,
  );
  const totalGeral = inadimplentes.reduce((s, i) => s + i.totalDevido, 0);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Inadimplentes</h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Clientes com vendas vencidas e ainda em aberto.
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-destructive text-base">
          Não foi possível carregar os inadimplentes. Tente recarregar a
          página.
        </p>
      ) : inadimplentes.length === 0 ? (
        <div className="bg-muted/40 flex flex-col items-center gap-3 rounded-xl p-10 text-center">
          <CheckCircle2
            aria-hidden="true"
            className="size-10 text-emerald-600 dark:text-emerald-400"
          />
          <p className="text-lg font-medium">
            Nenhuma inadimplência encontrada!
          </p>
          <p className="text-muted-foreground text-base">
            Todos os clientes estão em dia.
          </p>
        </div>
      ) : (
        <>
          <p className="bg-destructive/10 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-lg font-semibold">
            <span>
              ⚠️{" "}
              {inadimplentes.length === 1
                ? "1 cliente inadimplente"
                : `${inadimplentes.length} clientes inadimplentes`}
            </span>
            <span className="text-destructive">{formatBRL(totalGeral)}</span>
          </p>

          <ul className="flex flex-col gap-3">
            {inadimplentes.map(
              ({ cliente, vendasVencidas, totalDevido, diasAtraso }) => {
                const nome = cliente.sobrenome
                  ? `${cliente.nome} ${cliente.sobrenome}`
                  : cliente.nome;
                const whatsapp = linkCobrancaWhatsApp({
                  nome: cliente.nome,
                  telefone: cliente.telefone,
                  valorEmAberto: totalDevido,
                  diasAtraso,
                });
                return (
                  <li
                    key={cliente.id}
                    className="ring-foreground/10 bg-card flex flex-col gap-3 rounded-xl p-4 ring-1"
                  >
                    {/* Mobile: coluna única alinhada à esquerda (o wrap
                        deixava o valor "solto" no meio). Desktop: valor à
                        direita, como antes. */}
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="text-foreground hover:text-primary text-xl font-semibold underline-offset-4 hover:underline">
                          {nome}
                          {cliente.referencia ? (
                            <span className="text-muted-foreground ml-2 text-base font-normal">
                              ({cliente.referencia})
                            </span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground text-base">
                          {vendasVencidas === 1
                            ? "1 venda vencida"
                            : `${vendasVencidas} vendas vencidas`}
                          {cliente.telefone
                            ? ` · ${formatTelefone(cliente.telefone)}`
                            : ""}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                        <span className="text-destructive text-lg font-bold">
                          {formatBRL(totalDevido)}
                        </span>
                        <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
                          <Clock aria-hidden="true" className="size-4" />
                          {diasAtraso === 1
                            ? "1 dia em atraso"
                            : `${diasAtraso} dias em atraso`}
                        </span>
                      </span>
                    </Link>
                    {whatsapp ? (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "h-12 self-start px-5 text-base",
                        )}
                      >
                        <MessageCircle aria-hidden="true" className="size-5" />
                        Cobrar pelo WhatsApp
                      </a>
                    ) : null}
                  </li>
                );
              },
            )}
          </ul>
        </>
      )}
    </section>
  );
}
