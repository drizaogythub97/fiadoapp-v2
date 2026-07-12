"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className,
  pendingText,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn("max-sm:h-12 max-sm:text-base h-14 w-full px-6 text-lg font-medium", className)}
    >
      {pending ? (pendingText ?? "Enviando…") : children}
    </Button>
  );
}
