import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLockup } from "@/components/auth/brand-lockup";
import { ErrorAlert } from "@/components/auth/form-feedback";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  // O callback de e-mail (confirmação/recuperação) redireciona para cá com um
  // código fixo — nunca refletir texto vindo da URL.
  const { error } = await searchParams;
  const linkError =
    error === "link_invalido"
      ? "Não foi possível confirmar o link. Solicite um novo."
      : null;

  return (
    <Card className="p-6">
      <CardHeader className="items-center gap-4 text-center">
        <BrandLockup />
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription className="text-base">
            Acesse sua conta com e-mail e senha.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {linkError ? <ErrorAlert message={linkError} /> : null}
        <LoginForm />
        <div className="flex flex-col gap-1.5 text-center">
          <p className="text-muted-foreground text-base">
            Não tem uma conta?{" "}
            <Link
              href="/signup"
              className="text-primary font-medium underline underline-offset-4 hover:no-underline"
            >
              Criar conta
            </Link>
          </p>
          <p className="text-muted-foreground text-base">
            Já usa o Gaveta? Entre com a mesma conta.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
