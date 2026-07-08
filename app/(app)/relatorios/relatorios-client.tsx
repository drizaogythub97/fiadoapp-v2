"use client";

import {
  FileSpreadsheet,
  Image as ImageIcon,
  Printer,
  Receipt,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { VendaStatusBadge } from "@/components/app/venda-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_LABEL } from "@/lib/comprovante";
import { formatBRL, formatDataBR, hojeISO } from "@/lib/format";
import {
  FILTROS_INICIAIS,
  SITUACAO_FILTRO_LABEL,
  csvRelatorio,
  filtrarVendasRelatorio,
  nomeClienteRelatorio,
  periodoLabel,
  resumoRelatorio,
  type FiltrosRelatorio,
  type SituacaoFiltro,
  type VendaRelatorio,
} from "@/lib/relatorio";
import { gerarImagemRelatorio } from "@/lib/relatorio-imagem";
import { cn } from "@/lib/utils";

const SITUACOES: { valor: SituacaoFiltro; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "abertas", rotulo: "Em aberto" },
  { valor: "pagas", rotulo: "Pagas" },
];

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function RelatoriosClient({
  vendas,
  emitidoPor,
}: {
  vendas: VendaRelatorio[];
  emitidoPor: string;
}) {
  const [filtros, setFiltros] = useState<FiltrosRelatorio>(FILTROS_INICIAIS);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [gerandoImagem, startGerarImagem] = useTransition();
  const todasRef = useRef<HTMLInputElement>(null);

  const filtradas = useMemo(
    () => filtrarVendasRelatorio(vendas, filtros),
    [vendas, filtros],
  );

  // Exporta as selecionadas; sem seleção, exporta todas as filtradas (v1).
  const exportaveis = useMemo(() => {
    const marcadas = filtradas.filter((v) => selecionadas.has(v.id));
    return marcadas.length > 0 ? marcadas : filtradas;
  }, [filtradas, selecionadas]);

  const resumo = useMemo(() => resumoRelatorio(filtradas), [filtradas]);
  const resumoExport = useMemo(
    () => resumoRelatorio(exportaveis),
    [exportaveis],
  );

  const marcadasVisiveis = filtradas.filter((v) =>
    selecionadas.has(v.id),
  ).length;
  // Estado visual "algumas marcadas" só existe via propriedade DOM.
  useEffect(() => {
    if (todasRef.current) {
      todasRef.current.indeterminate =
        marcadasVisiveis > 0 && marcadasVisiveis < filtradas.length;
    }
  }, [marcadasVisiveis, filtradas.length]);

  function mudarFiltro<K extends keyof FiltrosRelatorio>(
    campo: K,
    valor: FiltrosRelatorio[K],
  ) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  function alternarSelecao(id: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodas(marcar: boolean) {
    setSelecionadas(
      marcar ? new Set(filtradas.map((v) => v.id)) : new Set(),
    );
  }

  function exportarCSV() {
    const csv = csvRelatorio(exportaveis);
    const data = hojeISO().replaceAll("-", "");
    baixarBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `relatorio_fiadoapp_${data}.csv`,
    );
  }

  function compartilharImagem() {
    startGerarImagem(async () => {
      try {
        const blob = await gerarImagemRelatorio(exportaveis, {
          emitidoPor,
          filtroLabel: SITUACAO_FILTRO_LABEL[filtros.situacao],
          periodo: periodoLabel(filtros.de, filtros.ate),
          emitidoEm: new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "America/Sao_Paulo",
          }).format(new Date()),
        });
        const file = new File([blob], "relatorio-fiadoapp.png", {
          type: "image/png",
        });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Relatório de Vendas — FiadoApp",
          });
        } else {
          baixarBlob(blob, "relatorio-fiadoapp.png");
        }
      } catch (err) {
        // Cancelar a caixa de compartilhamento não é erro.
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error("Não foi possível gerar a imagem. Tente de novo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── FILTROS (não imprimem) ──────────────────────────────────── */}
      <div className="print:hidden flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="filtro-de" className="text-base">
              Data inicial
            </Label>
            <Input
              id="filtro-de"
              type="date"
              value={filtros.de}
              onChange={(e) => mudarFiltro("de", e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="filtro-ate" className="text-base">
              Data final
            </Label>
            <Input
              id="filtro-ate"
              type="date"
              value={filtros.ate}
              onChange={(e) => mudarFiltro("ate", e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="filtro-inicial" className="text-base">
              Inicial do cliente
            </Label>
            <select
              id="filtro-inicial"
              value={filtros.inicial}
              onChange={(e) => mudarFiltro("inicial", e.target.value)}
              className={cn(
                "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-12 w-full rounded-lg border bg-transparent px-2.5 text-base transition-colors outline-none focus-visible:ring-3",
              )}
            >
              <option value="">Todas</option>
              {LETRAS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="filtro-busca" className="text-base">
              Buscar cliente
            </Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="text-muted-foreground absolute top-1/2 left-3 size-5 -translate-y-1/2"
              />
              <Input
                id="filtro-busca"
                type="search"
                value={filtros.busca}
                onChange={(e) => mudarFiltro("busca", e.target.value)}
                placeholder="Nome ou referência…"
                className="h-12 pl-10 text-base"
              />
            </div>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-muted-foreground text-sm font-medium">
            Situação
          </legend>
          <div className="flex flex-wrap gap-2">
            {SITUACOES.map(({ valor, rotulo }) => (
              <Button
                key={valor}
                type="button"
                variant={filtros.situacao === valor ? "default" : "outline"}
                aria-pressed={filtros.situacao === valor}
                onClick={() => mudarFiltro("situacao", valor)}
                className="h-11 px-4 text-base"
              >
                {rotulo}
              </Button>
            ))}
          </div>
        </fieldset>

        {/* ── RESUMO DO FILTRO ────────────────────────────────────── */}
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { rotulo: "Registros", valor: String(resumo.registros) },
            { rotulo: "Total geral", valor: formatBRL(resumo.totalGeral) },
            { rotulo: "Total pago", valor: formatBRL(resumo.totalPago) },
            { rotulo: "A receber", valor: formatBRL(resumo.aReceber) },
          ].map((kpi) => (
            <div
              key={kpi.rotulo}
              className="ring-foreground/10 bg-card rounded-xl px-4 py-3 ring-1"
            >
              <dt className="text-muted-foreground text-sm">{kpi.rotulo}</dt>
              <dd className="text-xl font-bold tracking-tight">
                {kpi.valor}
              </dd>
            </div>
          ))}
        </dl>

        {/* ── EXPORTAÇÕES ─────────────────────────────────────────── */}
        {filtradas.length > 0 ? (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                onClick={() => window.print()}
                className="h-13 text-base font-medium"
              >
                <Printer aria-hidden="true" className="size-5" />
                Imprimir / PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={exportarCSV}
                className="h-13 text-base font-medium"
              >
                <FileSpreadsheet aria-hidden="true" className="size-5" />
                Exportar CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={gerandoImagem}
                onClick={compartilharImagem}
                className="h-13 text-base font-medium"
              >
                <ImageIcon aria-hidden="true" className="size-5" />
                {gerandoImagem ? "Gerando imagem…" : "Compartilhar imagem"}
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              {marcadasVisiveis > 0
                ? `As exportações usam as ${marcadasVisiveis === 1 ? "1 venda selecionada" : `${marcadasVisiveis} vendas selecionadas`}.`
                : "As exportações usam todas as vendas filtradas. Para exportar só algumas, marque as caixinhas da lista."}
            </p>
          </>
        ) : null}

        {/* ── LISTA COM SELEÇÃO ───────────────────────────────────── */}
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
          </div>
        ) : (
          <>
            <div className="ring-foreground/10 bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ring-1">
              <label className="flex cursor-pointer items-center gap-3 text-base font-medium">
                <input
                  ref={todasRef}
                  type="checkbox"
                  checked={
                    marcadasVisiveis === filtradas.length &&
                    filtradas.length > 0
                  }
                  onChange={(e) => alternarTodas(e.target.checked)}
                  className="accent-primary size-6 cursor-pointer"
                />
                Selecionar todas
              </label>
              <span aria-live="polite" className="text-muted-foreground text-base">
                {marcadasVisiveis === 0
                  ? "Nenhuma selecionada"
                  : marcadasVisiveis === 1
                    ? "1 selecionada"
                    : `${marcadasVisiveis} selecionadas`}
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {filtradas.map((v) => (
                <li
                  key={v.id}
                  className="ring-foreground/10 bg-card flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ring-1"
                >
                  <input
                    type="checkbox"
                    id={`rel-${v.id}`}
                    checked={selecionadas.has(v.id)}
                    onChange={() => alternarSelecao(v.id)}
                    aria-label={`Selecionar venda de ${nomeClienteRelatorio(v)} em ${formatDataBR(v.dataCompra)}`}
                    className="accent-primary size-6 shrink-0 cursor-pointer"
                  />
                  <label
                    htmlFor={`rel-${v.id}`}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5"
                  >
                    <span className="text-base font-semibold">
                      {nomeClienteRelatorio(v)}
                      {v.referencia ? (
                        <span className="text-muted-foreground ml-1.5 font-normal">
                          ({v.referencia})
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {formatDataBR(v.dataCompra)}
                      {v.dataVencimento
                        ? ` · Vence ${formatDataBR(v.dataVencimento)}`
                        : ""}
                    </span>
                  </label>
                  <span className="text-base font-semibold whitespace-nowrap">
                    {formatBRL(v.valorTotal)}
                  </span>
                  <VendaStatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ── VERSÃO DE IMPRESSÃO (cores fixas: papel claro) ──────────── */}
      <div className="hidden print:block text-[#1f2430]">
        <div className="mb-1 text-xl font-bold">
          Relatório de Vendas — FiadoApp
        </div>
        <div className="mb-4 text-[13px] text-[#6b7280]">
          Emitido por {emitidoPor}
          {periodoLabel(filtros.de, filtros.ate)
            ? ` · ${periodoLabel(filtros.de, filtros.ate)}`
            : ""}{" "}
          · {SITUACAO_FILTRO_LABEL[filtros.situacao]}
        </div>

        <div className="mb-4 text-[13px]">
          <strong>{resumoExport.registros}</strong>{" "}
          {resumoExport.registros === 1 ? "venda" : "vendas"} · Total geral{" "}
          <strong>{formatBRL(resumoExport.totalGeral)}</strong> · Pago{" "}
          <strong>{formatBRL(resumoExport.totalPago)}</strong> · A receber{" "}
          <strong>{formatBRL(resumoExport.aReceber)}</strong>
        </div>

        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b-2 border-[#1f2430] text-left">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Cliente</th>
              <th className="py-1 pr-2">Compra</th>
              <th className="py-1 pr-2">Vencimento</th>
              <th className="py-1 pr-2 text-right">Valor</th>
              <th className="py-1 text-right">Situação</th>
            </tr>
          </thead>
          <tbody>
            {exportaveis.map((v, i) => (
              <RelatorioPrintLinhas key={v.id} venda={v} indice={i + 1} />
            ))}
            <tr className="border-t-2 border-[#1f2430] font-bold">
              <td colSpan={4} className="py-1.5 pr-2">
                TOTAL GERAL ({resumoExport.registros}{" "}
                {resumoExport.registros === 1 ? "registro" : "registros"})
              </td>
              <td className="py-1.5 pr-2 text-right">
                {formatBRL(resumoExport.totalGeral)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className="mt-6 border-t border-dashed border-[#d1d5db] pt-2 text-center text-[11px] text-[#6b7280]">
          Gerado pelo FiadoApp · Os valores são baseados nos registros do
          sistema.
        </div>
      </div>
    </div>
  );
}

function RelatorioPrintLinhas({
  venda,
  indice,
}: {
  venda: VendaRelatorio;
  indice: number;
}) {
  return (
    <>
      <tr className="break-inside-avoid border-b border-[#e5e7eb] font-semibold">
        <td className="py-1 pr-2 align-top">{indice}</td>
        <td className="py-1 pr-2 align-top">
          {nomeClienteRelatorio(venda)}
          {venda.referencia ? ` (${venda.referencia})` : ""}
        </td>
        <td className="py-1 pr-2 align-top whitespace-nowrap">
          {formatDataBR(venda.dataCompra)}
        </td>
        <td className="py-1 pr-2 align-top whitespace-nowrap">
          {venda.dataVencimento ? formatDataBR(venda.dataVencimento) : "—"}
        </td>
        <td className="py-1 pr-2 text-right align-top whitespace-nowrap">
          {formatBRL(venda.valorTotal)}
        </td>
        <td className="py-1 text-right align-top whitespace-nowrap">
          {STATUS_LABEL[venda.status]}
        </td>
      </tr>
      {venda.itens.map((item, j) => (
        <tr key={j} className="border-b border-[#f3f4f6] text-[#6b7280]">
          <td />
          <td className="py-0.5 pr-2" colSpan={3}>
            › {item.quantidade}x {item.descricao} —{" "}
            {formatBRL(item.valorUnitario)} a unidade
          </td>
          <td className="py-0.5 pr-2 text-right whitespace-nowrap">
            {formatBRL(item.valorTotal)}
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}
