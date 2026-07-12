"use client";

import { CheckCircle2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import {
  FormatoEscolha,
  type FormatoQuitacao,
} from "@/components/app/formato-escolha";
import {
  isDesktop,
  useEmissorComprovante,
} from "@/components/receipt/emissor-comprovante";
import { Button } from "@/components/ui/button";
import {
  urlDoComprovanteComFormato,
  type PedidoComprovante,
} from "@/lib/comprovante";
import { formatBRL } from "@/lib/format";
import type { VendaStatus } from "@/lib/types/fiado";

import { excluirVenda, registrarPagamento } from "../actions";

export function VendaAcoes({
  vendaId,
  clienteId,
  status,
  restante,
}: {
  vendaId: string;
  clienteId: string;
  status: VendaStatus;
  restante: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState<"quitar" | "excluir" | null>(
    null,
  );
  // Formato escolhido dentro do diálogo de quitação (fluxo v1): no celular
  // gera e compartilha direto; no desktop o toast abre o preview.
  const [formato, setFormato] = useState<FormatoQuitacao>("pdf");
  const { emitir, node: emissorNode } = useEmissorComprovante();

  function quitar() {
    startTransition(async () => {
      const result = await registrarPagamento({
        modo: "selecionadas",
        clienteId,
        vendaIds: [vendaId],
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const pedido: PedidoComprovante | null =
        formato !== "nenhum" ? { tipo: "venda", vendaId } : null;
      if (pedido && !isDesktop()) {
        toast.success(`Venda quitada: ${formatBRL(result.totalPago)}.`);
        void emitir(pedido, formato === "imagem" ? "imagem" : "pdf");
      } else {
        toast.success(`Venda quitada: ${formatBRL(result.totalPago)}.`, {
          duration: 10_000,
          action: pedido
            ? {
                label: "Ver comprovante",
                onClick: () =>
                  window.open(
                    urlDoComprovanteComFormato(
                      pedido,
                      formato === "imagem" ? "imagem" : "pdf",
                    ),
                    "_blank",
                  ),
              }
            : undefined,
        });
      }
      setConfirmando(null);
      router.refresh();
    });
  }

  function excluir() {
    startTransition(async () => {
      const result = await excluirVenda(vendaId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Venda excluída.");
      router.push(
        result.clienteId ? `/clientes/${result.clienteId}` : "/vendas",
      );
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {status !== "PAGA" ? (
        <Button
          type="button"
          onClick={() => setConfirmando("quitar")}
          className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-13 px-6 text-base font-medium"
        >
          <CheckCircle2 aria-hidden="true" className="size-5" />
          Quitar esta venda
        </Button>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        onClick={() => setConfirmando("excluir")}
        className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-13 px-6 text-base font-medium"
      >
        <Trash2 aria-hidden="true" className="size-5" />
        Excluir venda
      </Button>

      <ConfirmDialog
        open={confirmando === "quitar"}
        onClose={() => {
          if (!pending) setConfirmando(null);
        }}
        title="Quitar esta venda"
        description={
          <>
            O valor em aberto de{" "}
            <strong className="text-foreground">{formatBRL(restante)}</strong>{" "}
            será registrado como pago.
          </>
        }
        confirmLabel="Confirmar pagamento"
        onConfirm={quitar}
        pending={pending}
      >
        <FormatoEscolha
          valor={formato}
          onChange={setFormato}
          disabled={pending}
        />
      </ConfirmDialog>

      {emissorNode}

      <ConfirmDialog
        open={confirmando === "excluir"}
        onClose={() => {
          if (!pending) setConfirmando(null);
        }}
        title="Excluir venda"
        description={
          <>
            Tem certeza que deseja excluir esta venda?
            <br />
            <span className="text-destructive">
              Todos os itens e pagamentos dela serão excluídos permanentemente.
            </span>
          </>
        }
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onConfirm={excluir}
        pending={pending}
      />
    </div>
  );
}
