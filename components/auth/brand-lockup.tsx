import Image from "next/image";

/**
 * Bloco de marca do FiadoApp (logo + nome + slogan) exibido no topo dos
 * cartões de autenticação. A logo coral funciona nos dois temas.
 */
export function BrandLockup() {
  return (
    // No celular o bloco é compacto (padrão minimalista da tela de login).
    <div className="flex flex-col items-center gap-3 text-center max-sm:gap-2">
      <Image
        src="/logo.png"
        alt=""
        width={112}
        height={112}
        priority
        className="size-28 object-contain max-sm:size-16"
      />
      <span className="text-foreground text-2xl font-bold tracking-tight max-sm:text-xl">
        FiadoApp
      </span>
      <span className="text-muted-foreground text-base max-sm:text-sm">
        Venda fiado com controle, receba em dia.
      </span>
    </div>
  );
}
