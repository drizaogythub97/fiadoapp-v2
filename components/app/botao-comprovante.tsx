"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import { FormatoDialog } from "@/components/app/formato-dialog";
import { Button } from "@/components/ui/button";
import type { PedidoComprovante } from "@/lib/comprovante";
import { cn } from "@/lib/utils";

/** Botão que gera comprovante/espelho perguntando o formato (fluxo do v1). */
export function BotaoComprovante({
  pedido,
  rotulo,
  titulo,
  className,
}: {
  pedido: PedidoComprovante;
  rotulo: string;
  /** Título do diálogo; por padrão usa o próprio rótulo. */
  titulo?: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setAberto(true)}
        className={cn(
          // As classes minimal ficam depois do override: no Minimalista
          // (mobile) este botão acompanha os irmãos secundários (h-10).
          "h-12 px-5 text-base",
          className,
          "minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm",
        )}
      >
        <FileText aria-hidden="true" className="size-4" />
        {rotulo}
      </Button>
      <FormatoDialog
        open={aberto}
        onClose={() => setAberto(false)}
        titulo={titulo ?? rotulo}
        pedido={pedido}
      />
    </>
  );
}
