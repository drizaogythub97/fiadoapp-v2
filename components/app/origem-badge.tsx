import { Blocks } from "lucide-react";

import type { VendaOrigem } from "@/lib/types/fiado";

/**
 * Marca visual (sem link) de que a venda a prazo foi lançada no caixa do
 * Gaveta (F6, Fase 1). Só aparece quando origem === "gaveta"; para vendas
 * do próprio FiadoApp não renderiza nada.
 */
export function VendaOrigemBadge({
  origem,
  className,
}: {
  origem: VendaOrigem;
  className?: string;
}) {
  if (origem !== "gaveta") return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-500/15 dark:text-sky-300 ${className ?? ""}`}
    >
      <Blocks aria-hidden="true" className="size-3.5" />
      Registrada no Gaveta
    </span>
  );
}
