"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import { FormatoDialog } from "@/components/app/formato-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Botão que abre comprovante/espelho perguntando o formato (fluxo do v1). */
export function BotaoComprovante({
  url,
  rotulo,
  titulo,
  className,
}: {
  url: string;
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
        className={cn("h-12 px-5 text-base", className)}
      >
        <FileText aria-hidden="true" className="size-4" />
        {rotulo}
      </Button>
      <FormatoDialog
        open={aberto}
        onClose={() => setAberto(false)}
        titulo={titulo ?? rotulo}
        url={url}
      />
    </>
  );
}
