import { Hammer } from "lucide-react";

// Placeholder das seções que serão ativadas nas fases F4a–F4d do roadmap.
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <Hammer aria-hidden="true" className="text-muted-foreground size-12" />
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground max-w-md text-lg">
        Esta tela está em construção e será liberada em uma próxima
        atualização, junto com os seus dados de hoje.
      </p>
    </div>
  );
}
