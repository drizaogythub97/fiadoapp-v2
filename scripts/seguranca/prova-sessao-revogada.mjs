// PROVA DE SESSÃO REVOGADA — a única que pega o laço de redirecionamento.
//
// Cenário: a pessoa clicou "Sair" em outro aparelho (ou a conta foi
// apagada). O cookie no navegador continua com assinatura VÁLIDA, mas a
// sessão morreu no Auth.
//
// Sem a conferência com estado em /login, o proxy vê a assinatura boa e
// manda para /dashboard; o layout vê a sessão morta e manda para /login;
// e o navegador morre em ERR_TOO_MANY_REDIRECTS.
//
// Aconteceu de verdade no Gaveta (PR #50) e os 110 e2e de lá NÃO pegaram.
import fs from "node:fs";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const { createServerClient } = require2("@supabase/ssr");
const { createClient } = require2("@supabase/supabase-js");

const BASE = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3100}`;
const env = fs.readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
const ler = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const URL_SB = ler("NEXT_PUBLIC_SUPABASE_URL");
const ANON = ler("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE = ler("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(URL_SB, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const email = `rls-fiado-revogada-${Date.now()}@example.com`;
const password = `Test-${Math.random().toString(36).slice(2, 12)}!`;
const { data: criado, error: e1 } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (e1) throw e1;
console.log("conta temporária:", email);

// ── Login, capturando os cookies exatamente como o app os grava ──────────
const gravados = [];
const supabase = createServerClient(URL_SB, ANON, {
  cookieOptions: { httpOnly: true, secure: false },
  cookies: { getAll: () => [], setAll: (l) => gravados.push(...l) },
});
const { data: sessao, error: e2 } = await supabase.auth.signInWithPassword({ email, password });
if (e2) throw e2;
const cookieHeader = gravados.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
console.log("cookies de sessão:", gravados.map((c) => c.name).join(", "));

/** Segue redirecionamentos à mão, com teto, para flagrar laço. */
async function seguir(caminho, maxSaltos = 12) {
  let url = BASE + caminho;
  const trilha = [];
  for (let i = 0; i < maxSaltos; i++) {
    const r = await fetch(url, { headers: { cookie: cookieHeader }, redirect: "manual" });
    const destino = r.headers.get("location");
    trilha.push(`${new URL(url).pathname} → ${r.status}${destino ? " → " + destino : ""}`);
    if (r.status >= 300 && r.status < 400 && destino) {
      url = destino.startsWith("http") ? destino : BASE + destino;
      continue;
    }
    return { status: r.status, final: new URL(url).pathname, trilha, laco: false };
  }
  return { status: null, final: null, trilha, laco: true };
}

try {
  console.log("\n════ 1. COM a sessão viva (controle) ════");
  const vivo = await seguir("/dashboard");
  vivo.trilha.forEach((t) => console.log("   " + t));
  console.log(`   → terminou em ${vivo.final} (${vivo.status})`);

  // ── Revoga a sessão no Auth, mantendo o cookie intacto ─────────────────
  console.log("\n   …revogando a sessão no Auth (cookie fica intacto)…");
  await admin.auth.admin.signOut(sessao.session.access_token, "global");

  console.log("\n════ 2. COM a sessão REVOGADA (o teste de verdade) ════");
  const morto = await seguir("/dashboard");
  morto.trilha.forEach((t) => console.log("   " + t));

  console.log("\n══ VEREDITO");
  if (morto.laco) {
    console.log("   ❌ LAÇO DE REDIRECIONAMENTO — estourou o teto de saltos.");
    console.log("      É exatamente o ERR_TOO_MANY_REDIRECTS do Gaveta.");
    process.exitCode = 1;
  } else if (morto.final === "/login" && morto.status === 200) {
    console.log("   ✅ terminou na tela de entrar (/login, 200), sem laço.");
  } else {
    console.log(`   ⚠️  terminou em ${morto.final} (${morto.status}) — conferir.`);
    process.exitCode = 1;
  }
} finally {
  await admin.auth.admin.deleteUser(criado.user.id);
  console.log("\nconta temporária apagada.");
}
