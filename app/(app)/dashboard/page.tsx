import { Clock, Plus, UserPlus } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { EcossistemaAnuncio } from "@/components/app/ecossistema-anuncio";
import { buttonVariants } from "@/components/ui/button";
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
  // Anúncio único do ecossistema: o servidor nem renderiza depois de
  // dispensado (cookie), então não há flash no carregamento.
  const mostrarAnuncio = !(await cookies()).get("fiado_ecossistema_anuncio");
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
    <div className="minimal:max-sm:gap-5 flex flex-col gap-8">
      <div>
        <h1 className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
          Olá{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="minimal:max-sm:text-sm text-muted-foreground mt-1 text-lg">
          Gerencie suas vendas e acompanhe seus recebimentos.
        </p>
      </div>

      {/* Busca antes dos KPIs (pedido do dono, 2026-07-11): achar o cliente
          é a ação nº 1 do dia a dia. */}
      <DashboardSearch clientes={clientes} />

      {/* Minimalista (mobile): KPIs em grade 2×2 compacta, sem o texto de
          apoio — mais informação na primeira dobra. */}
      <div className="minimal:max-sm:grid-cols-2 minimal:max-sm:gap-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, valor, hint, href, destaque }) => (
          <Link
            key={label}
            href={href}
            aria-label={`${label}: ${valor}. ${hint}`}
            className="focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
          >
            <Card
              className={cn(
                "minimal:max-sm:[--card-spacing:--spacing(3)] hover:bg-muted/50 h-full transition-colors",
                destaque === "brand" && "border-primary/40",
                destaque === "danger" && "border-destructive/40",
              )}
            >
              <CardHeader>
                <CardDescription className="minimal:max-sm:text-sm text-base">
                  {label}
                </CardDescription>
                <CardTitle
                  className={cn(
                    "minimal:max-sm:text-xl text-3xl",
                    destaque === "brand" && "text-primary",
                    destaque === "danger" && "text-destructive",
                  )}
                >
                  {valor}
                </CardTitle>
                <CardDescription className="minimal:max-sm:hidden">
                  {hint}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Atalhos rápidos (pedido do dono, 2026-07-11). */}
      <section className="flex flex-col gap-3 minimal:max-sm:gap-2">
        <h2 className="minimal:max-sm:text-lg text-xl font-semibold tracking-tight">
          Atalhos rápidos
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/vendas/nova"
            className={cn(
              buttonVariants(),
              "minimal:max-sm:h-11 minimal:max-sm:text-sm h-13 flex-1 px-4 text-base font-medium sm:flex-initial sm:px-6",
            )}
          >
            <Plus aria-hidden="true" className="size-5" />
            Nova venda
          </Link>
          <Link
            href="/clientes/novo"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "minimal:max-sm:h-11 minimal:max-sm:text-sm h-13 flex-1 px-4 text-base font-medium sm:flex-initial sm:px-6",
            )}
          >
            <UserPlus aria-hidden="true" className="size-5" />
            Novo cliente
          </Link>
          <Link
            href="/inadimplentes"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "minimal:max-sm:h-11 minimal:max-sm:text-sm h-13 flex-1 px-4 text-base font-medium sm:flex-initial sm:px-6",
            )}
          >
            <Clock aria-hidden="true" className="size-5" />
            Cobrar atrasados
          </Link>
        </div>
      </section>

      {/* Anúncio único do ecossistema (F6): some para sempre ao dispensar. */}
      {mostrarAnuncio ? <EcossistemaAnuncio /> : null}
    </div>
  );
}
