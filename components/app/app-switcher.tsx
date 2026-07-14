import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

import { buttonVariants } from "@/components/ui/button";
import { GAVETA_URL } from "@/lib/ecossistema";
import { cn } from "@/lib/utils";

/**
 * App switcher do ecossistema (estágio 1): abre o outro app da família em
 * nova aba — a conta é a mesma. No Minimalista (mobile) o header some;
 * o equivalente vive no painel "Mais" da barra inferior.
 *
 * A logo do Gaveta (verde) num chip branco dá o reconhecimento imediato do
 * outro app, no mesmo tratamento das badges de integração (VendaOrigemBadge).
 */
export function AppSwitcher() {
  return (
    <a
      href={GAVETA_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "h-12 gap-2 pr-4 pl-2 text-base",
      )}
      aria-label="Abrir o Gaveta (mesma conta, nova aba)"
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-white p-0.5">
        <Image
          src="/gaveta-logo.png"
          alt=""
          width={24}
          height={24}
          className="size-full object-contain"
        />
      </span>
      Gaveta
      <ArrowUpRight aria-hidden="true" className="size-4" />
    </a>
  );
}
