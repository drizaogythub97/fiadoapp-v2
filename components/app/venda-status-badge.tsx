import type { VendaStatus } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";

const ESTILOS: Record<VendaStatus, { rotulo: string; classe: string }> = {
  ATIVA: {
    rotulo: "● Ativa",
    classe:
      "bg-primary/10 text-primary dark:bg-primary/15",
  },
  PARCIAL: {
    rotulo: "◐ Parcial",
    classe:
      "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  },
  PAGA: {
    rotulo: "✓ Paga",
    classe:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
};

export function VendaStatusBadge({
  status,
  className,
}: {
  status: VendaStatus;
  className?: string;
}) {
  const { rotulo, classe } = ESTILOS[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap",
        classe,
        className,
      )}
    >
      {rotulo}
    </span>
  );
}
