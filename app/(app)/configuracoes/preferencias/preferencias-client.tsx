"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/format";
import type { ClienteComSaldo } from "@/lib/types/fiado";

import { salvarLimiteCliente, salvarLimitePadrao } from "./actions";
import { MarcaSection } from "./marca-section";

type Tema = "light" | "dark";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Valor inicial dos inputs de limite: número → "500.00"-like sem R$. */
const limiteParaInput = (v: number | null) => (v === null ? "" : String(v));

export function PreferenciasClient({
  temaInicial,
  limitePadraoInicial,
  clientes,
  marcaNome,
  logoUrl,
}: {
  temaInicial: Tema;
  limitePadraoInicial: number | null;
  clientes: ClienteComSaldo[];
  /** brand_name salvo (cru, "" quando não configurado) e URL da logo. */
  marcaNome: string;
  logoUrl: string | null;
}) {
  const [tema, setTema] = useState<Tema>(temaInicial);
  const [busca, setBusca] = useState("");
  const [salvandoPadrao, startPadrao] = useTransition();
  const limitePadraoRef = useRef<HTMLInputElement>(null);

  function trocarTema(novo: Tema) {
    setTema(novo);
    // Cookie legível pelo servidor (SSR) e pelo script anti-FOUC da F1.
    document.cookie = `fiado_theme=${novo}; path=/; max-age=31536000; samesite=lax`;
    const root = document.documentElement;
    root.classList.toggle("dark", novo === "dark");
    root.style.colorScheme = novo;
  }

  function submeterLimitePadrao(e: React.FormEvent) {
    e.preventDefault();
    const valor = limitePadraoRef.current?.value ?? "";
    startPadrao(async () => {
      const { error } = await salvarLimitePadrao(valor);
      if (error) toast.error(error);
      else toast.success("Limite padrão salvo.");
    });
  }

  const filtrados = useMemo(() => {
    const termo = norm(busca.trim());
    if (!termo) return clientes;
    return clientes.filter((c) =>
      norm(`${c.nome} ${c.sobrenome ?? ""} ${c.referencia ?? ""}`).includes(
        termo,
      ),
    );
  }, [clientes, busca]);

  return (
    <div className="flex flex-col gap-5">
      {/* ── TEMA ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tema do aplicativo</CardTitle>
          <CardDescription className="text-base">
            O FiadoApp é escuro por padrão. A escolha fica salva neste
            aparelho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tema">
            <Button
              type="button"
              variant={tema === "dark" ? "default" : "outline"}
              aria-pressed={tema === "dark"}
              onClick={() => trocarTema("dark")}
              className="h-12 px-5 text-base"
            >
              <Moon aria-hidden="true" className="size-5" />
              Escuro
            </Button>
            <Button
              type="button"
              variant={tema === "light" ? "default" : "outline"}
              aria-pressed={tema === "light"}
              onClick={() => trocarTema("light")}
              className="h-12 px-5 text-base"
            >
              <Sun aria-hidden="true" className="size-5" />
              Claro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── MARCA DA LOJA (recurso nativo do Fiado) ───────────────── */}
      <MarcaSection nomeInicial={marcaNome} logoUrlInicial={logoUrl} />

      {/* ── LIMITE PADRÃO ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Limite de crédito padrão</CardTitle>
          <CardDescription className="text-base">
            Vale para clientes sem limite próprio. Ao passar do limite o app
            só avisa — a venda nunca é bloqueada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={submeterLimitePadrao}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
              <Label htmlFor="limite-padrao" className="text-base">
                Limite padrão (R$)
              </Label>
              <Input
                ref={limitePadraoRef}
                id="limite-padrao"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Vazio = sem limite"
                defaultValue={limiteParaInput(limitePadraoInicial)}
                className="h-12 text-base"
              />
            </div>
            <Button
              type="submit"
              disabled={salvandoPadrao}
              className="h-12 px-6 text-base font-medium"
            >
              {salvandoPadrao ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── LIMITE POR CLIENTE ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Limite por cliente</CardTitle>
          <CardDescription className="text-base">
            O limite individual sobrepõe o padrão. O valor salva sozinho ao
            sair do campo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {clientes.length === 0 ? (
            <p className="text-muted-foreground text-base">
              Nenhum cliente cadastrado ainda.
            </p>
          ) : (
            <>
              <div className="relative sm:max-w-sm">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-1/2 left-3 size-5 -translate-y-1/2"
                />
                <Input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Filtrar cliente pelo nome…"
                  aria-label="Filtrar cliente pelo nome"
                  className="h-12 pl-10 text-base"
                />
              </div>

              {filtrados.length === 0 ? (
                <p className="text-muted-foreground text-base">
                  Nenhum cliente encontrado com esse nome.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {filtrados.map((c) => (
                    <LinhaLimiteCliente key={c.id} cliente={c} />
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LinhaLimiteCliente({ cliente }: { cliente: ClienteComSaldo }) {
  const [salvando, startSalvar] = useTransition();
  // Último valor persistido — evita re-salvar quando nada mudou no blur.
  const salvoRef = useRef(limiteParaInput(cliente.limite_credito));

  const nomeCompleto = cliente.sobrenome
    ? `${cliente.nome} ${cliente.sobrenome}`
    : cliente.nome;

  function salvar(valor: string) {
    if (valor.trim() === salvoRef.current.trim()) return;
    startSalvar(async () => {
      const { error } = await salvarLimiteCliente(cliente.id, valor);
      if (error) {
        toast.error(error);
      } else {
        salvoRef.current = valor;
        toast.success(`Limite de ${nomeCompleto} salvo.`);
      }
    });
  }

  return (
    <li className="ring-foreground/10 bg-card flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ring-1">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-base font-medium">
          {nomeCompleto}
          {cliente.referencia ? (
            <span className="text-muted-foreground ml-1.5 font-normal">
              ({cliente.referencia})
            </span>
          ) : null}
        </span>
        {cliente.saldo_devedor > 0 ? (
          <span className="bg-destructive/10 text-destructive inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold">
            Deve {formatBRL(cliente.saldo_devedor)}
          </span>
        ) : (
          <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300">
            Em dia
          </span>
        )}
      </div>
      <div className="flex w-36 flex-col gap-1">
        <Input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="Sem limite"
          defaultValue={limiteParaInput(cliente.limite_credito)}
          aria-label={`Limite de crédito de ${nomeCompleto}`}
          disabled={salvando}
          onBlur={(e) => salvar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="h-12 text-base"
        />
      </div>
    </li>
  );
}
