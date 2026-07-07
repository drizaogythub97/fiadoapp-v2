import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ClienteComSaldo, ResumoDashboard } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";

import { DashboardSearch } from "./dashboard-search";

export const metadata = {
  title: "Painel",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: resumoData }, { data: clientesData }] = await Promise.all([
    supabase.rpc("fiado_resumo_dashboard"),
    supabase.rpc("fiado_clientes_com_saldo"),
  ]);

  const resumo = (
    Array.isArray(resumoData) ? resumoData[0] : resumoData
  ) as ResumoDashboard | null;
  const clientes = ((clientesData ?? []) as ClienteComSaldo[]).map((c) => ({
    id: c.id,
    nome: c.nome,
    sobrenome: c.sobrenome,
    referencia: c.referencia,
  }));

  const firstName = (
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    ""
  ).split(/[\s@]/)[0];

  const semInadimplentes = (resumo?.clientes_inadimplentes ?? 0) === 0;

  const kpis = [
    {
      label: "A receber",
      valor: resumo ? formatBRL(resumo.a_receber) : "—",
      hint: "Saldo em aberto de todas as vendas",
      href: "/relatorios",
      destaque: "brand" as const,
    },
    {
      label: "Vendas ativas",
      valor: resumo ? String(resumo.vendas_ativas) : "—",
      hint: "Vendas ainda não quitadas",
      href: "/vendas",
      destaque: null,
    },
    {
      label: "Inadimplentes",
      valor: resumo ? String(resumo.clientes_inadimplentes) : "—",
      hint: semInadimplentes
        ? "Todos em dia ✓"
        : "Clientes com vencimento estourado",
      href: "/inadimplentes",
      destaque: semInadimplentes ? null : ("danger" as const),
    },
    {
      label: "Clientes",
      valor: resumo ? String(resumo.total_clientes) : "—",
      hint: "Total de clientes cadastrados",
      href: "/clientes",
      destaque: null,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Gerencie suas vendas e acompanhe seus recebimentos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, valor, hint, href, destaque }) => (
          <Link
            key={label}
            href={href}
            aria-label={`${label}: ${valor}. ${hint}`}
            className="focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
          >
            <Card
              className={cn(
                "hover:bg-muted/50 h-full transition-colors",
                destaque === "brand" && "border-primary/40",
                destaque === "danger" && "border-destructive/40",
              )}
            >
              <CardHeader>
                <CardDescription className="text-base">{label}</CardDescription>
                <CardTitle
                  className={cn(
                    "text-3xl",
                    destaque === "brand" && "text-primary",
                    destaque === "danger" && "text-destructive",
                  )}
                >
                  {valor}
                </CardTitle>
                <CardDescription>{hint}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <DashboardSearch clientes={clientes} />
    </div>
  );
}
