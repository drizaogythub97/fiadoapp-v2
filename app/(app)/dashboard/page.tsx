import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Painel",
};

// F1: casca do painel para validar login, navegação e direção visual.
// Os KPIs reais (a receber, vendas ativas, inadimplentes, clientes) chegam
// na fase F4a, depois do modelo de dados (F2) e da migração (F3).
const KPIS = [
  { label: "A receber", hint: "Total em aberto de todas as vendas" },
  { label: "Vendas ativas", hint: "Vendas ainda não quitadas" },
  { label: "Inadimplentes", hint: "Clientes com vencimento estourado" },
  { label: "Clientes", hint: "Total de clientes cadastrados" },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = (
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    ""
  ).split(/[\s@]/)[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">
          Bem-vindo ao novo FiadoApp. Seus dados serão migrados em breve.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map(({ label, hint }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription className="text-base">{label}</CardDescription>
              <CardTitle className="text-muted-foreground text-3xl">
                —
              </CardTitle>
              <CardDescription>{hint}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <p className="text-muted-foreground text-base">
        Esta é a fundação do FiadoApp v2 (Fase 1): entrada com a sua conta,
        navegação e identidade visual. As telas de clientes, vendas,
        inadimplentes e relatórios serão ativadas nas próximas fases.
      </p>
    </div>
  );
}
