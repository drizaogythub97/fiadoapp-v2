/* eslint-disable @next/next/no-img-element -- logo local pequena, sem otimização */
import {
  NOTA_COMPROVANTE,
  STATUS_LABEL,
  nomeCompletoCliente,
  tituloComprovanteVenda,
  type ComprovanteCliente,
  type ComprovanteQuitacaoData,
  type ComprovanteVendaData,
} from "@/lib/comprovante";
import { formatBRL, formatDataBR, formatTelefone } from "@/lib/format";

import styles from "./receipt.module.css";

function dataHoraBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function Frame({
  titulo,
  cliente,
  children,
}: {
  titulo: string;
  cliente: ComprovanteCliente;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.receipt}>
      <div className={styles.header}>
        <img src="/logo.png" alt="" className={styles.logo} />
        <div className={styles.brand}>FiadoApp</div>
      </div>
      <div className={styles.title}>{titulo}</div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Cliente</div>
        <div className={styles.row}>
          <span className={styles.rowStrong}>
            {nomeCompletoCliente(cliente)}
            {cliente.referencia ? ` (${cliente.referencia})` : ""}
          </span>
          {cliente.telefone ? (
            <span className={styles.rowLabel}>
              {formatTelefone(cliente.telefone)}
            </span>
          ) : null}
        </div>
      </div>

      {children}

      <div className={styles.nota}>{NOTA_COMPROVANTE}</div>
    </div>
  );
}

export function ComprovanteVenda({ data }: { data: ComprovanteVendaData }) {
  const restante = data.valorTotal - data.valorPago;
  return (
    <Frame titulo={tituloComprovanteVenda(data.status)} cliente={data.cliente}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Venda</div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Data da compra</span>
          <span className={styles.tabular}>
            {formatDataBR(data.dataCompra)}
          </span>
        </div>
        {data.dataVencimento ? (
          <div className={styles.row}>
            <span className={styles.rowLabel}>Vencimento</span>
            <span className={styles.tabular}>
              {formatDataBR(data.dataVencimento)}
            </span>
          </div>
        ) : null}
        <div className={styles.row}>
          <span className={styles.rowLabel}>Situação</span>
          <span className={styles.rowStrong}>{STATUS_LABEL[data.status]}</span>
        </div>
        {data.quitadoEm ? (
          <div className={styles.row}>
            <span className={styles.rowLabel}>Quitada em</span>
            <span className={styles.tabular}>{dataHoraBR(data.quitadoEm)}</span>
          </div>
        ) : null}
        {data.observacao ? (
          <div className={styles.row}>
            <span className={styles.rowLabel}>Observação</span>
            <span>{data.observacao}</span>
          </div>
        ) : null}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Itens</div>
        {data.itens.map((item, i) => (
          <div key={i} className={styles.row}>
            <span>
              {item.quantidade}x {item.descricao}
              <span className={styles.itemDetail}>
                {" "}
                · {formatBRL(item.valorUnitario)} a unidade
              </span>
            </span>
            <span className={styles.tabular}>{formatBRL(item.valorTotal)}</span>
          </div>
        ))}
        <div className={styles.total}>
          <span>Total</span>
          <span className={styles.tabular}>{formatBRL(data.valorTotal)}</span>
        </div>
      </div>

      {data.pagamentos.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Pagamentos</div>
          {data.pagamentos.map((p, i) => (
            <div key={i} className={styles.row}>
              <span className={styles.rowLabel}>{dataHoraBR(p.pagoEm)}</span>
              <span className={styles.tabular}>{formatBRL(p.valor)}</span>
            </div>
          ))}
          <div className={styles.destaque}>
            <span>Pago</span>
            <span className={styles.tabular}>{formatBRL(data.valorPago)}</span>
          </div>
          {restante > 0 ? (
            <div className={styles.destaque}>
              <span>Falta</span>
              <span className={styles.tabular}>{formatBRL(restante)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </Frame>
  );
}

export function ComprovanteQuitacao({
  data,
}: {
  data: ComprovanteQuitacaoData;
}) {
  return (
    <Frame titulo="Comprovante de quitação" cliente={data.cliente}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Quitação</div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Pago em</span>
          <span className={styles.tabular}>{dataHoraBR(data.pagoEm)}</span>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Vendas</div>
        {data.vendas.map((v, i) => (
          <div key={i} className={styles.row}>
            <span>
              Venda de {formatDataBR(v.dataCompra)}
              <span className={styles.itemDetail}>
                {" "}
                · {v.quitada ? "quitada" : "abatida"} (total{" "}
                {formatBRL(v.valorTotal)})
              </span>
            </span>
            <span className={styles.tabular}>{formatBRL(v.valorPago)}</span>
          </div>
        ))}
        <div className={styles.total}>
          <span>Total pago</span>
          <span className={styles.tabular}>{formatBRL(data.totalPago)}</span>
        </div>
        <div className={styles.destaque}>
          <span>
            {data.saldoRestante > 0 ? "Saldo restante" : "Situação"}
          </span>
          <span className={styles.tabular}>
            {data.saldoRestante > 0
              ? formatBRL(data.saldoRestante)
              : "Sem dívida ✅"}
          </span>
        </div>
      </div>
    </Frame>
  );
}
