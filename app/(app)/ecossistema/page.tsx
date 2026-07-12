import {
  ArrowUpRight,
  Blocks,
  KeyRound,
  Landmark,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GAVETA_URL } from "@/lib/ecossistema";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { SwitcherToggle } from "./switcher-toggle";

export const metadata = { title: "Ecossistema" };

// Pontes dos estágios 2–5 da F6 — apresentadas desde já, entregues aos
// poucos. Toda ponte nasce DESLIGADA e terá liga/desliga próprio (opt-in).
const PONTES = [
  {
    titulo: "Marca única da loja",
    descricao:
      "O nome e a logo que você configurou valem nos dois apps, editáveis de qualquer um.",
    Icon: Store,
  },
  {
    titulo: "Clientes compartilhados",
    descricao: "O mesmo caderno de clientes no fiado e no caixa.",
    Icon: Users,
  },
  {
    titulo: "Fiado direto do caixa",
    descricao:
      "Venda \"a prazo\" no caixa do Gaveta já registrada aqui no FiadoApp.",
    Icon: ShoppingCart,
  },
  {
    titulo: "Recebimentos no financeiro",
    descricao:
      "O que você tem a receber no fiado aparece no resumo financeiro do Gaveta.",
    Icon: Landmark,
  },
] as const;

export default async function EcossistemaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: prefs } = await supabase
    .from("ecossistema_prefs")
    .select("switcher_ativo")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const switcherAtivo = Boolean(prefs?.switcher_ativo);

  return (
    <section className="minimal:max-sm:gap-4 flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="minimal:max-sm:text-xl text-3xl font-bold tracking-tight">
          Ecossistema
        </h1>
        <p className="minimal:max-sm:text-sm text-muted-foreground mt-1 text-lg">
          O FiadoApp faz parte de uma família de apps para o seu comércio.
          Usar os outros é opcional — este app sempre funciona completo
          sozinho.
        </p>
      </header>

      {/* ── GAVETA ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="minimal:max-sm:border-b minimal:max-sm:border-border/60 minimal:max-sm:pb-3">
          <CardTitle className="minimal:max-sm:text-base flex items-center gap-2 text-xl">
            <Blocks aria-hidden="true" className="text-primary size-5" />
            Gaveta — caixa e produtos
          </CardTitle>
          <CardDescription className="minimal:max-sm:text-sm text-base">
            Frente de caixa com leitor de código de barras, cadastro de
            produtos, controle de estoque e resumo financeiro do dia a dia.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="minimal:max-sm:text-sm text-muted-foreground flex items-start gap-2 text-base">
            <KeyRound
              aria-hidden="true"
              className="text-primary mt-0.5 size-4 shrink-0"
            />
            Sua conta já funciona lá: entre com o mesmo e-mail e a mesma
            senha do FiadoApp.
          </p>
          <a
            href={GAVETA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants(),
              "minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 self-start px-6 text-base font-medium",
            )}
          >
            Abrir o Gaveta
            <ArrowUpRight aria-hidden="true" className="size-5" />
          </a>
        </CardContent>
      </Card>

      {/* ── ATALHO (1º toggle real do ecossistema — opt-in) ────────── */}
      <Card>
        <CardHeader className="minimal:max-sm:border-b minimal:max-sm:border-border/60 minimal:max-sm:pb-3">
          <CardTitle className="minimal:max-sm:text-base text-xl">
            Atalho rápido no menu
          </CardTitle>
          <CardDescription className="minimal:max-sm:text-sm text-base">
            Mostra um botão para abrir o Gaveta no topo do app (computador) e
            no menu &quot;Mais&quot; (celular). Vale para a sua conta — aparece
            nos dois apps. Desativado por padrão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SwitcherToggle ativoInicial={switcherAtivo} />
        </CardContent>
      </Card>

      {/* ── PONTES FUTURAS ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="minimal:max-sm:border-b minimal:max-sm:border-border/60 minimal:max-sm:pb-3">
          <CardTitle className="minimal:max-sm:text-base text-xl">
            Pontes entre os apps
          </CardTitle>
          <CardDescription className="minimal:max-sm:text-sm text-base">
            Estamos preparando conexões opcionais entre o FiadoApp e o
            Gaveta. Cada uma terá o próprio botão de ligar e desligar — e
            nasce desligada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {PONTES.map(({ titulo, descricao, Icon }) => (
              <li key={titulo} className="flex items-start gap-3">
                <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="minimal:max-sm:text-sm flex flex-wrap items-center gap-2 text-base font-medium">
                    {titulo}
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                      Em breve
                    </span>
                  </p>
                  <p className="minimal:max-sm:text-xs text-muted-foreground text-sm">
                    {descricao}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
