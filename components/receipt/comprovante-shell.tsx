"use client";

import {
  Image as ImageIcon,
  MessageCircle,
  Printer,
  Share2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import styles from "./print-page.module.css";

export type FormatoComprovante = "pdf" | "imagem";

/**
 * Casca do comprovante (padrão do Gaveta, estendido): toolbar Imprimir /
 * Imagem (PNG hi-def do próprio papel) / Compartilhar (Web Share) /
 * WhatsApp / Fechar + o "papel". Com formato "pdf" dispara window.print()
 * ao abrir; com "imagem" não imprime e destaca o botão Imagem — a escolha
 * vem do diálogo de formato (fluxo do v1).
 */
export function ComprovanteShell({
  shareTitle,
  shareText,
  whatsappUrl,
  nomeArquivo,
  formato,
  children,
}: {
  shareTitle: string;
  shareText: string;
  whatsappUrl: string | null;
  nomeArquivo: string;
  formato: FormatoComprovante;
  children: React.ReactNode;
}) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [gerandoImagem, setGerandoImagem] = useState(false);
  const [erroImagem, setErroImagem] = useState(false);

  // Web Share só existe no cliente (celulares/alguns desktops) — o snapshot
  // de servidor devolve false, evitando divergência de hidratação.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false,
  );

  function handleShare() {
    navigator.share?.({ title: shareTitle, text: shareText }).catch(() => {
      // Usuário cancelou ou compartilhamento indisponível: silencioso.
    });
  }

  // No formato PDF, dispara a impressão automaticamente ao abrir, dando um
  // instante para fontes e a logo carregarem (senão saem em branco).
  useEffect(() => {
    if (formato !== "pdf") return;
    let done = false;
    let timer: ReturnType<typeof setTimeout>;
    const trigger = () => {
      if (done) return;
      done = true;
      window.print();
    };
    const schedule = () => {
      timer = setTimeout(trigger, 400);
    };
    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("load", schedule);
    };
  }, [formato]);

  async function compartilharImagem() {
    const node = paperRef.current;
    if (!node || gerandoImagem) return;
    setGerandoImagem(true);
    setErroImagem(false);
    try {
      // Import dinâmico: a lib só é carregada quando o usuário pede imagem.
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(node, {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      if (!blob) throw new Error("toBlob devolveu null");
      const file = new File([blob], nomeArquivo, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    } catch (err) {
      // Cancelar a caixa de compartilhamento não é erro.
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setErroImagem(true);
      }
    } finally {
      setGerandoImagem(false);
    }
  }

  function handleClose() {
    // Aberto em nova aba pelo app → fecha; caso contrário, volta.
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  }

  const destaqueImagem = formato === "imagem";

  return (
    <div className={styles.screen}>
      <div className={styles.toolbar}>
        <Button
          type="button"
          variant={destaqueImagem ? "outline" : "default"}
          onClick={() => window.print()}
          className="h-14 gap-2 px-6 text-lg"
        >
          <Printer aria-hidden="true" className="size-5" />
          Imprimir
        </Button>
        <Button
          type="button"
          variant={destaqueImagem ? "default" : "outline"}
          disabled={gerandoImagem}
          onClick={compartilharImagem}
          className="h-14 gap-2 px-6 text-lg"
        >
          <ImageIcon aria-hidden="true" className="size-5" />
          {gerandoImagem ? "Gerando…" : "Imagem"}
        </Button>
        {canShare ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleShare}
            className="h-14 gap-2 px-6 text-lg"
          >
            <Share2 aria-hidden="true" className="size-5" />
            Compartilhar
          </Button>
        ) : null}
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-14 gap-2 px-6 text-lg",
            )}
          >
            <MessageCircle aria-hidden="true" className="size-5" />
            WhatsApp
          </a>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          className="h-14 gap-2 px-6 text-lg"
        >
          <X aria-hidden="true" className="size-5" />
          Fechar
        </Button>
        {erroImagem ? (
          <p role="alert" className="w-full text-center text-base text-red-700">
            Não foi possível gerar a imagem. Tente de novo.
          </p>
        ) : null}
      </div>
      <div ref={paperRef} className={styles.paper}>
        {children}
      </div>
    </div>
  );
}
