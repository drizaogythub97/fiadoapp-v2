import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotaoComprovante } from "@/components/app/botao-comprovante";
import { VendaStatusBadge } from "@/components/app/venda-status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  textoComprovanteVenda,
  tituloComprovanteVenda,
} from "@/lib/comprovante";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatDataBR, formatTelefone, hojeISO } from "@/lib/format";
import type { ItemVenda, Pagamento, VendaComCliente } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";
import { linkWhatsAppTexto } from "@/lib/whatsapp";

import { VendaAcoes } from "./venda-acoes";

export const metadata = { title: "Detalhe da venda" };

export default async function VendaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: vendaData }, { data: itensData }, { data: pagamentosData }] =
    await Promise.all([
      supabase
        .from("fiado_vendas")
        .select(
          "id, cliente_id, data_compra, data_vencimento, valor_total, valor_pago, status, observacao, quitado_em, created_at, fiado_clientes(id, nome, sobrenome, referencia, telefone)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("fiado_itens_venda")
        .select("id, descricao, quantidade, valor_unitario, valor_total")
        .eq("venda_id", id),
      supabase
        .from("fiado_pagamentos")
        .select("id, venda_id, valor_pago, pago_em")
        .eq("venda_id", id)
        .order("pago_em", { ascending: true }),
    ]);

  if (!vendaData) notFound();

  const venda = vendaData as unknown as VendaComCliente;
  const itens = (itensData ?? []) as ItemVenda[];
  const pagamentos = (pagamentosData ?? []) as Pagamento[];
  const cliente = venda.fiado_clientes;
  const restante = venda.valor_total - venda.valor_pago;
  const vencida =
    venda.status !== "PAGA" &&
    venda.data_vencimento !== null &&
    venda.data_vencimento < hojeISO();

  return (
    <section className="minimal:max-sm:gap-4 flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
            {cliente ? (
              <Link
                href={`/clientes/${cliente.id}`}
                className="hover:text-primary underline-offset-4 hover:underline"
              >
                {cliente.sobrenome
                  ? `${cliente.nome} ${cliente.sobrenome}`
                  : cliente.nome}
              </Link>
            ) : (
              "Cliente removido"
            )}
            {cliente?.referencia ? (
              <span className="text-muted-foreground ml-2 text-xl font-normal">
                ({cliente.referencia})
              </span>
            ) : null}
          </h1>
          <VendaStatusBadge status={venda.status} className="text-base" />
        </div>
        {cliente?.telefone ? (
          <p className="text-muted-foreground text-lg">
            {formatTelefone(cliente.telefone)}
          </p>
        ) : null}
      </header>

      <dl className="ring-foreground/10 bg-card grid gap-4 rounded-xl p-5 ring-1 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-sm font-medium">
            Data da compra
          </dt>
          <dd className="text-lg font-semibold">
            {formatDataBR(venda.data_compra)}
          </dd>
        </div>
        {venda.data_vencimento ? (
          <div>
            <dt className="text-muted-foreground text-sm font-medium">
              Vencimento
            </dt>
            <dd
              className={cn(
                "text-lg font-semibold",
                vencida && "text-destructive",
              )}
            >
              {formatDataBR(venda.data_vencimento)}
              {vencida ? " (vencida)" : ""}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground text-sm font-medium">
            Valor total
          </dt>
          <dd className="text-lg font-semibold">
            {formatBRL(venda.valor_total)}
          </dd>
        </div>
        {venda.status !== "ATIVA" ? (
          <div>
            <dt className="text-muted-foreground text-sm font-medium">
              {venda.status === "PAGA" ? "Pago" : "Pago até agora"}
            </dt>
            <dd className="text-lg font-semibold">
              {formatBRL(venda.valor_pago)}
              {venda.status === "PARCIAL" ? (
                <span className="text-destructive ml-2">
                  (faltam {formatBRL(restante)})
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {venda.quitado_em ? (
          <div>
            <dt className="text-muted-foreground text-sm font-medium">
              Quitada em
            </dt>
            <dd className="text-lg font-semibold">
              {new Date(venda.quitado_em).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </dd>
          </div>
        ) : null}
        {venda.observacao ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-sm font-medium">
              Observação
            </dt>
            <dd className="text-base whitespace-pre-line">
              {venda.observacao}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-col gap-3">
        <h2 className="minimal:max-sm:text-lg text-xl font-semibold tracking-tight">Itens da venda</h2>
        <ul className="flex flex-col gap-2">
          {itens.map((item) => (
            <li
              key={item.id}
              className="ring-foreground/10 bg-card flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 ring-1"
            >
              <div className="flex flex-col">
                <span className="text-base font-medium">
                  {item.quantidade}x {item.descricao}
                </span>
                <span className="text-muted-foreground text-sm">
                  {formatBRL(item.valor_unitario)} a unidade
                </span>
              </div>
              <span className="text-base font-semibold">
                {formatBRL(item.valor_total)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {pagamentos.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="minimal:max-sm:text-lg text-xl font-semibold tracking-tight">Pagamentos</h2>
          <ul className="flex flex-col gap-2">
            {pagamentos.map((p) => (
              <li
                key={p.id}
                className="ring-foreground/10 bg-card flex items-center justify-between rounded-xl px-4 py-3 ring-1"
              >
                <span className="minimal:max-sm:text-sm text-muted-foreground text-base">
                  {new Date(p.pago_em).toLocaleDateString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </span>
                <span className="text-base font-semibold">
                  {formatBRL(p.valor_pago)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <VendaAcoes
        vendaId={venda.id}
        clienteId={venda.cliente_id}
        status={venda.status}
        restante={restante}
      />

      {cliente
        ? (() => {
            const espelho = textoComprovanteVenda({
              vendaId: venda.id,
              cliente,
              dataCompra: venda.data_compra,
              dataVencimento: venda.data_vencimento,
              status: venda.status,
              quitadoEm: venda.quitado_em,
              observacao: venda.observacao,
              itens: itens.map((i) => ({
                descricao: i.descricao,
                quantidade: i.quantidade,
                valorUnitario: i.valor_unitario,
                valorTotal: i.valor_total,
              })),
              pagamentos: pagamentos.map((p) => ({
                pagoEm: p.pago_em,
                valor: p.valor_pago,
              })),
              valorTotal: venda.valor_total,
              valorPago: venda.valor_pago,
            });
            const whatsapp = linkWhatsAppTexto(cliente.telefone, espelho);
            const rotulo = tituloComprovanteVenda(venda.status);
            return (
              <div className="flex flex-col gap-2 sm:flex-row">
                <BotaoComprovante
                  pedido={{ tipo: "venda", vendaId: venda.id }}
                  rotulo={rotulo}
                  className="h-13 px-6 font-medium"
                />
                {whatsapp ? (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "minimal:max-sm:h-11 minimal:max-sm:text-sm h-13 px-6 text-base font-medium",
                    )}
                  >
                    <MessageCircle aria-hidden="true" className="size-5" />
                    Enviar por WhatsApp
                  </a>
                ) : null}
              </div>
            );
          })()
        : null}

      <Link
        href={cliente ? `/clientes/${cliente.id}` : "/vendas"}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 self-start px-5 text-base",
        )}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar
      </Link>
    </section>
  );
}
