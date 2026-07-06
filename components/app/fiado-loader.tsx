"use client";

import Image from "next/image";
import { useState } from "react";

import styles from "./fiado-loader.module.css";

const VARIANTS = ["pulse", "ring"] as const;
type Variant = (typeof VARIANTS)[number];

function pickVariant(): Variant {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
}

/** Logo da marca (coral) — funciona nos dois temas. */
function Logo({ size, className }: { size: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      priority
      className={`object-contain ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}

function Coin({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#e8624a" />
      <circle
        cx="20"
        cy="20"
        r="14"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="Inter, Arial"
        fontSize="20"
        fontWeight="800"
        fill="#ffffff"
      >
        $
      </text>
    </svg>
  );
}

function PulseScene() {
  return (
    <div className="relative flex h-64 w-full max-w-sm items-center justify-center">
      <span className={styles.pulseOpacity}>
        <Logo size={96} className={styles.breathe} />
      </span>
      <span className="absolute left-10 top-10">
        <span className={`block ${styles.float}`}>
          <Coin />
        </span>
      </span>
      <span className="absolute right-10 top-12">
        <span className={`block ${styles.float} ${styles.delay05}`}>
          <Coin />
        </span>
      </span>
      <span className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <span className={`block ${styles.float} ${styles.delay1}`}>
          <Coin />
        </span>
      </span>
    </div>
  );
}

function RingScene() {
  return (
    <div className="relative flex h-64 w-full max-w-sm items-center justify-center">
      <div className="relative flex size-40 items-center justify-center">
        <svg
          viewBox="0 0 50 50"
          className={`absolute inset-0 size-40 ${styles.spin}`}
          aria-hidden="true"
        >
          <circle
            cx="25"
            cy="25"
            r="22"
            fill="none"
            stroke="var(--border)"
            strokeWidth="4"
          />
          <circle
            cx="25"
            cy="25"
            r="22"
            fill="none"
            stroke="#e8624a"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="80 200"
          />
        </svg>
        <span className={styles.pulseOpacity}>
          <Logo size={80} />
        </span>
      </div>
      <span
        className={`text-primary absolute bottom-6 left-[30%] text-xl font-extrabold ${styles.rise}`}
      >
        $
      </span>
      <span
        className={`text-primary absolute bottom-4 left-[60%] text-xl font-extrabold ${styles.rise} ${styles.delay1}`}
      >
        $
      </span>
    </div>
  );
}

/**
 * Loader de marca. Sorteia um dos conceitos a cada montagem (ou seja, a cada
 * transição). Anuncia "Carregando…" para leitores de tela. Por decisão de
 * produto, a animação roda mesmo com "reduzir movimento" ativo no sistema
 * (é um estado breve de carregamento).
 */
export function FiadoLoader() {
  const [variant] = useState<Variant>(pickVariant);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
    >
      <span className="sr-only">Carregando…</span>
      {variant === "pulse" ? <PulseScene /> : <RingScene />}
      <p
        aria-hidden="true"
        className={`text-muted-foreground text-base font-semibold ${styles.dots}`}
      >
        Carregando<span>.</span>
        <span>.</span>
        <span>.</span>
      </p>
    </div>
  );
}
