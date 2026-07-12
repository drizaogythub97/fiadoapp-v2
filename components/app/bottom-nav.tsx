"use client";

import {
  ArrowUpRight,
  BarChart3,
  Clock,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoutButton } from "@/components/app/logout-button";
import { GAVETA_URL } from "@/lib/ecossistema";
import { cn } from "@/lib/utils";

const PRINCIPAIS = [
  { href: "/dashboard", label: "Painel", Icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", Icon: Users },
  { href: "/vendas", label: "Vendas", Icon: Receipt },
  { href: "/inadimplentes", label: "Atrasos", Icon: Clock },
] as const;

const NO_MAIS = [
  { href: "/relatorios", label: "Relatórios", Icon: BarChart3 },
  { href: "/analytics", label: "Analytics", Icon: TrendingUp },
  { href: "/configuracoes", label: "Configurações", Icon: Settings },
] as const;

/**
 * Navegação inferior do modo Minimalista — só existe em viewport mobile e
 * com data-ui-mode="minimalista" no <html> (variant `minimal` + `max-sm`).
 * No modo Simples e no desktop este componente fica display:none.
 */
export function BottomNav({
  displayName,
  mostrarSwitcher,
}: {
  displayName: string;
  /** Atalho do ecossistema: opt-in em /ecossistema (estágio 1). */
  mostrarSwitcher: boolean;
}) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);

  const ativo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const algumDoMaisAtivo = NO_MAIS.some(({ href }) => ativo(href));

  useEffect(() => {
    if (!maisAberto) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMaisAberto(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [maisAberto]);

  return (
    <div className="minimal:max-sm:block hidden print:hidden">
      {maisAberto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mais opções"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
          onClick={() => setMaisAberto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card text-card-foreground ring-foreground/10 flex flex-col gap-1 rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] ring-1"
          >
            <div className="flex items-center justify-between gap-2 px-3 pb-2">
              <p className="text-muted-foreground text-sm">
                Conectado como{" "}
                <span className="text-foreground font-medium">
                  {displayName}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setMaisAberto(false)}
                aria-label="Fechar"
                className="text-muted-foreground hover:text-foreground hover:bg-muted -mr-2 flex size-9 shrink-0 items-center justify-center rounded-lg"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            {NO_MAIS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMaisAberto(false)}
                aria-current={ativo(href) ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-lg px-3 text-base font-medium",
                  ativo(href)
                    ? "text-primary bg-primary/10"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </Link>
            ))}
            {/* App switcher (ecossistema, estágio 1): opt-in na página
                /ecossistema — só aparece para quem ligou o atalho. */}
            {mostrarSwitcher ? (
              <a
                href={GAVETA_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMaisAberto(false)}
                className="text-foreground hover:bg-muted flex h-12 items-center gap-3 rounded-lg px-3 text-base font-medium"
              >
                <ArrowUpRight aria-hidden="true" className="size-5" />
                Abrir o Gaveta
              </a>
            ) : null}
            <div className="border-border mt-2 flex flex-col border-t pt-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Navegação principal"
        className="border-border bg-background fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid h-14 grid-cols-5">
          {PRINCIPAIS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo(href) ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium",
                  ativo(href) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMaisAberto(true)}
              aria-haspopup="dialog"
              aria-expanded={maisAberto}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-medium",
                algumDoMaisAtivo ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Menu aria-hidden="true" className="size-5" />
              Mais
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
