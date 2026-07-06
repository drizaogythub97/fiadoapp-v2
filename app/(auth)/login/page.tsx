import { redirect } from "next/navigation";

import { BrandLockup } from "@/components/auth/brand-lockup";
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

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

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
        <LoginForm />
        <p className="text-muted-foreground text-center text-base">
          Já usa o Gaveta? Entre com a mesma conta.
        </p>
      </CardContent>
    </Card>
  );
}
