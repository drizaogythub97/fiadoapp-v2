"use client";

import {
  BarChart3,
  Clock,
  LayoutDashboard,
  Receipt,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Painel", Icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", Icon: Users },
  { href: "/vendas", label: "Vendas", Icon: Receipt },
  { href: "/inadimplentes", label: "Inadimplentes", Icon: Clock },
  { href: "/relatorios", label: "Relatórios", Icon: BarChart3 },
  { href: "/analytics", label: "Analytics", Icon: TrendingUp },
  { href: "/configuracoes", label: "Configurações", Icon: Settings },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="border-border bg-background border-t"
    >
      {/* Mobile: grid uniforme de 2 colunas (último item ocupa a linha
          inteira) — o flex-wrap gerava linhas assimétricas. Desktop: flex. */}
      <ul className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-1 px-2 py-1 sm:flex sm:flex-wrap sm:items-stretch sm:py-0">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="last:col-span-2 sm:flex-initial">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-md px-3 text-base font-medium transition-colors sm:h-14 sm:min-w-[80px]",
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
