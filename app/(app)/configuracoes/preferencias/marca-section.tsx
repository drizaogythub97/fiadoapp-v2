"use client";

import { Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
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

import { removerLogoMarca, salvarNomeMarca, uploadLogoMarca } from "./actions";

const MAX_INPUT_BYTES = 4_000_000; // 4 MB antes do recorte
const TARGET_SIZE = 256; // px do recorte final (quadrado)
const ACCEPTED = "image/png,image/jpeg,image/webp";

export function MarcaSection({
  nomeInicial,
  logoUrlInicial,
}: {
  nomeInicial: string;
  logoUrlInicial: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrlInicial);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [pending, startTransition] = useTransition();
  const [salvandoNome, startNome] = useTransition();
  const imgRef = useRef<HTMLImageElement>(null);
  const nomeRef = useRef<HTMLInputElement>(null);

  function submeterNome(e: React.FormEvent) {
    e.preventDefault();
    const nome = nomeRef.current?.value ?? "";
    startNome(async () => {
      const { error } = await salvarNomeMarca(nome);
      if (error) toast.error(error);
      else toast.success("Nome da loja salvo.");
    });
  }

  function onLoadImage(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(
      centerCrop(
        makeAspectCrop({ unit: "%", width: 80 }, 1, width, height),
        width,
        height,
      ),
    );
  }

  function pickFile(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Use uma imagem PNG, JPEG ou WebP.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("A imagem precisa ter menos de 4 MB antes do recorte.");
      return;
    }
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(URL.createObjectURL(file));
    setCompletedCrop(null);
  }

  async function buildCroppedBlob(): Promise<Blob | null> {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      TARGET_SIZE,
      TARGET_SIZE,
    );

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", 0.9);
    });
  }

  function salvarLogo() {
    startTransition(async () => {
      const blob = await buildCroppedBlob();
      if (!blob) {
        toast.error("Selecione uma imagem e ajuste o recorte primeiro.");
        return;
      }
      const fd = new FormData();
      fd.set("logo", new File([blob], "logo.webp", { type: "image/webp" }));
      const result = await uploadLogoMarca(fd);
      if (result.ok) {
        if (originalUrl) URL.revokeObjectURL(originalUrl);
        setOriginalUrl(null);
        setCompletedCrop(null);
        setPreviewUrl(URL.createObjectURL(blob));
        toast.success("Logo atualizada.");
      } else {
        toast.error(result.error ?? "Não foi possível enviar.");
      }
    });
  }

  function removerLogo() {
    startTransition(async () => {
      const result = await removerLogoMarca();
      if (result.ok) {
        setPreviewUrl(null);
        if (originalUrl) URL.revokeObjectURL(originalUrl);
        setOriginalUrl(null);
        toast.success("Logo removida.");
      } else {
        toast.error(result.error ?? "Não foi possível remover.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Marca da loja</CardTitle>
        <CardDescription className="text-base">
          O nome e a logo aparecem no topo do app e nos comprovantes que você
          compartilha. Sem personalização, usamos a marca FiadoApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="minimal:max-sm:gap-4 flex flex-col gap-6">
        {/* ── Nome da loja ─────────────────────────────────────────── */}
        <form
          onSubmit={submeterNome}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
            <Label htmlFor="marca-nome" className="text-base">
              Nome da loja
            </Label>
            <Input
              ref={nomeRef}
              id="marca-nome"
              type="text"
              maxLength={60}
              placeholder="ex.: Rações Cardoso"
              defaultValue={nomeInicial}
              className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
            />
          </div>
          <Button
            type="submit"
            disabled={salvandoNome}
            className="h-12 px-6 text-base font-medium"
          >
            {salvandoNome ? "Salvando…" : "Salvar nome"}
          </Button>
        </form>

        {/* ── Logo ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="border-border bg-muted flex size-28 items-center justify-center overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl ?? "/logo.png"}
                alt={previewUrl ? "Logo atual" : "Marca padrão FiadoApp"}
                className={
                  previewUrl ? "size-full object-cover" : "size-16 object-contain"
                }
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {previewUrl ? "Logo atual" : "Padrão: FiadoApp"}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <label className="border-border hover:bg-muted flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-base font-medium transition-colors">
              <Upload aria-hidden="true" className="size-5" />
              Escolher imagem
              <input
                type="file"
                accept={ACCEPTED}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickFile(f);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            <p className="text-muted-foreground text-sm">
              PNG, JPEG ou WebP até 4 MB. A imagem será recortada em
              quadrado.
            </p>
            {previewUrl && !originalUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={removerLogo}
                disabled={pending}
                className="minimal:max-sm:h-11 minimal:max-sm:text-sm h-12 text-base"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Remover logo atual
              </Button>
            ) : null}
          </div>
        </div>

        {originalUrl ? (
          <div className="border-border flex flex-col gap-3 rounded-lg border border-dashed p-4">
            <p className="text-base font-medium">
              Ajuste o recorte (formato quadrado):
            </p>
            <div className="overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                keepSelection
                minWidth={32}
                minHeight={32}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={originalUrl}
                  alt=""
                  onLoad={onLoadImage}
                  className="max-h-96 max-w-full"
                />
              </ReactCrop>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (originalUrl) URL.revokeObjectURL(originalUrl);
                  setOriginalUrl(null);
                  setCompletedCrop(null);
                }}
                disabled={pending}
                className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={salvarLogo}
                disabled={pending || !completedCrop}
                aria-busy={pending}
                className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
              >
                {pending ? "Enviando…" : "Salvar logo"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
