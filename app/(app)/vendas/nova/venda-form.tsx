"use client";

import { AlertTriangle, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatBRL,
  formatTelefone,
  hojeISO,
  maskBRL,
  parseBRL,
  somarDias,
} from "@/lib/format";
import type { ClienteComSaldo } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";

import { registrarVenda } from "../actions";

type ItemRow = {
  key: number;
  quantidade: string;
  descricao: string;
  valorUnitario: string; // mascarado ("R$ 12,34")
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function nomeCompleto(c: { nome: string; sobrenome: string | null }): string {
  return c.sobrenome ? `${c.nome} ${c.sobrenome}` : c.nome;
}

let proximaKey = 1;
function novaLinha(): ItemRow {
  return { key: proximaKey++, quantidade: "", descricao: "", valorUnitario: "" };
}

export function VendaForm({
  clientes,
  sugestoesDescricao,
  clienteInicialId,
}: {
  clientes: ClienteComSaldo[];
  sugestoesDescricao: string[];
  clienteInicialId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // ── Cliente ────────────────────────────────────────────────────────────
  const clienteInicial =
    clientes.find((c) => c.id === clienteInicialId) ?? null;
  const [clienteSel, setClienteSel] = useState<ClienteComSaldo | null>(
    clienteInicial,
  );
  const [busca, setBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const buscaRef = useRef<HTMLDivElement>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoSobrenome, setNovoSobrenome] = useState("");
  const [novaReferencia, setNovaReferencia] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");

  const resultadosBusca = useMemo(() => {
    const q = norm(busca.trim());
    if (q.length < 2) return [];
    return clientes
      .filter((c) =>
        norm(`${c.nome} ${c.sobrenome ?? ""} ${c.referencia ?? ""}`).includes(
          q,
        ),
      )
      .slice(0, 6);
  }, [clientes, busca]);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (!buscaRef.current?.contains(e.target as Node)) setBuscaAberta(false);
    }
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, []);

  // ── Datas (paridade v1: mudar a compra recalcula vencimento +30d) ─────
  const [dataCompra, setDataCompra] = useState(() => hojeISO());
  const [dataVencimento, setDataVencimento] = useState(() =>
    somarDias(hojeISO(), 30),
  );

  function mudarDataCompra(nova: string) {
    setDataCompra(nova);
    if (nova) setDataVencimento(somarDias(nova, 30));
  }

  // ── Itens ──────────────────────────────────────────────────────────────
  const [itens, setItens] = useState<ItemRow[]>(() => [novaLinha()]);
  const [observacao, setObservacao] = useState("");

  function atualizarItem(key: number, patch: Partial<ItemRow>) {
    setItens((atual) =>
      atual.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    );
  }

  const totalGeral = useMemo(
    () =>
      itens.reduce(
        (soma, i) =>
          soma + (parseInt(i.quantidade, 10) || 0) * parseBRL(i.valorUnitario),
        0,
      ),
    [itens],
  );

  // ── Alerta de limite (decisão F2: SÓ avisa, nunca bloqueia) ────────────
  // limite_efetivo = individual ou, na falta dele, o padrão das preferências.
  const alertaLimite =
    clienteSel &&
    clienteSel.limite_efetivo !== null &&
    clienteSel.saldo_devedor + totalGeral > clienteSel.limite_efetivo
      ? clienteSel
      : null;

  // ── Submit ─────────────────────────────────────────────────────────────
  function salvar() {
    setErro(null);

    if (!clienteSel && !novoNome.trim()) {
      setErro(
        "Escolha um cliente já cadastrado ou preencha o nome do cliente novo.",
      );
      return;
    }

    // Linhas totalmente vazias são ignoradas; parcialmente preenchidas
    // seguem para a validação apontar o que falta.
    const preenchidos = itens.filter(
      (i) => i.quantidade.trim() || i.descricao.trim() || i.valorUnitario.trim(),
    );
    if (preenchidos.length === 0) {
      setErro("Adicione pelo menos um produto.");
      return;
    }
    for (const i of preenchidos) {
      if (!i.descricao.trim()) {
        setErro("Informe a descrição de todos os produtos.");
        return;
      }
      if (!(parseInt(i.quantidade, 10) >= 1)) {
        setErro(`Informe a quantidade de "${i.descricao.trim()}".`);
        return;
      }
      if (parseBRL(i.valorUnitario) <= 0) {
        setErro(`Informe o valor de "${i.descricao.trim()}".`);
        return;
      }
    }
    if (!dataCompra) {
      setErro("Informe a data da compra.");
      return;
    }

    const payload = {
      clienteId: clienteSel ? clienteSel.id : null,
      clienteNovo: clienteSel
        ? null
        : {
            nome: novoNome,
            sobrenome: novoSobrenome,
            referencia: novaReferencia,
            telefone: novoTelefone,
          },
      dataCompra,
      dataVencimento: dataVencimento || null,
      observacao,
      itens: preenchidos.map((i) => ({
        descricao: i.descricao,
        quantidade: parseInt(i.quantidade, 10),
        valorUnitario: parseBRL(i.valorUnitario),
      })),
    };

    startTransition(async () => {
      const result = await registrarVenda(payload);
      if (!result.ok) {
        setErro(result.error);
        return;
      }
      toast.success("Venda registrada com sucesso!");
      router.push(
        result.clienteId ? `/clientes/${result.clienteId}` : "/vendas",
      );
    });
  }

  return (
    <form
      className="minimal:max-sm:gap-5 flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
    >
      {erro ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-base"
        >
          {erro}
        </p>
      ) : null}

      {/* ── CLIENTE ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="minimal:max-sm:text-lg text-xl font-semibold tracking-tight">Cliente</h2>

        {clienteSel ? (
          <div className="ring-foreground/10 bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 ring-1">
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold">
                {nomeCompleto(clienteSel)}
                {clienteSel.referencia ? (
                  <span className="text-muted-foreground ml-2 text-base font-normal">
                    ({clienteSel.referencia})
                  </span>
                ) : null}
              </span>
              <span className="minimal:max-sm:text-sm text-muted-foreground text-base">
                {clienteSel.telefone
                  ? `${formatTelefone(clienteSel.telefone)} · `
                  : ""}
                {clienteSel.saldo_devedor > 0
                  ? `Deve ${formatBRL(clienteSel.saldo_devedor)}`
                  : "Sem dívida"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setClienteSel(null);
                setBusca("");
              }}
              className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-11 px-4 text-base"
            >
              <X aria-hidden="true" className="size-4" />
              Trocar cliente
            </Button>
          </div>
        ) : (
          <>
            <div ref={buscaRef} className="relative max-w-xl">
              <Label
                htmlFor="cliente-busca"
                className="mb-2 block text-base font-medium"
              >
                Buscar cliente já cadastrado
              </Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2"
                />
                <Input
                  id="cliente-busca"
                  type="search"
                  role="combobox"
                  aria-expanded={buscaAberta && resultadosBusca.length > 0}
                  aria-controls="cliente-busca-resultados"
                  autoComplete="off"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setBuscaAberta(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setBuscaAberta(false);
                  }}
                  placeholder="Digite o nome ou referência…"
                  className="minimal:max-sm:h-11 minimal:max-sm:pl-10 minimal:max-sm:text-sm h-13 pl-12 text-base"
                />
              </div>
              {buscaAberta && resultadosBusca.length > 0 ? (
                <ul
                  id="cliente-busca-resultados"
                  className="border-border bg-card absolute z-10 mt-2 w-full overflow-hidden rounded-xl border shadow-lg"
                >
                  {resultadosBusca.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setClienteSel(c);
                          setBuscaAberta(false);
                        }}
                        className="minimal:max-sm:h-11 minimal:max-sm:text-sm hover:bg-muted focus-visible:bg-muted flex h-12 w-full items-center gap-2 px-4 text-left text-base outline-none"
                      >
                        <span className="font-medium">{nomeCompleto(c)}</span>
                        {c.referencia ? (
                          <span className="text-muted-foreground text-sm">
                            ({c.referencia})
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <p className="minimal:max-sm:text-sm text-muted-foreground text-base">
              Cliente novo? Preencha os dados abaixo:
            </p>

            <div className="grid max-w-xl gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="novo-nome" className="text-base">
                  Nome <span aria-hidden="true">*</span>
                </Label>
                <Input
                  id="novo-nome"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="novo-sobrenome" className="text-base">
                  Sobrenome
                </Label>
                <Input
                  id="novo-sobrenome"
                  value={novoSobrenome}
                  onChange={(e) => setNovoSobrenome(e.target.value)}
                  placeholder="Sobrenome (opcional)"
                  className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nova-referencia" className="text-base">
                  Referência
                </Label>
                <Input
                  id="nova-referencia"
                  value={novaReferencia}
                  onChange={(e) => setNovaReferencia(e.target.value)}
                  placeholder="ex.: Filho da Maria, Loja"
                  className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="novo-telefone" className="text-base">
                  Telefone
                </Label>
                <Input
                  id="novo-telefone"
                  type="tel"
                  inputMode="tel"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  placeholder="(11) 91234-5678"
                  className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
                />
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── DATAS ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="minimal:max-sm:text-lg text-xl font-semibold tracking-tight">Datas</h2>
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="data-compra" className="text-base">
              Data da compra <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="data-compra"
              type="date"
              required
              value={dataCompra}
              onChange={(e) => mudarDataCompra(e.target.value)}
              className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="data-vencimento" className="text-base">
              Data de vencimento
            </Label>
            <Input
              id="data-vencimento"
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
            />
            <p className="text-muted-foreground text-sm">
              Preenchida sozinha com 30 dias após a compra. Apague para deixar
              sem vencimento.
            </p>
          </div>
        </div>
      </section>

      {/* ── PRODUTOS ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="minimal:max-sm:text-lg text-xl font-semibold tracking-tight">Produtos</h2>

        <ul className="flex flex-col gap-3">
          {itens.map((item, idx) => (
            <li
              key={item.key}
              className="ring-foreground/10 bg-card rounded-xl p-4 ring-1"
            >
              {/* Mobile: grid com spans fixos (linha 1 = Qtd+Descrição,
                  linha 2 = Valor+remover) — flex-wrap quebrava conforme a
                  largura intrínseca dos inputs. Desktop: flex como antes. */}
              <div className="grid grid-cols-6 items-end gap-3 sm:flex sm:flex-wrap">
                <div className="col-span-2 flex flex-col gap-2 sm:w-24">
                  <Label htmlFor={`item-${item.key}-qtd`} className="text-base">
                    Qtd <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id={`item-${item.key}-qtd`}
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    placeholder="0"
                    value={item.quantidade}
                    onChange={(e) =>
                      atualizarItem(item.key, { quantidade: e.target.value })
                    }
                    className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
                  />
                </div>

                <CampoDescricao
                  id={`item-${item.key}-descricao`}
                  value={item.descricao}
                  onChange={(v) => atualizarItem(item.key, { descricao: v })}
                  sugestoes={sugestoesDescricao}
                />

                <div className="col-span-4 flex min-w-0 flex-col gap-2 sm:w-36">
                  <Label
                    htmlFor={`item-${item.key}-valor`}
                    className="text-base"
                  >
                    Valor unit. <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id={`item-${item.key}-valor`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="R$ 0,00"
                    value={item.valorUnitario}
                    onChange={(e) =>
                      atualizarItem(item.key, {
                        valorUnitario: maskBRL(e.target.value),
                      })
                    }
                    onFocus={(e) => e.target.select()}
                    className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setItens((atual) =>
                      atual.length > 1
                        ? atual.filter((i) => i.key !== item.key)
                        : [novaLinha()],
                    )
                  }
                  aria-label={`Remover produto ${idx + 1}`}
                  className="text-destructive col-span-2 h-12 w-12 justify-self-end px-0"
                >
                  <X aria-hidden="true" className="size-5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          onClick={() => setItens((atual) => [...atual, novaLinha()])}
          className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 self-start px-5 text-base"
        >
          <Plus aria-hidden="true" className="size-5" />
          Adicionar produto
        </Button>

        <p
          aria-live="polite"
          className="bg-primary/10 text-foreground rounded-xl px-4 py-3 text-lg font-semibold"
        >
          Total geral:{" "}
          <span className="text-primary">{formatBRL(totalGeral)}</span>
        </p>

        {alertaLimite ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl bg-amber-100 px-4 py-3 text-base text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"
          >
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0"
            />
            <span>
              Com esta venda, {alertaLimite.nome} passa do limite de crédito de{" "}
              <strong>{formatBRL(alertaLimite.limite_efetivo ?? 0)}</strong>. O
              app só avisa — a venda não é bloqueada.
            </span>
          </p>
        ) : null}
      </section>

      {/* ── OBSERVAÇÃO ──────────────────────────────────────────────── */}
      <section className="flex max-w-xl flex-col gap-2">
        <Label htmlFor="observacao" className="text-base">
          Observação{" "}
          <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Textarea
          id="observacao"
          rows={3}
          maxLength={500}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="ex.: Entregue em casa, combinou pagar na sexta…"
        />
      </section>

      {/* ── AÇÕES ───────────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Link
          href={clienteInicialId ? `/clientes/${clienteInicialId}` : "/vendas"}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "minimal:max-sm:h-11 minimal:max-sm:text-sm h-13 px-6 text-base",
          )}
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="minimal:max-sm:h-11 minimal:max-sm:text-base h-13 px-8 text-lg font-medium"
        >
          {pending ? "Salvando…" : "Salvar venda"}
        </Button>
      </div>
    </form>
  );
}

/** Descrição do produto com sugestões dos itens já vendidos (paridade v1). */
function CampoDescricao({
  id,
  value,
  onChange,
  sugestoes,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  sugestoes: string[];
}) {
  const [aberto, setAberto] = useState(false);

  const resultados = useMemo(() => {
    const q = norm(value.trim());
    if (!q) return [];
    return sugestoes.filter((s) => norm(s).includes(q)).slice(0, 8);
  }, [sugestoes, value]);

  const mostrar =
    aberto && resultados.length > 0 && resultados[0] !== value.trim();

  return (
    <div className="relative col-span-4 flex min-w-0 flex-col gap-2 sm:min-w-48 sm:flex-1">
      <Label htmlFor={id} className="text-base">
        Descrição <span aria-hidden="true">*</span>
      </Label>
      <Input
        id={id}
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={`${id}-sugestoes`}
        placeholder="ex.: Ração 15kg"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setAberto(false);
        }}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
      />
      {mostrar ? (
        <ul
          id={`${id}-sugestoes`}
          className="border-border bg-card absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border shadow-lg"
        >
          {resultados.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // não perder o foco antes do clique
                  onChange(s);
                  setAberto(false);
                }}
                className="hover:bg-muted focus-visible:bg-muted flex h-11 w-full items-center px-4 text-left text-base outline-none"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
