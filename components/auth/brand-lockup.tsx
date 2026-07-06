import Image from "next/image";

/**
 * Bloco de marca do FiadoApp (logo + nome + slogan) exibido no topo dos
 * cartões de autenticação. A logo coral funciona nos dois temas.
 */
export function BrandLockup() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Image
        src="/logo.png"
        alt=""
        width={112}
        height={112}
        priority
        className="size-28 object-contain"
      />
      <span className="text-foreground text-2xl font-bold tracking-tight">
        FiadoApp
      </span>
      <span className="text-muted-foreground text-base">
        Venda fiado com controle, receba em dia.
      </span>
    </div>
  );
}
