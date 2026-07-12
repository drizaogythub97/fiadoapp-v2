"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

type ClienteBusca = {
  id: string;
  nome: string;
  sobrenome: string | null;
  referencia: string | null;
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function DashboardSearch({ clientes }: { clientes: ClienteBusca[] }) {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const resultados = useMemo(() => {
    const q = norm(termo.trim());
    if (q.length < 2) return [];
    return clientes
      .filter((c) =>
        norm(`${c.nome} ${c.sobrenome ?? ""} ${c.referencia ?? ""}`).includes(
          q,
        ),
      )
      .slice(0, 6);
  }, [clientes, termo]);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, []);

  function irParaCliente(c: ClienteBusca) {
    setAberto(false);
    router.push(`/clientes/${c.id}`);
  }

  return (
    <div ref={wrapperRef} className="relative max-w-xl">
      <label
        htmlFor="busca-rapida"
        className="text-muted-foreground mb-2 block text-sm font-medium"
      >
        Busca rápida de cliente
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <Input
          id="busca-rapida"
          type="search"
          value={termo}
          role="combobox"
          aria-expanded={aberto && resultados.length > 0}
          aria-controls="busca-rapida-resultados"
          autoComplete="off"
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAberto(false);
          }}
          placeholder="Digite o nome ou referência…"
          className="minimal:max-sm:h-11 minimal:max-sm:pl-10 minimal:max-sm:text-sm h-13 pl-12 text-base"
        />
      </div>
      {aberto && resultados.length > 0 ? (
        <ul
          id="busca-rapida-resultados"
          className="border-border bg-card absolute z-10 mt-2 w-full overflow-hidden rounded-xl border shadow-lg"
        >
          {resultados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => irParaCliente(c)}
                className="minimal:max-sm:h-11 minimal:max-sm:text-sm hover:bg-muted focus-visible:bg-muted flex h-12 w-full items-center gap-2 px-4 text-left text-base outline-none"
              >
                <span className="font-medium">
                  {c.sobrenome ? `${c.nome} ${c.sobrenome}` : c.nome}
                </span>
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
  );
}
