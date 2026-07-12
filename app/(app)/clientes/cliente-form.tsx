"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { ClienteFormState } from "./actions";

type CampoNome = keyof NonNullable<ClienteFormState["fieldErrors"]>;

type Props = {
  action: (
    prev: ClienteFormState,
    formData: FormData,
  ) => Promise<ClienteFormState>;
  initialValues?: {
    nome?: string;
    sobrenome?: string;
    referencia?: string;
    telefone?: string;
    limiteCredito?: string;
  };
  submitLabel: string;
};

export function ClienteForm({ action, initialValues, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<
    ClienteFormState,
    FormData
  >(action, {});

  const valores = state.values ?? initialValues ?? {};

  function campo(nome: CampoNome) {
    const erro = state.fieldErrors?.[nome];
    return {
      erro,
      inputProps: {
        "aria-invalid": erro ? true : undefined,
        "aria-describedby": erro ? `${nome}-erro` : undefined,
        defaultValue: valores[nome] ?? "",
        className: "minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base",
      },
    };
  }

  const nome = campo("nome");
  const sobrenome = campo("sobrenome");
  const referencia = campo("referencia");
  const telefone = campo("telefone");
  const limite = campo("limiteCredito");

  return (
    // key: remonta os campos quando o servidor devolve valores (submit com
    // erro) — evita trocar defaultValue de inputs não controlados (Base UI).
    <form
      key={state.values ? "com-retorno" : "inicial"}
      action={formAction}
      className="flex max-w-xl flex-col gap-5"
    >
      {state.error ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-base"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome" className="text-base">
          Nome <span aria-hidden="true">*</span>
        </Label>
        <Input id="nome" name="nome" required autoFocus {...nome.inputProps} />
        {nome.erro ? <CampoErro id="nome-erro">{nome.erro}</CampoErro> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sobrenome" className="text-base">
          Sobrenome
        </Label>
        <Input id="sobrenome" name="sobrenome" {...sobrenome.inputProps} />
        {sobrenome.erro ? (
          <CampoErro id="sobrenome-erro">{sobrenome.erro}</CampoErro>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="referencia" className="text-base">
          Referência
        </Label>
        <Input
          id="referencia"
          name="referencia"
          placeholder="ex.: Filho da Maria, Loja"
          {...referencia.inputProps}
        />
        <p className="text-muted-foreground text-sm">
          Ajuda a diferenciar clientes com o mesmo nome.
        </p>
        {referencia.erro ? (
          <CampoErro id="referencia-erro">{referencia.erro}</CampoErro>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="telefone" className="text-base">
          Telefone
        </Label>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          placeholder="(11) 91234-5678"
          {...telefone.inputProps}
        />
        {telefone.erro ? (
          <CampoErro id="telefone-erro">{telefone.erro}</CampoErro>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="limiteCredito" className="text-base">
          Limite de crédito
        </Label>
        <Input
          id="limiteCredito"
          name="limiteCredito"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="R$"
          {...limite.inputProps}
        />
        <p className="text-muted-foreground text-sm">
          Deixe vazio para não ter limite. Ao passar do limite o app só avisa —
          a venda nunca é bloqueada.
        </p>
        {limite.erro ? (
          <CampoErro id="limiteCredito-erro">{limite.erro}</CampoErro>
        ) : null}
      </div>

      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row">
        <Link
          href="/clientes"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 px-6 text-base",
          )}
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-12 px-6 text-base font-medium"
        >
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function CampoErro({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {children}
    </p>
  );
}
