"use client";

import {
  AlertTriangle,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, formatTelefone } from "@/lib/format";
import type { ClienteComSaldo } from "@/lib/types/fiado";
import { cn } from "@/lib/utils";

import { excluirCliente } from "./actions";

const LETRAS = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
);

type Situacao = "todos" | "devedor" | "ok";

const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "devedor", rotulo: "Com débito" },
  { valor: "ok", rotulo: "Sem débito" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function nomeCompleto(c: {
  nome: string;
  sobrenome: string | null;
}): string {
  return c.sobrenome ? `${c.nome} ${c.sobrenome}` : c.nome;
}

export function ClientesClient({
  clientes,
  buscaInicial,
}: {
  clientes: ClienteComSaldo[];
  buscaInicial: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(buscaInicial);
  const [letra, setLetra] = useState<string | null>(null);
  const [situacao, setSituacao] = useState<Situacao>("todos");
  const [excluindo, setExcluindo] = useState<ClienteComSaldo | null>(null);
  const [pending, startTransition] = useTransition();

  const filtrados = useMemo(() => {
    let lista = clientes;
    if (letra) {
      lista = lista.filter((c) => norm(c.nome).startsWith(norm(letra)));
    }
    const termo = norm(busca.trim());
    if (termo) {
      lista = lista.filter((c) =>
        norm(`${c.nome} ${c.sobrenome ?? ""} ${c.referencia ?? ""}`).includes(
          termo,
        ),
      );
    }
    if (situacao === "devedor")
      lista = lista.filter((c) => c.saldo_devedor > 0);
    if (situacao === "ok") lista = lista.filter((c) => c.saldo_devedor <= 0);
    return lista;
  }, [clientes, letra, busca, situacao]);

  function confirmarExclusao() {
    if (!excluindo) return;
    const alvo = excluindo;
    startTransition(async () => {
      const result = await excluirCliente(alvo.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Cliente ${nomeCompleto(alvo)} excluído.`);
        setExcluindo(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <Input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, sobrenome ou referência…"
          aria-label="Buscar cliente"
          className="h-13 pl-12 text-base"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-muted-foreground text-sm font-medium">
          Filtrar por situação
        </legend>
        <div className="flex flex-wrap gap-2">
          {SITUACOES.map(({ valor, rotulo }) => (
            <Button
              key={valor}
              type="button"
              variant={situacao === valor ? "default" : "outline"}
              aria-pressed={situacao === valor}
              onClick={() => setSituacao(valor)}
              className="h-11 flex-1 px-4 text-base sm:flex-initial"
            >
              {rotulo}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-muted-foreground text-sm font-medium">
          Pesquise pela inicial do nome
        </legend>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant={letra === null ? "default" : "outline"}
            aria-pressed={letra === null}
            onClick={() => setLetra(null)}
            className="h-11 px-3 text-base"
          >
            Todos
          </Button>
          {LETRAS.map((l) => (
            <Button
              key={l}
              type="button"
              variant={letra === l ? "default" : "outline"}
              aria-pressed={letra === l}
              onClick={() => setLetra(letra === l ? null : l)}
              aria-label={`Clientes com a letra ${l}`}
              className="h-11 min-w-11 px-0 text-base"
            >
              {l}
            </Button>
          ))}
        </div>
      </fieldset>

      <p aria-live="polite" className="text-muted-foreground text-base">
        {filtrados.length === 0
          ? null
          : filtrados.length === 1
            ? "1 cliente encontrado"
            : `${filtrados.length} clientes encontrados`}
      </p>

      {filtrados.length === 0 ? (
        <EmptyState
          temClientes={clientes.length > 0}
          busca={busca}
          letra={letra}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtrados.map((c) => (
            <li
              key={c.id}
              className="ring-foreground/10 bg-card flex flex-col gap-3 rounded-xl p-4 ring-1"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-foreground text-xl font-semibold">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="hover:text-primary underline-offset-4 hover:underline"
                  >
                    {nomeCompleto(c)}
                  </Link>
                  {c.referencia ? (
                    <span className="text-muted-foreground ml-2 text-base font-normal">
                      ({c.referencia})
                    </span>
                  ) : null}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {c.acima_limite ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"
                      aria-label={`Acima do limite de crédito de ${formatBRL(c.limite_efetivo ?? 0)}`}
                    >
                      <AlertTriangle aria-hidden="true" className="size-4" />
                      Acima do limite
                    </span>
                  ) : null}
                  {c.saldo_devedor > 0 ? (
                    <span className="bg-destructive/10 text-destructive inline-flex rounded-full px-3 py-1 text-sm font-semibold">
                      Deve {formatBRL(c.saldo_devedor)}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300">
                      Sem dívida
                    </span>
                  )}
                </div>
              </div>

              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
                <span>
                  Ativas:{" "}
                  <strong className="text-foreground">{c.total_ativas}</strong>
                </span>
                <span>
                  Pagas:{" "}
                  <strong className="text-foreground">{c.total_pagas}</strong>
                </span>
                {c.telefone ? <span>{formatTelefone(c.telefone)}</span> : null}
              </div>

              {/* Mobile: 3 botões em terços iguais (o wrap deixava 2+1
                  assimétrico). Desktop: largura natural. */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/clientes/${c.id}`}
                  className={cn(
                    buttonVariants(),
                    "h-12 flex-1 px-2 text-base sm:flex-initial sm:px-4",
                  )}
                  aria-label={`Detalhar ${nomeCompleto(c)}`}
                >
                  <Receipt aria-hidden="true" className="size-4" />
                  Detalhar
                </Link>
                <Link
                  href={`/clientes/${c.id}/editar`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-12 flex-1 px-2 text-base sm:flex-initial sm:px-4",
                  )}
                  aria-label={`Editar ${nomeCompleto(c)}`}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Editar
                </Link>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setExcluindo(c)}
                  aria-label={`Excluir ${nomeCompleto(c)}`}
                  className="h-12 flex-1 px-2 text-base sm:flex-initial sm:px-4"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => {
          if (!pending) setExcluindo(null);
        }}
        title="Excluir cliente"
        description={
          excluindo ? (
            <>
              Tem certeza que deseja excluir{" "}
              <strong className="text-foreground">
                {nomeCompleto(excluindo)}
              </strong>
              ?
              <br />
              <span className="text-destructive">
                Todas as vendas e pagamentos deste cliente serão excluídos
                permanentemente.
              </span>
            </>
          ) : null
        }
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onConfirm={confirmarExclusao}
        pending={pending}
      />
    </div>
  );
}

function EmptyState({
  temClientes,
  busca,
  letra,
}: {
  temClientes: boolean;
  busca: string;
  letra: string | null;
}) {
  const mensagem = !temClientes
    ? "Nenhum cliente cadastrado ainda."
    : busca.trim()
      ? `Nenhum cliente encontrado para "${busca.trim()}".`
      : letra
        ? `Nenhum cliente com a letra ${letra}.`
        : "Nenhum cliente nesta situação.";

  return (
    <div className="bg-muted/40 flex flex-col items-center gap-3 rounded-xl p-10 text-center">
      <Users aria-hidden="true" className="text-muted-foreground size-10" />
      <p className="text-lg font-medium">{mensagem}</p>
      {!temClientes ? (
        <Link
          href="/clientes/novo"
          className={cn(buttonVariants(), "mt-2 h-13 px-6 text-lg font-medium")}
        >
          <Plus aria-hidden="true" className="size-5" />
          Cadastrar cliente
        </Link>
      ) : null}
    </div>
  );
}
