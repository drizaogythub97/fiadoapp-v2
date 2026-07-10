"use client";

import { useEffect, useRef, useState } from "react";

import { tetoEixo, type PontoDia } from "@/lib/analytics";
import { formatBRL, formatDataBR } from "@/lib/format";

/** Gráfico de linha do faturamento por dia — SVG próprio, sem dependências. */

const ALTURA = 280;
const MARGEM = { top: 12, right: 16, bottom: 28, left: 64 };
// Acima disso os marcadores viram só o destaque do dia ativo (a linha densa
// com um ponto por dia deixaria os círculos colados uns nos outros).
const MAX_MARCADORES = 45;

const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const brlEixo = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

export function GraficoFaturamento({ pontos }: { pontos: PontoDia[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setLargura(Math.floor(entries[0].contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = pontos.length;
  const plotW = Math.max(0, largura - MARGEM.left - MARGEM.right);
  const plotH = ALTURA - MARGEM.top - MARGEM.bottom;
  const teto = tetoEixo(Math.max(...pontos.map((p) => p.total), 0));

  const x = (i: number) =>
    MARGEM.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => MARGEM.top + plotH - (v / teto) * plotH;

  function indicePeloPointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - MARGEM.left;
    if (n <= 1) return n - 1;
    const idx = Math.round((px / plotW) * (n - 1));
    return Math.min(n - 1, Math.max(0, idx));
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const passo = e.key === "ArrowRight" ? 1 : -1;
      setAtivo((a) => Math.min(n - 1, Math.max(0, (a ?? -passo) + passo)));
    } else if (e.key === "Escape") {
      setAtivo(null);
    }
  }

  // Ticks do eixo X: no máximo 6, sempre incluindo o primeiro e o último.
  const passoTick = Math.max(1, Math.ceil(n / 6));
  const ticksX = pontos
    .map((p, i) => ({ ...p, i }))
    .filter(({ i }) => i % passoTick === 0 || i === n - 1);

  const fracoes = [0, 0.25, 0.5, 0.75, 1];
  const linha = pontos.map((p, i) => `${x(i)},${y(p.total)}`).join(" ");
  const area =
    n > 1
      ? `${linha} ${x(n - 1)},${y(0)} ${x(0)},${y(0)}`
      : "";

  const pontoAtivo = ativo !== null ? pontos[ativo] : null;
  // Tooltip clampado nas bordas para não vazar do card.
  const tooltipX =
    ativo !== null && largura > 0
      ? Math.min(largura - 110, Math.max(10, x(ativo) - 55))
      : 0;

  const diasComVenda = pontos.filter((p) => p.total > 0);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={wrapperRef}
        tabIndex={0}
        aria-label={`Faturamento por dia. ${diasComVenda.length} ${diasComVenda.length === 1 ? "dia com venda" : "dias com vendas"} no período. Use as setas para percorrer os dias; os valores também estão na tabela abaixo do gráfico.`}
        onKeyDown={aoTeclar}
        onBlur={() => setAtivo(null)}
        className="focus-visible:ring-ring/50 relative w-full rounded-lg outline-none focus-visible:ring-3"
      >
        {largura > 0 ? (
          <svg
            width={largura}
            height={ALTURA}
            aria-hidden="true"
            onPointerMove={(e) => setAtivo(indicePeloPointer(e))}
            onPointerLeave={() => setAtivo(null)}
            className="block touch-none select-none"
          >
            {/* Grade horizontal: hairlines sólidas, recessivas */}
            {fracoes.map((f) => (
              <g key={f}>
                <line
                  x1={MARGEM.left}
                  x2={largura - MARGEM.right}
                  y1={y(teto * f)}
                  y2={y(teto * f)}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  x={MARGEM.left - 8}
                  y={y(teto * f) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--muted-foreground)"
                >
                  {brlEixo(teto * f)}
                </text>
              </g>
            ))}

            {/* Rótulos do eixo X */}
            {ticksX.map(({ dia, i }) => (
              <text
                key={dia}
                x={x(i)}
                y={ALTURA - 8}
                textAnchor="middle"
                fontSize={11}
                fill="var(--muted-foreground)"
              >
                {diaMes(dia)}
              </text>
            ))}

            {/* Área (lavagem 10%) + linha 2px */}
            {n > 1 ? (
              <polygon points={area} fill="var(--primary)" fillOpacity={0.1} />
            ) : null}
            <polyline
              points={linha}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Marcadores (com anel da superfície) só quando há espaço */}
            {n <= MAX_MARCADORES
              ? pontos.map((p, i) => (
                  <circle
                    key={p.dia}
                    cx={x(i)}
                    cy={y(p.total)}
                    r={4}
                    fill="var(--primary)"
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ))
              : null}

            {/* Crosshair + destaque do dia ativo */}
            {ativo !== null && pontoAtivo ? (
              <g>
                <line
                  x1={x(ativo)}
                  x2={x(ativo)}
                  y1={MARGEM.top}
                  y2={MARGEM.top + plotH}
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                />
                <circle
                  cx={x(ativo)}
                  cy={y(pontoAtivo.total)}
                  r={5}
                  fill="var(--primary)"
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              </g>
            ) : null}
          </svg>
        ) : (
          <div style={{ height: ALTURA }} />
        )}

        {ativo !== null && pontoAtivo ? (
          <div
            role="status"
            className="ring-foreground/10 bg-card pointer-events-none absolute top-0 w-[100px] rounded-lg px-2 py-1.5 text-center shadow-md ring-1"
            style={{ left: tooltipX }}
          >
            <div className="text-muted-foreground text-xs">
              {formatDataBR(pontoAtivo.dia)}
            </div>
            <div className="text-sm font-semibold">
              {formatBRL(pontoAtivo.total)}
            </div>
          </div>
        ) : null}
      </div>

      {/* Tabela equivalente (acessibilidade): só os dias com movimento */}
      <details className="text-base">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer py-2 select-none">
          Ver dados em tabela
        </summary>
        {diasComVenda.length === 0 ? (
          <p className="text-muted-foreground py-2">
            Nenhum dia com venda no período.
          </p>
        ) : (
          <table className="w-full max-w-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th scope="col" className="py-1.5 pr-2 font-medium">
                  Dia
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  Faturamento
                </th>
              </tr>
            </thead>
            <tbody>
              {diasComVenda.map((p) => (
                <tr key={p.dia} className="border-border/50 border-b">
                  <td className="py-1.5 pr-2">{formatDataBR(p.dia)}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatBRL(p.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
    </div>
  );
}
