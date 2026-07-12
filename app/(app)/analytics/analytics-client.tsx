"use client";

import { ChartNoAxesColumn } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ATALHOS_PERIODO,
  faturamentoPorDia,
  filtrarPeriodo,
  periodoDoAtalho,
  resumoAnalytics,
  topClientes,
  type AtalhoPeriodo,
  type VendaAnalytics,
} from "@/lib/analytics";
import { formatBRL } from "@/lib/format";

import { GraficoFaturamento } from "./grafico-faturamento";

export function AnalyticsClient({ vendas }: { vendas: VendaAnalytics[] }) {
  const inicial = useMemo(() => periodoDoAtalho("mes"), []);
  const [de, setDe] = useState(inicial.de);
  const [ate, setAte] = useState(inicial.ate);
  const [atalho, setAtalho] = useState<AtalhoPeriodo | null>("mes");

  const filtradas = useMemo(
    () => filtrarPeriodo(vendas, de, ate),
    [vendas, de, ate],
  );
  const resumo = useMemo(() => resumoAnalytics(filtradas), [filtradas]);
  const porDia = useMemo(
    () => faturamentoPorDia(filtradas, de, ate),
    [filtradas, de, ate],
  );
  const top = useMemo(() => topClientes(filtradas), [filtradas]);
  const maiorTotal = top[0]?.total ?? 0;

  function aplicarAtalho(valor: AtalhoPeriodo) {
    const p = periodoDoAtalho(valor);
    setDe(p.de);
    setAte(p.ate);
    setAtalho(valor);
  }

  const kpis = [
    { rotulo: "Faturamento bruto", valor: formatBRL(resumo.faturamento) },
    { rotulo: "Total recebido", valor: formatBRL(resumo.recebido) },
    { rotulo: "Em aberto", valor: formatBRL(resumo.emAberto) },
    { rotulo: "Vendas realizadas", valor: String(resumo.vendas) },
    { rotulo: "Clientes atendidos", valor: String(resumo.clientes) },
  ];

  const pctRecebido =
    resumo.faturamento > 0
      ? Math.round((resumo.recebido / resumo.faturamento) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ── FILTRO DE PERÍODO (uma linha acima de tudo que ele afeta) ── */}
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-lg">
          <div className="flex flex-col gap-2">
            <Label htmlFor="analytics-de" className="text-base">
              De
            </Label>
            <Input
              id="analytics-de"
              type="date"
              value={de}
              onChange={(e) => {
                setDe(e.target.value);
                setAtalho(null);
              }}
              className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="analytics-ate" className="text-base">
              Até
            </Label>
            <Input
              id="analytics-ate"
              type="date"
              value={ate}
              onChange={(e) => {
                setAte(e.target.value);
                setAtalho(null);
              }}
              className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
            />
          </div>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-muted-foreground text-sm font-medium">
            Atalhos de período
          </legend>
          <div className="flex flex-wrap gap-2">
            {ATALHOS_PERIODO.map(({ valor, rotulo }) => (
              <Button
                key={valor}
                type="button"
                variant={atalho === valor ? "default" : "outline"}
                aria-pressed={atalho === valor}
                onClick={() => aplicarAtalho(valor)}
                className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-11 px-4 text-base"
              >
                {rotulo}
              </Button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* ── KPIs DO PERÍODO ────────────────────────────────────────── */}
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.rotulo}
            className="ring-foreground/10 bg-card rounded-xl px-4 py-3 ring-1"
          >
            <dt className="text-muted-foreground text-sm">{kpi.rotulo}</dt>
            <dd className="text-xl font-bold tracking-tight">{kpi.valor}</dd>
          </div>
        ))}
      </dl>

      {resumo.vendas === 0 ? (
        <div className="bg-muted/40 flex flex-col items-center gap-3 rounded-xl p-10 text-center">
          <ChartNoAxesColumn
            aria-hidden="true"
            className="text-muted-foreground size-10"
          />
          <p className="text-lg font-medium">
            {vendas.length === 0
              ? "Nenhuma venda registrada ainda."
              : "Nenhuma venda no período escolhido."}
          </p>
          <p className="minimal:max-sm:text-sm text-muted-foreground text-base">
            Ajuste as datas ou use um dos atalhos acima.
          </p>
        </div>
      ) : (
        <>
          {/* ── FATURAMENTO POR DIA ─────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Faturamento por dia</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoFaturamento pontos={porDia} />
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* ── TOP CLIENTES ──────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  Top {top.length === 1 ? "cliente" : `${top.length} clientes`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col gap-3">
                  {top.map((c) => (
                    <li key={c.clienteId} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-base font-medium">
                          {c.nome}
                          {c.referencia ? (
                            <span className="text-muted-foreground ml-1.5 font-normal">
                              ({c.referencia})
                            </span>
                          ) : null}
                        </span>
                        <span className="text-base font-semibold whitespace-nowrap">
                          {formatBRL(c.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          aria-hidden="true"
                          className="bg-primary h-3 rounded-r-sm"
                          style={{
                            width: `${maiorTotal > 0 ? Math.max(1, (c.total / maiorTotal) * 100) : 0}%`,
                          }}
                        />
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {c.qtdVendas} {c.qtdVendas === 1 ? "venda" : "vendas"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* ── PAGAS × EM ABERTO ─────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Pagas × Em aberto</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <p className="text-base">
                  <span className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
                    {pctRecebido}%
                  </span>{" "}
                  <span className="text-muted-foreground">
                    do faturamento do período já foi recebido.
                  </span>
                </p>

                {/* Barra empilhada única com vão de 2px na cor do card */}
                <div
                  role="img"
                  aria-label={`Recebido ${formatBRL(resumo.recebido)}; em aberto ${formatBRL(resumo.emAberto)}.`}
                  className="bg-card flex h-4 w-full gap-[2px] overflow-hidden rounded-full"
                >
                  {resumo.recebido > 0 ? (
                    <div
                      className="bg-success rounded-l-full"
                      style={{ width: `${pctRecebido}%` }}
                    />
                  ) : null}
                  {resumo.emAberto > 0 ? (
                    <div className="bg-destructive flex-1 rounded-r-full" />
                  ) : null}
                </div>

                <dl className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="bg-success size-3 shrink-0 rounded-full"
                    />
                    <dt className="text-base">Recebido</dt>
                    <dd className="ml-auto text-right">
                      <span className="text-base font-semibold">
                        {formatBRL(resumo.recebido)}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {resumo.vendasPagas}{" "}
                        {resumo.vendasPagas === 1
                          ? "venda paga"
                          : "vendas pagas"}
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="bg-destructive size-3 shrink-0 rounded-full"
                    />
                    <dt className="text-base">Em aberto</dt>
                    <dd className="ml-auto text-right">
                      <span className="text-base font-semibold">
                        {formatBRL(resumo.emAberto)}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {resumo.vendasAbertas}{" "}
                        {resumo.vendasAbertas === 1
                          ? "venda em aberto"
                          : "vendas em aberto"}
                      </span>
                    </dd>
                  </div>
                </dl>

                <p className="text-muted-foreground text-sm">
                  &quot;Recebido&quot; inclui pagamentos parciais de vendas
                  ainda em aberto.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
