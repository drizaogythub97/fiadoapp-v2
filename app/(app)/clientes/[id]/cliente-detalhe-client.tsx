"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { VendaStatusBadge } from "@/components/app/venda-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatBRL,
  formatDataBR,
  formatTelefone,
  maskBRL,
  parseBRL,
} from "@/lib/format";
import type { ClienteResumo, Venda } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";

import { registrarPagamento } from "../../vendas/actions";
import { excluirCliente } from "../actions";

type Cliente = ClienteResumo & { limite_credito: number | null };

type Dialogo = "todas" | "selecionadas" | "parcial" | "excluir" | null;

export function ClienteDetalheClient({
  cliente,
  vendasAbertas,
  totalPagas,
  hoje,
}: {
  cliente: Cliente;
  vendasAbertas: Venda[];
  totalPagas: number;
  hoje: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [valorParcial, setValorParcial] = useState("");

  const nomeCompleto = cliente.sobrenome
    ? `${cliente.nome} ${cliente.sobrenome}`
    : cliente.nome;

  const saldo = useMemo(
    () =>
      vendasAbertas.reduce((soma, v) => soma + (v.valor_total - v.valor_pago), 0),
    [vendasAbertas],
  );
  const somaSelecionadas = useMemo(
    () =>
      vendasAbertas
        .filter((v) => selecionadas.has(v.id))
        .reduce((soma, v) => soma + (v.valor_total - v.valor_pago), 0),
    [vendasAbertas, selecionadas],
  );
  const emAtraso = vendasAbertas.some(
    (v) => v.data_vencimento !== null && v.data_vencimento < hoje,
  );
  const acimaLimite =
    cliente.limite_credito !== null && saldo > cliente.limite_credito;

  function alternarSelecao(id: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function fecharDialogo() {
    if (!pending) setDialogo(null);
  }

  function aposQuitar(totalPago: number) {
    toast.success(`Pagamento registrado: ${formatBRL(totalPago)}.`);
    setDialogo(null);
    setSelecionadas(new Set());
    setValorParcial("");
    router.refresh();
  }

  function quitarTodas() {
    startTransition(async () => {
      const result = await registrarPagamento({
        modo: "total",
        clienteId: cliente.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      aposQuitar(result.totalPago);
    });
  }

  function quitarSelecionadas() {
    startTransition(async () => {
      const result = await registrarPagamento({
        modo: "selecionadas",
        clienteId: cliente.id,
        vendaIds: Array.from(selecionadas),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      aposQuitar(result.totalPago);
    });
  }

  function quitarParcial() {
    const valor = parseBRL(valorParcial);
    if (valor <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    if (valor > saldo) {
      toast.error(
        `O valor não pode passar do total em aberto (${formatBRL(saldo)}).`,
      );
      return;
    }
    startTransition(async () => {
      const result = await registrarPagamento({
        modo: "parcial",
        clienteId: cliente.id,
        valor,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      aposQuitar(result.totalPago);
    });
  }

  function excluir() {
    startTransition(async () => {
      const result = await excluirCliente(cliente.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Cliente ${nomeCompleto} excluído.`);
      router.push("/clientes");
    });
  }

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      {/* ── CABEÇALHO ───────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {nomeCompleto}
            {cliente.referencia ? (
              <span className="text-muted-foreground ml-2 text-xl font-normal">
                ({cliente.referencia})
              </span>
            ) : null}
          </h1>
          {vendasAbertas.length > 0 ? (
            <span className="bg-primary/10 text-primary inline-flex rounded-full px-3 py-1 text-sm font-medium">
              ●{" "}
              {vendasAbertas.length === 1
                ? "1 venda em aberto"
                : `${vendasAbertas.length} vendas em aberto`}
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300">
              Sem dívida
            </span>
          )}
          {emAtraso ? (
            <span className="bg-destructive/10 text-destructive inline-flex rounded-full px-3 py-1 text-sm font-semibold">
              Em atraso
            </span>
          ) : null}
          {acimaLimite ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"
              aria-label={`Acima do limite de crédito de ${formatBRL(cliente.limite_credito ?? 0)}`}
            >
              <AlertTriangle aria-hidden="true" className="size-4" />
              Acima do limite
            </span>
          ) : null}
        </div>
        {cliente.telefone ? (
          <p className="text-muted-foreground text-lg">
            {formatTelefone(cliente.telefone)}
          </p>
        ) : null}
      </header>

      {/* ── VENDAS EM ABERTO ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Vendas em aberto
        </h2>

        {vendasAbertas.length === 0 ? (
          <p className="text-muted-foreground text-base">
            Este cliente não tem vendas em aberto.
            {totalPagas > 0
              ? ` Já quitou ${totalPagas === 1 ? "1 venda" : `${totalPagas} vendas`}.`
              : ""}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {vendasAbertas.map((v) => {
                const restante = v.valor_total - v.valor_pago;
                const vencida =
                  v.data_vencimento !== null && v.data_vencimento < hoje;
                return (
                  <li
                    key={v.id}
                    className="ring-foreground/10 bg-card flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ring-1"
                  >
                    <input
                      type="checkbox"
                      id={`venda-${v.id}`}
                      checked={selecionadas.has(v.id)}
                      onChange={() => alternarSelecao(v.id)}
                      aria-label={`Selecionar venda de ${formatDataBR(v.data_compra)} no valor de ${formatBRL(restante)}`}
                      className="accent-primary size-6 shrink-0 cursor-pointer"
                    />
                    <label
                      htmlFor={`venda-${v.id}`}
                      className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">
                          {formatDataBR(v.data_compra)}
                        </span>
                        {v.status === "PARCIAL" ? (
                          <VendaStatusBadge status="PARCIAL" />
                        ) : null}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {v.data_vencimento ? (
                          <span className={vencida ? "text-destructive" : ""}>
                            {vencida ? "Venceu em" : "Vence em"}{" "}
                            {formatDataBR(v.data_vencimento)}
                          </span>
                        ) : (
                          "Sem vencimento"
                        )}
                      </span>
                    </label>
                    <span className="text-base font-semibold whitespace-nowrap">
                      {v.status === "PARCIAL" ? (
                        <>
                          {formatBRL(restante)}{" "}
                          <span className="text-muted-foreground text-sm font-normal">
                            de {formatBRL(v.valor_total)}
                          </span>
                        </>
                      ) : (
                        formatBRL(v.valor_total)
                      )}
                    </span>
                    <Link
                      href={`/vendas/${v.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-11 px-4 text-base",
                      )}
                      aria-label={`Detalhar venda de ${formatDataBR(v.data_compra)}`}
                    >
                      Detalhar
                    </Link>
                  </li>
                );
              })}
            </ul>

            <p className="bg-primary/10 flex items-center justify-between rounded-xl px-4 py-3 text-lg font-semibold">
              Total em aberto
              <span className="text-primary">{formatBRL(saldo)}</span>
            </p>

            {/* ── QUITAÇÕES ───────────────────────────────────────── */}
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                onClick={() => setDialogo("todas")}
                className="h-13 text-base font-medium"
              >
                <CheckCircle2 aria-hidden="true" className="size-5" />
                Quitar todas
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={selecionadas.size === 0}
                onClick={() => setDialogo("selecionadas")}
                className="h-13 text-base font-medium"
              >
                <CheckSquare aria-hidden="true" className="size-5" />
                Quitar selecionadas
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogo("parcial")}
                className="h-13 text-base font-medium"
              >
                <Wallet aria-hidden="true" className="size-5" />
                Quitar um valor
              </Button>
            </div>
            {selecionadas.size === 0 ? (
              <p className="text-muted-foreground text-sm">
                Para quitar só algumas vendas, marque as caixinhas da lista.
              </p>
            ) : null}
            {totalPagas > 0 ? (
              <p className="text-muted-foreground text-sm">
                {totalPagas === 1
                  ? "1 venda já quitada."
                  : `${totalPagas} vendas já quitadas.`}
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* ── OUTRAS AÇÕES ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/vendas/nova?cliente=${cliente.id}`}
          className={cn(buttonVariants(), "h-12 px-5 text-base")}
        >
          <Plus aria-hidden="true" className="size-4" />
          Nova venda
        </Link>
        <Link
          href={`/clientes/${cliente.id}/editar`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 px-5 text-base",
          )}
        >
          <Pencil aria-hidden="true" className="size-4" />
          Editar cliente
        </Link>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setDialogo("excluir")}
          className="h-12 px-5 text-base"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Excluir cliente
        </Button>
      </div>

      <Link
        href="/clientes"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-12 self-start px-5 text-base",
        )}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar
      </Link>

      {/* ── DIÁLOGOS ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={dialogo === "todas"}
        onClose={fecharDialogo}
        title="Quitar todas as vendas"
        description={
          vendasAbertas.length === 1 ? (
            <>
              A venda em aberto de{" "}
              <strong className="text-foreground">{nomeCompleto}</strong>, no
              valor de{" "}
              <strong className="text-foreground">{formatBRL(saldo)}</strong>,
              será marcada como paga.
            </>
          ) : (
            <>
              As {vendasAbertas.length} vendas em aberto de{" "}
              <strong className="text-foreground">{nomeCompleto}</strong>,
              somando{" "}
              <strong className="text-foreground">{formatBRL(saldo)}</strong>,
              serão marcadas como pagas.
            </>
          )
        }
        confirmLabel="Confirmar pagamento"
        onConfirm={quitarTodas}
        pending={pending}
      />

      <ConfirmDialog
        open={dialogo === "selecionadas"}
        onClose={fecharDialogo}
        title="Quitar vendas selecionadas"
        description={
          selecionadas.size === 1 ? (
            <>
              A venda selecionada, no valor de{" "}
              <strong className="text-foreground">
                {formatBRL(somaSelecionadas)}
              </strong>
              , será marcada como paga.
            </>
          ) : (
            <>
              As {selecionadas.size} vendas selecionadas, somando{" "}
              <strong className="text-foreground">
                {formatBRL(somaSelecionadas)}
              </strong>
              , serão marcadas como pagas.
            </>
          )
        }
        confirmLabel="Confirmar pagamento"
        onConfirm={quitarSelecionadas}
        pending={pending}
      />

      <ConfirmDialog
        open={dialogo === "parcial"}
        onClose={fecharDialogo}
        title="Quitar um valor"
        description={
          <>
            O valor pago abate primeiro as vendas mais antigas de{" "}
            <strong className="text-foreground">{nomeCompleto}</strong>. Total
            em aberto:{" "}
            <strong className="text-foreground">{formatBRL(saldo)}</strong>.
          </>
        }
        confirmLabel="Registrar pagamento"
        onConfirm={quitarParcial}
        pending={pending}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor-parcial" className="text-base">
            Valor recebido
          </Label>
          <Input
            id="valor-parcial"
            inputMode="decimal"
            autoComplete="off"
            placeholder="R$ 0,00"
            value={valorParcial}
            onChange={(e) => setValorParcial(maskBRL(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="h-12 text-base"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialogo === "excluir"}
        onClose={fecharDialogo}
        title="Excluir cliente"
        description={
          <>
            Tem certeza que deseja excluir{" "}
            <strong className="text-foreground">{nomeCompleto}</strong>?
            <br />
            <span className="text-destructive">
              Todas as vendas e pagamentos deste cliente serão excluídos
              permanentemente.
            </span>
          </>
        }
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onConfirm={excluir}
        pending={pending}
      />
    </section>
  );
}
