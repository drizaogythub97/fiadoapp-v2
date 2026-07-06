import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app/app-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border bg-background border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link
            href="/dashboard"
            className="text-foreground flex items-center gap-3 text-xl font-semibold tracking-tight"
          >
            <Image
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              className="size-10 object-contain"
            />
            <span>FiadoApp</span>
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="text-muted-foreground hidden text-base sm:inline"
              aria-label="Usuário conectado"
            >
              {displayName}
            </span>
            <LogoutButton />
          </div>
        </div>
        <AppNav />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
