"use client";

import { FileText, Image as ImageIcon, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export type FormatoQuitacao = "pdf" | "imagem" | "nenhum";

/**
 * Escolha do formato do comprovante DENTRO do diálogo de quitação (fluxo
 * pedido pelo dono em 2026-07-11: perguntar o formato junto da confirmação,
 * sem toast intermediário). "Não gerar" registra o pagamento sem documento.
 */
export function FormatoEscolha({
  valor,
  onChange,
  disabled,
}: {
  valor: FormatoQuitacao;
  onChange: (v: FormatoQuitacao) => void;
  disabled?: boolean;
}) {
  const opcoes: {
    v: FormatoQuitacao;
    rotulo: string;
    Icon: typeof Printer;
  }[] = [
    { v: "pdf", rotulo: "PDF", Icon: Printer },
    { v: "imagem", rotulo: "Imagem", Icon: ImageIcon },
    { v: "nenhum", rotulo: "Não gerar", Icon: FileText },
  ];
  return (
    <fieldset className="flex flex-col gap-2">
      {/* mb-2 na legend: fora do layout flex do fieldset, o gap não conta. */}
      <legend className="minimal:max-sm:text-sm mb-2 text-base font-medium">
        Comprovante para o cliente
      </legend>
      <div
        role="group"
        aria-label="Formato do comprovante"
        className="flex flex-wrap gap-2"
      >
        {opcoes.map(({ v, rotulo, Icon }) => (
          <Button
            key={v}
            type="button"
            variant={valor === v ? "default" : "outline"}
            aria-pressed={valor === v}
            disabled={disabled}
            onClick={() => onChange(v)}
            className="minimal:max-sm:h-10 minimal:max-sm:px-2 minimal:max-sm:text-sm h-12 flex-1 px-3 text-base sm:flex-initial sm:px-4"
          >
            <Icon aria-hidden="true" className="size-4" />
            {rotulo}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
