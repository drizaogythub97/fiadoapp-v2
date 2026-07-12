"use client";

import { LayoutGrid, Moon, Search, Smartphone, Sun, X } from "lucide-react";
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
// Mesmo valor de lib/ui-mode/cookie.ts (não importável aqui: next/headers).
type ModoUi = "simples" | "minimalista";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Valor inicial dos inputs de limite: número → "500.00"-like sem R$. */
const limiteParaInput = (v: number | null) => (v === null ? "" : String(v));

export function PreferenciasClient({
  temaInicial,
  modoUiInicial,
  limitePadraoInicial,
  clientes,
  marcaNome,
  logoUrl,
}: {
  temaInicial: Tema;
  /** null = nunca escolheu (o padrão efetivo é "simples"). */
  modoUiInicial: ModoUi | null;
  limitePadraoInicial: number | null;
  clientes: ClienteComSaldo[];
  /** brand_name salvo (cru, "" quando não configurado) e URL da logo. */
  marcaNome: string;
  logoUrl: string | null;
}) {
  const [tema, setTema] = useState<Tema>(temaInicial);
  const [modoUi, setModoUi] = useState<ModoUi>(modoUiInicial ?? "simples");
  const [busca, setBusca] = useState("");
  const [clienteLimite, setClienteLimite] = useState<ClienteComSaldo | null>(
    null,
  );
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

  function trocarModoUi(novo: ModoUi) {
    setModoUi(novo);
    // Escolha por aparelho, como o tema. O atributo aplica na hora (variant
    // `minimal` do CSS); o cookie mantém no SSR das próximas navegações.
    document.cookie = `fiado_ui_mode=${novo}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.setAttribute("data-ui-mode", novo);
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
            O FiadoApp é escuro por padrão. A escolha fica salva neste aparelho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tema">
            <Button
              type="button"
              variant={tema === "dark" ? "default" : "outline"}
              aria-pressed={tema === "dark"}
              onClick={() => trocarTema("dark")}
              className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
            >
              <Moon aria-hidden="true" className="size-5" />
              Escuro
            </Button>
            <Button
              type="button"
              variant={tema === "light" ? "default" : "outline"}
              aria-pressed={tema === "light"}
              onClick={() => trocarTema("light")}
              className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
            >
              <Sun aria-hidden="true" className="size-5" />
              Claro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── MODO DE EXIBIÇÃO DO CELULAR ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Modo de exibição no celular</CardTitle>
          <CardDescription className="text-base">
            Vale só neste aparelho e não muda nada no computador. Simples:
            botões grandes e menu sempre visível. Minimalista: visual compacto
            com barra de navegação embaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Modo de exibição no celular"
          >
            <Button
              type="button"
              variant={modoUi === "simples" ? "default" : "outline"}
              aria-pressed={modoUi === "simples"}
              onClick={() => trocarModoUi("simples")}
              className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
            >
              <LayoutGrid aria-hidden="true" className="size-5" />
              Simples
            </Button>
            <Button
              type="button"
              variant={modoUi === "minimalista" ? "default" : "outline"}
              aria-pressed={modoUi === "minimalista"}
              onClick={() => trocarModoUi("minimalista")}
              className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
            >
              <Smartphone aria-hidden="true" className="size-5" />
              Minimalista
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
            Vale para clientes sem limite próprio. Ao passar do limite o app só
            avisa — a venda nunca é bloqueada.
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
                className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
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
            O limite individual sobrepõe o padrão. O valor salva sozinho ao sair
            do campo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {clientes.length === 0 ? (
            <p className="minimal:max-sm:text-sm text-muted-foreground text-base">
              Nenhum cliente cadastrado ainda.
            </p>
          ) : (
            <>
              {/* Busca com dropdown (pedido do dono, 2026-07-11): nada de
                  listar todos os clientes na página. */}
              <div className="relative sm:max-w-sm">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-1/2 left-3 size-5 -translate-y-1/2"
                />
                <Input
                  type="search"
                  role="combobox"
                  aria-expanded={busca.trim().length > 0}
                  aria-controls="limite-busca-resultados"
                  autoComplete="off"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar cliente pelo nome…"
                  aria-label="Buscar cliente pelo nome"
                  className="h-12 pl-10 text-base"
                />
                {busca.trim().length > 0 ? (
                  <ul
                    id="limite-busca-resultados"
                    className="border-border bg-card absolute z-10 mt-2 w-full overflow-hidden rounded-xl border shadow-lg"
                  >
                    {filtrados.length === 0 ? (
                      <li className="text-muted-foreground px-4 py-3 text-base">
                        Nenhum cliente encontrado.
                      </li>
                    ) : (
                      filtrados.slice(0, 6).map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setClienteLimite(c);
                              setBusca("");
                            }}
                            className="hover:bg-muted focus-visible:bg-muted flex h-12 w-full items-center gap-2 px-4 text-left text-base outline-none"
                          >
                            <span className="font-medium">
                              {c.sobrenome ? `${c.nome} ${c.sobrenome}` : c.nome}
                            </span>
                            {c.referencia ? (
                              <span className="text-muted-foreground text-sm">
                                ({c.referencia})
                              </span>
                            ) : null}
                            {c.limite_credito !== null ? (
                              <span className="text-muted-foreground ml-auto text-sm">
                                Limite: {formatBRL(c.limite_credito)}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </div>

              {clienteLimite ? (
                <LinhaLimiteCliente
                  key={clienteLimite.id}
                  cliente={clienteLimite}
                  onFechar={() => setClienteLimite(null)}
                />
              ) : (
                <p className="minimal:max-sm:text-sm text-muted-foreground text-base">
                  Busque um cliente para ver e ajustar o limite dele.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LinhaLimiteCliente({
  cliente,
  onFechar,
}: {
  cliente: ClienteComSaldo;
  onFechar: () => void;
}) {
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
    <div className="ring-foreground/10 bg-card flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ring-1">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-base font-medium">
          {nomeCompleto}
          {cliente.referencia ? (
            <span className="text-muted-foreground ml-1.5 font-normal">
              ({cliente.referencia})
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground text-sm">
          {cliente.limite_credito !== null
            ? `Limite atual: ${formatBRL(cliente.limite_credito)}`
            : "Sem limite próprio (vale o padrão)"}
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
          className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
        />
      </div>
      <button
        type="button"
        onClick={onFechar}
        aria-label={`Fechar ajuste de limite de ${nomeCompleto}`}
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg"
      >
        <X aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
