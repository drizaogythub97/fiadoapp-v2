import { formatBRL, formatDataBR } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/comprovante";
import {
  nomeClienteRelatorio,
  resumoRelatorio,
  type VendaRelatorio,
} from "@/lib/relatorio";
import type { VendaStatus } from "@/lib/types/fiado";

/**
 * Card PNG do relatório (paridade com o relatorio_imagem.js do v1):
 * 750px de largura, tema escuro FiadoApp, altura dinâmica. Roda SÓ no
 * cliente (canvas). O v1 baixava via bridge do WebView; no v2 o chamador
 * compartilha o Blob com Web Share (arquivo) ou baixa como fallback.
 */

export type MetaRelatorioImagem = {
  emitidoPor: string;
  filtroLabel: string;
  periodo: string;
  emitidoEm: string;
};

// ── Layout (mesmas medidas do v1) ─────────────────────────────────────────
const W = 750;
const PAD = 50;
const COL = W - PAD * 2;
const HEADER_H = 216;
const BODY_TOP = 44;
const SUMMARY_H = 154;
const SUMMARY_GAP = 36;
const SEC_TITLE_H = 54;
const VENDA_HEAD_H = 88;
const ITEM_H = 86;
const VENDA_FOOT_H = 68;
const VENDA_SEP = 28;
const TOTAL_H = 82;
const FOOTER_H = 80;
const BODY_BOTTOM = 40;

const CORAL = "#e8624a";
const STATUS_COR: Record<VendaStatus, string> = {
  ATIVA: "#f0a030",
  PARCIAL: "#4a9eff",
  PAGA: "#3ec98a",
};

function calcHeight(vendas: VendaRelatorio[]): number {
  let vendasH = 0;
  for (const v of vendas) {
    const n = v.itens.length || 1;
    vendasH += VENDA_HEAD_H + n * ITEM_H + VENDA_FOOT_H + VENDA_SEP;
  }
  return (
    HEADER_H +
    BODY_TOP +
    SUMMARY_H +
    SUMMARY_GAP +
    SEC_TITLE_H +
    vendasH +
    TOTAL_H +
    FOOTER_H +
    BODY_BOTTOM
  );
}

function carregarLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/logo.png";
  });
}

function desenhar(
  canvas: HTMLCanvasElement,
  vendas: VendaRelatorio[],
  meta: MetaRelatorioImagem,
  logo: HTMLImageElement | null,
) {
  const H = calcHeight(vendas);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d indisponível");

  const resumo = resumoRelatorio(vendas);

  // Fundo + listra lateral coral
  ctx.fillStyle = "#13131f";
  ctx.fillRect(0, 0, W, H);
  const stripe = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  stripe.addColorStop(0, CORAL);
  stripe.addColorStop(1, "rgba(232,98,74,0)");
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 0, 6, H);

  // ── Cabeçalho coral ────────────────────────────────────────────────────
  const hGrad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  hGrad.addColorStop(0, CORAL);
  hGrad.addColorStop(1, "#b83628");
  ctx.fillStyle = hGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, HEADER_H - 42);
  ctx.quadraticCurveTo(W, HEADER_H, W - 68, HEADER_H);
  ctx.lineTo(68, HEADER_H);
  ctx.quadraticCurveTo(0, HEADER_H, 0, HEADER_H - 42);
  ctx.closePath();
  ctx.fill();

  const logoSz = 58;
  const logoX = PAD + 4;
  const logoY = 20;
  ctx.save();
  ctx.beginPath();
  ctx.arc(logoX + logoSz / 2, logoY + logoSz / 2, logoSz / 2, 0, Math.PI * 2);
  ctx.clip();
  if (logo) {
    ctx.drawImage(logo, logoX, logoY, logoSz, logoSz);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "center";
    ctx.fillText("F", logoX + logoSz / 2, logoY + logoSz / 2 + 12);
  }
  ctx.restore();

  const textX = logoX + logoSz + 16;
  ctx.textAlign = "left";
  ctx.font = "500 17px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  ctx.fillText("FiadoApp", textX, logoY + 18);
  ctx.font = "bold 30px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText("Relatório de Vendas", textX, logoY + 54);
  ctx.font = "17px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.fillText(
    `Emitido em ${meta.emitidoEm} · por ${meta.emitidoPor}`,
    textX,
    logoY + 82,
  );

  ctx.textAlign = "right";
  ctx.font = "16px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  if (meta.periodo) ctx.fillText(meta.periodo, W - PAD, 126);
  ctx.fillText(meta.filtroLabel, W - PAD, 150);

  // ── Cards de resumo (A Receber = restante, correção do v2) ─────────────
  let y = HEADER_H + BODY_TOP;
  const cards = [
    { label: "Registros", value: String(resumo.registros), cor: "#4a9eff" },
    { label: "Total Geral", value: formatBRL(resumo.totalGeral), cor: CORAL },
    resumo.aReceber > 0
      ? { label: "A Receber", value: formatBRL(resumo.aReceber), cor: "#f0a030" }
      : { label: "Total Pago", value: formatBRL(resumo.totalPago), cor: "#3ec98a" },
  ];
  const cardW = Math.floor((COL - 20) / 3);
  const cardH = SUMMARY_H - 20;
  cards.forEach((c, i) => {
    const cx = PAD + i * (cardW + 10);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(cx, y, cardW, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = c.cor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, y, cardW, cardH, 12);
    ctx.stroke();
    ctx.fillStyle = c.cor;
    ctx.beginPath();
    ctx.roundRect(cx, y, cardW, 5, [3, 3, 0, 0]);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(c.label, cx + cardW / 2, y + 44);
    ctx.font = "bold 23px Arial";
    ctx.fillStyle = c.cor;
    let txt = c.value;
    while (ctx.measureText(txt).width > cardW - 12 && txt.length > 4) {
      txt = txt.slice(0, -4) + "…";
    }
    ctx.fillText(txt, cx + cardW / 2, y + 82);
    ctx.textAlign = "left";
  });
  y += SUMMARY_H + SUMMARY_GAP;

  // ── Seção vendas ───────────────────────────────────────────────────────
  ctx.font = "bold 21px Arial";
  ctx.fillStyle = CORAL;
  ctx.fillText("VENDAS", PAD, y);
  ctx.strokeStyle = CORAL;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(PAD, y + 10);
  ctx.lineTo(W - PAD, y + 10);
  ctx.stroke();
  ctx.globalAlpha = 1;
  y += SEC_TITLE_H;

  vendas.forEach((v, vi) => {
    const sc = STATUS_COR[v.status];
    const blockH = VENDA_HEAD_H + (v.itens.length || 1) * ITEM_H + VENDA_FOOT_H;

    ctx.fillStyle =
      vi % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.roundRect(PAD - 20, y - 6, COL + 40, blockH + 12, 12);
    ctx.fill();
    ctx.fillStyle = sc;
    ctx.beginPath();
    ctx.roundRect(PAD - 20, y - 6, 5, blockH + 12, [3, 0, 0, 3]);
    ctx.fill();

    // Cabeçalho da venda: badge de situação (o v2 não expõe id numérico)
    const badgeLabel = STATUS_LABEL[v.status];
    ctx.font = "bold 16px Arial";
    const badgeW = ctx.measureText(badgeLabel).width + 28;
    const badgeH = 30;
    ctx.fillStyle = sc + "22";
    ctx.strokeStyle = sc;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(PAD + 10, y + 8, badgeW, badgeH, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sc;
    ctx.textAlign = "center";
    ctx.fillText(badgeLabel, PAD + 10 + badgeW / 2, y + 28);
    ctx.textAlign = "left";

    const nome = nomeClienteRelatorio(v);
    const nomeRef = v.referencia ? `${nome}  (${v.referencia})` : nome;
    ctx.font = "bold 25px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(nomeRef, PAD + 10, y + 66);

    ctx.textAlign = "right";
    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.48)";
    ctx.fillText(`Compra: ${formatDataBR(v.dataCompra)}`, W - PAD - 10, y + 26);
    ctx.fillText(
      `Vence: ${v.dataVencimento ? formatDataBR(v.dataVencimento) : "—"}`,
      W - PAD - 10,
      y + 50,
    );
    ctx.textAlign = "left";
    y += VENDA_HEAD_H;

    // Itens
    v.itens.forEach((it, ii) => {
      ctx.fillStyle = ii % 2 === 0 ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.07)";
      ctx.fillRect(PAD - 14, y, COL + 28, ITEM_H);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD - 14, y);
      ctx.lineTo(W - PAD + 14, y);
      ctx.stroke();

      const midY = y + ITEM_H / 2;
      ctx.font = "20px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.textAlign = "left";
      ctx.fillText("›", PAD + 12, midY + 7);
      ctx.font = "22px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.fillText(it.descricao, PAD + 36, midY + 7);

      ctx.textAlign = "right";
      ctx.font = "16px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.50)";
      ctx.fillText(
        `${it.quantidade}×  ${formatBRL(it.valorUnitario)}`,
        W - PAD - 10,
        midY - 6,
      );
      ctx.font = "bold 24px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(formatBRL(it.valorTotal), W - PAD - 10, midY + 22);
      ctx.textAlign = "left";
      y += ITEM_H;
    });

    // Rodapé da venda (na parcial mostra pago/falta)
    ctx.fillStyle = "rgba(232,98,74,0.10)";
    ctx.fillRect(PAD - 14, y, COL + 28, VENDA_FOOT_H);
    ctx.strokeStyle = "rgba(232,98,74,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD - 14, y);
    ctx.lineTo(W - PAD + 14, y);
    ctx.stroke();

    const footMid = y + VENDA_FOOT_H / 2;
    ctx.font = "bold 21px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "left";
    const rotuloFoot =
      v.status === "PARCIAL"
        ? `Pago ${formatBRL(v.valorPago)} · Falta ${formatBRL(v.valorTotal - v.valorPago)}`
        : `Total da venda  (${v.itens.length} ${v.itens.length === 1 ? "item" : "itens"})`;
    ctx.fillText(rotuloFoot, PAD + 10, footMid + 9);

    ctx.font = "bold 34px Arial";
    ctx.fillStyle = CORAL;
    ctx.textAlign = "right";
    ctx.fillText(formatBRL(v.valorTotal), W - PAD - 10, footMid + 11);
    ctx.textAlign = "left";
    y += VENDA_FOOT_H + VENDA_SEP;
  });

  // ── Total geral ────────────────────────────────────────────────────────
  y += 4;
  const tGrad = ctx.createLinearGradient(PAD - 20, y, W - PAD + 20, y);
  tGrad.addColorStop(0, CORAL);
  tGrad.addColorStop(1, "#c84336");
  ctx.fillStyle = tGrad;
  ctx.beginPath();
  ctx.roundRect(PAD - 20, y, COL + 40, TOTAL_H, 10);
  ctx.fill();

  const totMid = y + TOTAL_H / 2;
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.textAlign = "left";
  ctx.fillText(
    `TOTAL GERAL  (${vendas.length} venda${vendas.length !== 1 ? "s" : ""})`,
    PAD + 10,
    totMid + 10,
  );
  ctx.font = "bold 36px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.fillText(formatBRL(resumo.totalGeral), W - PAD - 10, totMid + 12);
  ctx.textAlign = "left";

  y += TOTAL_H + FOOTER_H * 0.4;
  ctx.font = "16px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.textAlign = "center";
  ctx.fillText(
    "Gerado pelo FiadoApp · Os valores são baseados nos registros do sistema.",
    W / 2,
    y,
  );
}

/** Gera o PNG do relatório e devolve o Blob (roda só no navegador). */
export async function gerarImagemRelatorio(
  vendas: VendaRelatorio[],
  meta: MetaRelatorioImagem,
): Promise<Blob> {
  const logo = await carregarLogo();
  const canvas = document.createElement("canvas");
  desenhar(canvas, vendas, meta, logo);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("toBlob devolveu null"));
    }, "image/png");
  });
}
