"use client";

import { Receipt, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { VendaStatusBadge } from "@/components/app/venda-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, formatDataBR } from "@/lib/format";
import type { VendaComCliente } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";

type Filtro = "todas" | "abertas" | "pagas";

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "abertas", rotulo: "Em aberto" },
  { valor: "pagas", rotulo: "Pagas" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function nomeCliente(v: VendaComCliente): string {
  const c = v.fiado_clientes;
  if (!c) return "Cliente removido";
  return c.sobrenome ? `${c.nome} ${c.sobrenome}` : c.nome;
}

export function VendasClient({
  vendas,
  hoje,
}: {
  vendas: VendaComCliente[];
  hoje: string;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const filtradas = useMemo(() => {
    let lista = vendas;
    if (filtro === "abertas") lista = lista.filter((v) => v.status !== "PAGA");
    if (filtro === "pagas") lista = lista.filter((v) => v.status === "PAGA");
    const termo = norm(busca.trim());
    if (termo) {
      lista = lista.filter((v) => {
        const c = v.fiado_clientes;
        return norm(
          `${c?.nome ?? ""} ${c?.sobrenome ?? ""} ${c?.referencia ?? ""}`,
        ).includes(termo);
      });
    }
    return lista;
  }, [vendas, filtro, busca]);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <Input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar pelo nome do cliente…"
          aria-label="Buscar venda pelo cliente"
          className="h-13 pl-12 text-base"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-muted-foreground text-sm font-medium">
          Filtrar por situação
        </legend>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(({ valor, rotulo }) => (
            <Button
              key={valor}
              type="button"
              variant={filtro === valor ? "default" : "outline"}
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
              className="h-11 px-4 text-base"
            >
              {rotulo}
            </Button>
          ))}
        </div>
      </fieldset>

      <p aria-live="polite" className="text-muted-foreground text-base">
        {filtradas.length === 0
          ? null
          : filtradas.length === 1
            ? "1 venda encontrada"
            : `${filtradas.length} vendas encontradas`}
      </p>

      {filtradas.length === 0 ? (
        <div className="bg-muted/40 flex flex-col items-center gap-3 rounded-xl p-10 text-center">
          <Receipt
            aria-hidden="true"
            className="text-muted-foreground size-10"
          />
          <p className="text-lg font-medium">
            {vendas.length === 0
              ? "Nenhuma venda registrada ainda."
              : "Nenhuma venda encontrada com esses filtros."}
          </p>
          {vendas.length === 0 ? (
            <Link
              href="/vendas/nova"
              className={cn(
                buttonVariants(),
                "mt-2 h-13 px-6 text-lg font-medium",
              )}
            >
              Registrar venda
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtradas.map((v) => {
            const restante = v.valor_total - v.valor_pago;
            const vencida =
              v.status !== "PAGA" &&
              v.data_vencimento !== null &&
              v.data_vencimento < hoje;
            return (
              <li key={v.id}>
                <Link
                  href={`/vendas/${v.id}`}
                  className="ring-foreground/10 bg-card hover:ring-primary/40 flex flex-col gap-2 rounded-xl p-4 ring-1 transition-shadow"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-foreground text-lg font-semibold">
                      {nomeCliente(v)}
                      {v.fiado_clientes?.referencia ? (
                        <span className="text-muted-foreground ml-2 text-base font-normal">
                          ({v.fiado_clientes.referencia})
                        </span>
                      ) : null}
                    </span>
                    <VendaStatusBadge status={v.status} />
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
                    <span>Compra: {formatDataBR(v.data_compra)}</span>
                    {v.data_vencimento ? (
                      <span className={vencida ? "text-destructive" : ""}>
                        {vencida ? "Venceu em" : "Vence em"}{" "}
                        {formatDataBR(v.data_vencimento)}
                      </span>
                    ) : null}
                    <span className="text-foreground font-semibold">
                      {v.status === "PARCIAL"
                        ? `Faltam ${formatBRL(restante)} de ${formatBRL(v.valor_total)}`
                        : formatBRL(v.valor_total)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
