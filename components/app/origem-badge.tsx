import Image from "next/image";

import type { VendaOrigem } from "@/lib/types/fiado";

/**
 * Marca visual (sem link) de que a venda a prazo foi lançada no caixa do
 * Gaveta (F6, Fase 1). Cor VERDE + logo do Gaveta — as badges de referência
 * usam a cor/marca do OUTRO app, criando o contraste de integração (o
 * FiadoApp é coral; o Gaveta, verde). Só aparece quando origem === "gaveta".
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
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300 ${className ?? ""}`}
    >
      <span className="inline-flex size-4 items-center justify-center rounded-[3px] bg-white p-px">
        <Image
          src="/gaveta-logo.png"
          alt=""
          width={16}
          height={16}
          className="size-full object-contain"
        />
      </span>
      Registrada no Gaveta
    </span>
  );
}
