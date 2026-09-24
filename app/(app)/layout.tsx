import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app/app-nav";
import { AppSwitcher } from "@/components/app/app-switcher";
import { BottomNav } from "@/components/app/bottom-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { ModoChooser } from "@/components/app/modo-chooser";
import { Toaster } from "@/components/ui/sonner";
import { marcaDoUsuario } from "@/lib/marca";
import { createClient, obterUsuario } from "@/lib/supabase/server";
import { getUiModeFromCookie } from "@/lib/ui-mode/cookie";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await obterUsuario();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email;

  // As três não dependem uma da outra: vão JUNTAS. Em série, cada ida ao
  // banco é tempo que a pessoa espera com a tela em branco — e com a função
  // e o banco em continentes diferentes isso custava caro.
  //
  // - marca: a marca da loja (decisão F4d: profiles, só leitura).
  // - uiMode: modo de exibição do celular (cookie por aparelho). null =
  //   nunca escolheu, e aí renderiza a tela de escolha.
  // - ecoPrefs: atalho do ecossistema (opt-in), vale a conta nos dois apps.
  const [marca, uiMode, { data: ecoPrefs }] = await Promise.all([
    marcaDoUsuario(supabase, user.id),
    getUiModeFromCookie(),
    supabase
      .from("ecossistema_prefs")
      .select("switcher_ativo")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const mostrarSwitcher = Boolean(ecoPrefs?.switcher_ativo);

  return (
    <div className="flex min-h-screen flex-col">
      {/* No modo Minimalista (só mobile) o header encolhe, o Sair migra para
          o painel "Mais" da barra inferior e a nav do topo some. */}
      <header className="border-border bg-background border-b print:hidden">
        <div className="minimal:max-sm:h-12 mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link
            href="/dashboard"
            className="minimal:max-sm:text-lg text-foreground flex items-center gap-3 text-xl font-semibold tracking-tight"
          >
            {/* A logo pode vir do Storage do Supabase — <img> simples, como
                nos comprovantes (sem remotePatterns no next/image). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={marca.logoUrl}
              alt=""
              width={40}
              height={40}
              className="minimal:max-sm:size-8 size-10 rounded-md object-contain"
            />
            <span>{marca.nome}</span>
          </Link>
          <div className="minimal:max-sm:hidden flex items-center gap-2">
            <span
              className="text-muted-foreground hidden text-base sm:inline"
              aria-label="Usuário conectado"
            >
              {displayName}
            </span>
            {mostrarSwitcher ? <AppSwitcher /> : null}
            <LogoutButton />
          </div>
        </div>
        <AppNav />
      </header>
      <main className="minimal:max-sm:py-4 minimal:max-sm:pb-24 mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <BottomNav
        displayName={displayName ?? ""}
        mostrarSwitcher={mostrarSwitcher}
      />
      {uiMode === null ? <ModoChooser /> : null}
      <Toaster />
    </div>
  );
}
