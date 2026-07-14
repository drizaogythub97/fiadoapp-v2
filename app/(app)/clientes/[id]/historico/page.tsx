import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotaoComprovante } from "@/components/app/botao-comprovante";
import { VendaStatusBadge } from "@/components/app/venda-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  formatBRL,
  formatDataBR,
  formatTelefone,
  rotuloItemVenda,
} from "@/lib/format";
import type { ClienteResumo, ItemVenda, Venda } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";

export const metadata = { title: "Histórico do cliente" };

type VendaPaga = Venda & { fiado_itens_venda: ItemVenda[] };

export default async function HistoricoClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: clienteData }, { data: vendasData }] = await Promise.all([
    supabase
      .from("fiado_clientes")
      .select("id, nome, sobrenome, referencia, telefone")
      .eq("id", id)
      .maybeSingle(),
    // Paridade v1: o histórico lista as vendas PAGAS (as abertas ficam no
    // detalhe do cliente).
    supabase
      .from("fiado_vendas")
      .select(
        "id, cliente_id, data_compra, data_vencimento, valor_total, valor_pago, status, observacao, quitado_em, created_at, fiado_itens_venda(id, descricao, quantidade, valor_unitario, valor_total)",
      )
      .eq("cliente_id", id)
      .eq("status", "PAGA")
      .order("quitado_em", { ascending: false }),
  ]);

  if (!clienteData) notFound();
  const cliente = clienteData as ClienteResumo;
  const vendas = (vendasData ?? []) as unknown as VendaPaga[];
  const nome = cliente.sobrenome
    ? `${cliente.nome} ${cliente.sobrenome}`
    : cliente.nome;

  return (
    <section className="minimal:max-sm:gap-4 flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
          Histórico de vendas pagas
        </h1>
        <p className="text-muted-foreground text-lg">
          {nome}
          {cliente.referencia ? ` (${cliente.referencia})` : ""}
          {cliente.telefone ? ` · ${formatTelefone(cliente.telefone)}` : ""}
        </p>
      </header>

      {vendas.length === 0 ? (
        <p className="bg-muted/40 text-muted-foreground rounded-xl p-8 text-center text-lg">
          Nenhuma venda paga encontrada.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {vendas.map((v) => (
            <li
              key={v.id}
              className="ring-foreground/10 bg-card flex flex-col gap-3 rounded-xl p-4 ring-1"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-semibold">
                  Compra de {formatDataBR(v.data_compra)}
                </span>
                <VendaStatusBadge status="PAGA" />
              </div>
              <p className="minimal:max-sm:text-sm text-muted-foreground text-base">
                Quitada em{" "}
                {v.quitado_em
                  ? new Date(v.quitado_em).toLocaleDateString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })
                  : "—"}
              </p>
              <ul className="flex flex-col gap-1">
                {v.fiado_itens_venda.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-base"
                  >
                    <span>
                      {rotuloItemVenda(item.quantidade, item.descricao)}
                      {item.quantidade !== 1 ? (
                        <span className="text-muted-foreground text-sm">
                          {" "}
                          · {formatBRL(item.valor_unitario)} a unidade
                        </span>
                      ) : null}
                    </span>
                    <span className="font-medium">
                      {formatBRL(item.valor_total)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="flex items-center justify-between border-t pt-2 text-lg font-semibold">
                Total <span>{formatBRL(v.valor_total)}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <BotaoComprovante
                  pedido={{ tipo: "venda", vendaId: v.id }}
                  rotulo="Comprovante"
                  className="h-11 w-full px-4"
                />
                <Link
                  href={`/vendas/${v.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "minimal:max-sm:h-10 minimal:max-sm:text-sm h-11 w-full px-4 text-base",
                  )}
                >
                  Detalhar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/vendas/nova?cliente=${cliente.id}`}
          className={cn(
            buttonVariants(),
            "minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 w-full text-base font-medium",
          )}
        >
          <Plus aria-hidden="true" className="size-4" />
          Nova venda
        </Link>
        <Link
          href={`/clientes/${cliente.id}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 w-full text-base",
          )}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </Link>
      </div>
    </section>
  );
}
