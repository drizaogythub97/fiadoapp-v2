"use client";

import { MessageCircle, Printer, Share2, X } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import styles from "./print-page.module.css";

/**
 * Toolbar do comprovante (padrão do Gaveta): Imprimir, Compartilhar (caixa
 * nativa de apps do celular via Web Share), WhatsApp direto para o telefone
 * do cliente e Fechar. Dispara window.print() sozinho ao abrir.
 */
export function PrintToolbar({
  shareTitle,
  shareText,
  whatsappUrl,
}: {
  shareTitle: string;
  shareText: string;
  whatsappUrl: string | null;
}) {
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

  // Dispara o diálogo de impressão automaticamente ao abrir, dando um
  // instante para fontes e a logo carregarem (senão saem em branco).
  useEffect(() => {
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
  }, []);

  function handleClose() {
    // Aberto em nova aba pelo app → fecha; caso contrário, volta.
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  }

  return (
    <div className={styles.toolbar}>
      <Button
        type="button"
        onClick={() => window.print()}
        className="h-14 gap-2 px-6 text-lg"
      >
        <Printer aria-hidden="true" className="size-5" />
        Imprimir
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
    </div>
  );
}
