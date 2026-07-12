import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { PwaRegister } from "@/components/app/pwa-register";
import { cn } from "@/lib/utils";
import { getThemeFromCookie } from "@/lib/theme/cookie";
import { getUiModeFromCookie } from "@/lib/ui-mode/cookie";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://fiadoapp.net";
const SITE_DESCRIPTION =
  "Controle simples de vendas fiado: clientes, vendas a prazo, quitações e cobrança — fácil de usar.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FiadoApp",
    template: "%s · FiadoApp",
  },
  description: SITE_DESCRIPTION,
  applicationName: "FiadoApp",
  openGraph: {
    type: "website",
    siteName: "FiadoApp",
    title: "FiadoApp",
    description: SITE_DESCRIPTION,
    locale: "pt_BR",
    url: SITE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: "#13131a",
};

// Script injetado no <head> para aplicar o tema antes da hidratação, evitando
// o piscar claro→escuro (FOUC). Diferente do Gaveta, o padrão aqui é ESCURO:
// só remove o `.dark` quando o cookie pede o tema claro explicitamente.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var m = document.cookie.match(/(?:^|; )fiado_theme=([^;]+)/);
    var v = m ? decodeURIComponent(m[1]) : null;
    if (v === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getThemeFromCookie();
  const isDark = theme === "dark";
  const uiMode = await getUiModeFromCookie();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="pt-BR"
      className={cn(
        "antialiased",
        inter.variable,
        "font-sans",
        isDark ? "dark" : undefined,
      )}
      style={{ colorScheme: isDark ? "dark" : "light" }}
      data-ui-mode={uiMode ?? undefined}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
