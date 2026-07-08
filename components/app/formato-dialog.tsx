"use client";

import { Image as ImageIcon, Printer } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Escolha de formato do comprovante/espelho antes de abrir (fluxo do v1:
 * quitar venda / gerar espelho perguntam o formato). PDF abre a página de
 * impressão como sempre; Imagem abre com ?formato=imagem (sem auto-print,
 * botão Imagem em destaque).
 */
export function FormatoDialog({
  open,
  onClose,
  titulo,
  url,
}: {
  open: boolean;
  onClose: () => void;
  titulo: string;
  url: string | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>("[data-formato-pdf]")
        ?.focus();
    }, 0);
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

  if (!open || !url) return null;

  function abrir(formato: "pdf" | "imagem") {
    if (!url) return;
    const destino =
      formato === "imagem"
        ? `${url}${url.includes("?") ? "&" : "?"}formato=imagem`
        : url;
    window.open(destino, "_blank", "noopener");
    onClose();
  }

  return (
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
            className="h-13 justify-start gap-3 px-5 text-base font-medium"
          >
            <Printer aria-hidden="true" className="size-5" />
            PDF / Imprimir
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => abrir("imagem")}
            className="h-13 justify-start gap-3 px-5 text-base font-medium"
          >
            <ImageIcon aria-hidden="true" className="size-5" />
            Imagem (foto para enviar)
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-12 px-5 text-base sm:self-end"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
