"use client";

import { Image as ImageIcon, Printer } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  useEmissorComprovante,
  type FormatoEmissao,
} from "@/components/receipt/emissor-comprovante";
import type { PedidoComprovante } from "@/lib/comprovante";

/**
 * Escolha de formato do comprovante/espelho antes de gerar (fluxo do v1).
 * Desktop: abre a rota /comprovante/* em nova aba (PDF auto-imprime).
 * Celular: gera o documento na própria tela e abre o compartilhamento
 * nativo do aparelho (useEmissorComprovante) — sem aba de preview.
 */
export function FormatoDialog({
  open,
  onClose,
  titulo,
  pedido,
}: {
  open: boolean;
  onClose: () => void;
  titulo: string;
  pedido: PedidoComprovante | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { emitir, node } = useEmissorComprovante();

  // Foco inicial só na abertura (depende só de `open`) — não a cada
  // re-render, senão roubaria o foco de um campo do diálogo a cada tecla.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>("[data-formato-pdf]")
        ?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  function abrir(formato: FormatoEmissao) {
    if (!pedido) return;
    onClose();
    void emitir(pedido, formato);
  }

  return (
    <>
      {open && pedido ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="formato-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-card text-card-foreground ring-foreground/10 flex w-full max-w-md flex-col gap-4 rounded-xl p-6 ring-1"
          >
            <div>
              <h2
                id="formato-dialog-title"
                className="text-xl font-semibold tracking-tight"
              >
                {titulo}
              </h2>
              <p className="text-muted-foreground mt-2 text-base">
                Em qual formato você quer gerar?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => abrir("pdf")}
                data-formato-pdf
                className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-13 justify-start gap-3 px-5 text-base font-medium"
              >
                <Printer aria-hidden="true" className="size-5" />
                PDF / Imprimir
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => abrir("imagem")}
                className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-13 justify-start gap-3 px-5 text-base font-medium"
              >
                <ImageIcon aria-hidden="true" className="size-5" />
                Imagem (foto para enviar)
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="minimal:max-sm:h-10 minimal:max-sm:text-sm h-12 px-5 text-base sm:self-end"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
      {node}
    </>
  );
}
