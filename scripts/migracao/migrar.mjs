// =====================================================================
// Fiado v2 — Migração MySQL (Hostinger) → Postgres (Supabase)
//
// Usado na F3 (dry-run com dados reais) e na F5 (migração final na
// janela de congelamento). Requisito absoluto: ZERO PERDA — o MySQL
// nunca é alterado (conexão somente leitura por convenção).
//
// Dependências (NÃO entram no package.json):
//   npm i mysql2 pg --no-save
//
// Env (.env.local — nunca commitar):
//   FIADO_MYSQL_HOST / FIADO_MYSQL_PORT (3306) / FIADO_MYSQL_DATABASE /
//   FIADO_MYSQL_USER / FIADO_MYSQL_PASSWORD   → Remote MySQL do hPanel
//   SUPABASE_DB_URL                            → Postgres (session pooler)
//
// Uso:
//   node scripts/migracao/migrar.mjs snapshot
//       Dump completo do MySQL em ../fiado-migracao/ (fora do repo).
//   node scripts/migracao/migrar.mjs dry-run --usuario <email-v1> [--conta <email-supabase>]
//       Snapshot + wipe do lote anterior + migração completa para as
//       tabelas fiado_* + relatório de validação. NÃO há cutover.
//   node scripts/migracao/migrar.mjs validar --usuario <email-v1> [--conta <email-supabase>]
//       Regera apenas o relatório de validação (origem × destino).
//
// Marcador de lote: toda linha migrada carrega legacy_id (id do MySQL).
// O wipe remove apenas linhas com legacy_id não nulo do usuário alvo —
// dados criados nativamente no v2 nunca são tocados.
// =====================================================================

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import mysql from "mysql2/promise";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const OUT_DIR = path.resolve(REPO, "..", "fiado-migracao"); // fora do repo

loadEnv({ path: path.join(REPO, ".env.local") });

// ---------- CLI ----------
const [, , cmd, ...rest] = process.argv;
const flags = {};
for (let i = 0; i < rest.length; i += 2) {
  if (rest[i]?.startsWith("--")) flags[rest[i].slice(2)] = rest[i + 1];
}
const COMANDOS = ["snapshot", "dry-run", "validar"];
if (!COMANDOS.includes(cmd)) {
  console.error(
    `Uso: node scripts/migracao/migrar.mjs <${COMANDOS.join("|")}> [--usuario email] [--conta email]`,
  );
  process.exit(1);
}

// ---------- Conexões ----------
function exigirEnv(nomes) {
  const faltando = nomes.filter((n) => !process.env[n]);
  if (faltando.length) {
    console.error(`Variáveis ausentes no .env.local: ${faltando.join(", ")}`);
    process.exit(1);
  }
}

async function conectarMysql() {
  exigirEnv([
    "FIADO_MYSQL_HOST",
    "FIADO_MYSQL_DATABASE",
    "FIADO_MYSQL_USER",
    "FIADO_MYSQL_PASSWORD",
  ]);
  return mysql.createConnection({
    host: process.env.FIADO_MYSQL_HOST,
    port: Number(process.env.FIADO_MYSQL_PORT ?? 3306),
    database: process.env.FIADO_MYSQL_DATABASE,
    user: process.env.FIADO_MYSQL_USER,
    password: process.env.FIADO_MYSQL_PASSWORD,
    dateStrings: true, // DATE/DATETIME como string — sem surpresa de fuso
  });
}

async function conectarPg() {
  exigirEnv(["SUPABASE_DB_URL"]);
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

// ---------- Leitura do MySQL ----------
async function lerMysql(conn) {
  const [usuarios] = await conn.query("SELECT * FROM usuarios ORDER BY id");
  const [clientes] = await conn.query("SELECT * FROM clientes ORDER BY id");
  const [vendas] = await conn.query("SELECT * FROM vendas ORDER BY id");
  const [itens] = await conn.query("SELECT * FROM itens_venda ORDER BY id");
  const [pagamentos] = await conn.query("SELECT * FROM pagamentos ORDER BY id");
  return { usuarios, clientes, vendas, itens, pagamentos };
}

function gravarSnapshot(dados) {
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const dir = path.join(OUT_DIR, `snapshot-${stamp}`);
  mkdirSync(dir, { recursive: true });
  for (const [tabela, linhas] of Object.entries(dados)) {
    writeFileSync(
      path.join(dir, `${tabela}.json`),
      JSON.stringify(linhas, null, 1),
    );
  }
  console.log(`Snapshot salvo em ${dir}`);
  return dir;
}

// ---------- Escopo do usuário ----------
function escopoDoUsuario(dados, emailV1) {
  const usuario = dados.usuarios.find(
    (u) => (u.email ?? "").toLowerCase() === emailV1.toLowerCase(),
  );
  if (!usuario) {
    console.error(`Usuário v1 não encontrado: ${emailV1}`);
    console.error(
      "Usuários no MySQL:",
      dados.usuarios.map((u) => u.email).join(", "),
    );
    process.exit(1);
  }
  const clientes = dados.clientes.filter((c) => c.usuario_id === usuario.id);
  const vendas = dados.vendas.filter((v) => v.usuario_id === usuario.id);
  const vendaIds = new Set(vendas.map((v) => v.id));
  const itens = dados.itens.filter((i) => vendaIds.has(i.venda_id));
  const pagamentos = dados.pagamentos.filter((p) => vendaIds.has(p.venda_id));
  return { usuario, clientes, vendas, itens, pagamentos };
}

// ---------- Anomalias (aborta antes de escrever qualquer coisa) ----------
function detectarAnomalias(escopo) {
  const erros = [];
  const avisos = [];
  const clienteIds = new Set(escopo.clientes.map((c) => c.id));

  for (const v of escopo.vendas) {
    if (Number(v.valor_total) <= 0)
      erros.push(
        `venda #${v.id}: valor_total ${v.valor_total} (precisa ser > 0)`,
      );
    if (!v.data_compra || String(v.data_compra).startsWith("0000"))
      erros.push(`venda #${v.id}: data_compra inválida '${v.data_compra}'`);
    if (!clienteIds.has(v.cliente_id))
      erros.push(`venda #${v.id}: cliente_id ${v.cliente_id} inexistente`);
    if (!["ATIVA", "PAGA", "PARCIAL"].includes(v.status))
      erros.push(`venda #${v.id}: status desconhecido '${v.status}'`);
    if (v.status === "PARCIAL")
      avisos.push(
        `venda #${v.id}: status PARCIAL no v1 (inesperado) — migrará como ATIVA com valor_pago 0`,
      );
    if (v.status === "PAGA" && !v.quitado_em)
      avisos.push(
        `venda #${v.id}: PAGA sem quitado_em — pago_em virá do pagamento 1:1 ou da data_compra`,
      );
  }
  for (const i of escopo.itens) {
    if (!i.descricao || !String(i.descricao).trim())
      erros.push(`item #${i.id} (venda #${i.venda_id}): descrição vazia`);
    if (Number(i.quantidade) <= 0)
      erros.push(
        `item #${i.id} (venda #${i.venda_id}): quantidade ${i.quantidade}`,
      );
    if (Number(i.valor_unitario) < 0)
      erros.push(
        `item #${i.id} (venda #${i.venda_id}): valor_unitario negativo`,
      );
  }
  for (const c of escopo.clientes) {
    if (!c.nome || !String(c.nome).trim())
      erros.push(`cliente #${c.id}: nome vazio`);
    if (c.limite_credito != null && Number(c.limite_credito) < 0)
      erros.push(`cliente #${c.id}: limite_credito negativo`);
  }

  const itensPorVenda = new Map();
  for (const i of escopo.itens)
    itensPorVenda.set(i.venda_id, (itensPorVenda.get(i.venda_id) ?? 0) + 1);
  const semItens = escopo.vendas.filter((v) => !itensPorVenda.has(v.id));
  if (semItens.length)
    avisos.push(
      `${semItens.length} venda(s) sem itens (ids: ${semItens.map((v) => v.id).join(", ")})`,
    );

  return { erros, avisos };
}

// ---------- Migração ----------
const round2 = (n) => Math.round(Number(n) * 100) / 100;
// MariaDB pode devolver datas zeradas; e datetimes do v1 são
// America/Sao_Paulo — o sufixo -03 evita deslocamento de 3h no timestamptz
const dataOuNull = (s) => (!s || String(s).startsWith("0000") ? null : s);
const tsSaoPaulo = (s) => (dataOuNull(s) ? `${s}-03` : null);
// created_at sintético preserva a ordem do v1 dentro do mesmo dia
// (a cascata de pagamento ordena por data_compra e depois created_at)
const createdAtSintetico = (dataCompra, legacyId) =>
  `('${dataCompra} 12:00:00-03'::timestamptz + make_interval(secs => ${Number(legacyId)} / 1000.0))`;

async function acharContaSupabase(pgc, email) {
  const { rows } = await pgc.query(
    "select id, email from auth.users where lower(email) = lower($1)",
    [email],
  );
  if (!rows.length) {
    console.error(
      `Conta Supabase não encontrada para ${email}. Confirme o e-mail (--conta).`,
    );
    process.exit(1);
  }
  return rows[0];
}

async function wipeLoteAnterior(pgc, userId) {
  // on delete cascade leva itens e pagamentos junto com as vendas;
  // clientes migrados por último (cascade pega vendas remanescentes deles)
  const v = await pgc.query(
    "delete from public.fiado_vendas where user_id = $1 and legacy_id is not null",
    [userId],
  );
  const c = await pgc.query(
    "delete from public.fiado_clientes where user_id = $1 and legacy_id is not null",
    [userId],
  );
  console.log(
    `Wipe do lote anterior: ${v.rowCount} vendas, ${c.rowCount} clientes (cascata levou itens/pagamentos).`,
  );
}

async function migrar(pgc, escopo, userId) {
  await pgc.query("begin");
  try {
    await wipeLoteAnterior(pgc, userId);

    // preferências (limite padrão do usuário v1)
    await pgc.query(
      `insert into public.fiado_preferencias (user_id, limite_credito_padrao)
       values ($1, $2)
       on conflict (user_id) do update
         set limite_credito_padrao = excluded.limite_credito_padrao,
             updated_at = now()`,
      [userId, escopo.usuario.limite_credito_padrao ?? null],
    );

    // clientes → mapa legacy_id → uuid
    const mapaCliente = new Map();
    for (const c of escopo.clientes) {
      const { rows } = await pgc.query(
        `insert into public.fiado_clientes
           (user_id, nome, sobrenome, referencia, telefone, limite_credito, legacy_id)
         values ($1, $2, nullif(trim(coalesce($3, '')), ''), nullif(trim(coalesce($4, '')), ''),
                 nullif(trim(coalesce($5, '')), ''), $6, $7)
         returning id`,
        [
          userId,
          String(c.nome).trim(),
          c.sobrenome,
          c.referencia,
          c.telefone,
          c.limite_credito,
          c.id,
        ],
      );
      mapaCliente.set(c.id, rows[0].id);
    }

    // vendas → mapa legacy_id → uuid
    const mapaVenda = new Map();
    for (const v of escopo.vendas) {
      const paga = v.status === "PAGA";
      const { rows } = await pgc.query(
        `insert into public.fiado_vendas
           (user_id, cliente_id, data_compra, data_vencimento, valor_total,
            valor_pago, status, observacao, quitado_em, legacy_id, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, nullif(trim(coalesce($8, '')), ''), $9::timestamptz, $10,
                 ${createdAtSintetico(v.data_compra, v.id)})
         returning id`,
        [
          userId,
          mapaCliente.get(v.cliente_id),
          v.data_compra,
          dataOuNull(v.data_vencimento),
          v.valor_total,
          paga ? v.valor_total : 0, // PARCIAL do v1 (se existir) vira ATIVA/0
          paga ? "PAGA" : "ATIVA",
          v.observacao,
          paga ? tsSaoPaulo(v.quitado_em) : null,
          v.id,
        ],
      );
      mapaVenda.set(v.id, rows[0].id);
    }

    // itens (lote de 200 por INSERT)
    const LOTE = 200;
    for (let i = 0; i < escopo.itens.length; i += LOTE) {
      const fatia = escopo.itens.slice(i, i + LOTE);
      const valores = [];
      const params = [];
      let p = 1;
      for (const it of fatia) {
        valores.push(
          `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`,
        );
        params.push(
          userId,
          mapaVenda.get(it.venda_id),
          String(it.descricao).trim(),
          it.quantidade,
          it.valor_unitario,
          it.valor_total,
          it.id,
        );
      }
      await pgc.query(
        `insert into public.fiado_itens_venda
           (user_id, venda_id, descricao, quantidade, valor_unitario, valor_total, legacy_id)
         values ${valores.join(", ")}`,
        params,
      );
    }

    // pagamentos: os do v1 são superestimados (quitação parcial marca tudo
    // como pago com valor cheio). Estratégia aprovada (docs/02): para cada
    // venda PAGA, UM pagamento sintético = valor_total; pago_em vem de
    // quitado_em, senão do pagamento 1:1, senão de data_compra.
    const pagamentosPorVenda = new Map();
    for (const p of escopo.pagamentos) {
      const lista = pagamentosPorVenda.get(p.venda_id) ?? [];
      lista.push(p);
      pagamentosPorVenda.set(p.venda_id, lista);
    }
    let sinteticos = 0;
    for (const v of escopo.vendas) {
      if (v.status !== "PAGA") continue;
      const doV1 = pagamentosPorVenda.get(v.id) ?? [];
      const umPraUm = doV1.length === 1 ? doV1[0] : null;
      const pagoEm =
        dataOuNull(v.quitado_em) ??
        dataOuNull(umPraUm?.data_pagamento) ??
        `${v.data_compra} 12:00:00`;
      await pgc.query(
        `insert into public.fiado_pagamentos (user_id, venda_id, valor_pago, pago_em, legacy_id)
         values ($1, $2, $3, $4::timestamptz, $5)`,
        [
          userId,
          mapaVenda.get(v.id),
          v.valor_total,
          tsSaoPaulo(pagoEm),
          umPraUm?.id ?? null,
        ],
      );
      sinteticos++;
    }

    await pgc.query("commit");
    console.log(
      `Migrado: ${mapaCliente.size} clientes, ${mapaVenda.size} vendas, ` +
        `${escopo.itens.length} itens, ${sinteticos} pagamentos sintéticos ` +
        `(${escopo.pagamentos.length} registros de pagamento no v1 — excesso descartado por decisão de modelo).`,
    );
  } catch (err) {
    await pgc.query("rollback");
    throw err;
  }
}

// ---------- Validação (origem em memória × destino no Postgres) ----------
const brl = (n) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function validar(pgc, escopo, userId) {
  const L = [];
  const hoje = new Date().toISOString().slice(0, 10);
  let falhas = 0;
  const check = (nome, origem, destino) => {
    const ok = String(origem) === String(destino);
    if (!ok) falhas++;
    L.push(`| ${nome} | ${origem} | ${destino} | ${ok ? "✅" : "❌"} |`);
  };

  L.push(
    `# Relatório de validação da migração — ${new Date().toLocaleString("pt-BR")}`,
  );
  L.push("");
  L.push(
    `Usuário v1: **${escopo.usuario.email}** (id ${escopo.usuario.id}) → conta Supabase \`${userId}\``,
  );
  L.push("");
  L.push("## 1. Contagens (origem × destino)");
  L.push("");
  L.push("| Métrica | MySQL (v1) | Postgres (v2) | OK |");
  L.push("|---|---|---|---|");

  const q = async (sql, params = [userId]) =>
    (await pgc.query(sql, params)).rows[0];

  const d = await q(`select
      (select count(*) from public.fiado_clientes where user_id = $1 and legacy_id is not null) as clientes,
      (select count(*) from public.fiado_vendas where user_id = $1 and legacy_id is not null) as vendas,
      (select count(*) from public.fiado_itens_venda where user_id = $1 and legacy_id is not null) as itens,
      (select count(*) from public.fiado_pagamentos where user_id = $1) as pagamentos`);
  check("Clientes", escopo.clientes.length, d.clientes);
  check("Vendas", escopo.vendas.length, d.vendas);
  check("Itens de venda", escopo.itens.length, d.itens);
  const pagasV1 = escopo.vendas.filter((v) => v.status === "PAGA").length;
  check("Pagamentos (1 sintético por venda PAGA)", pagasV1, d.pagamentos);

  L.push("");
  L.push("## 2. Somas por status");
  L.push("");
  L.push("| Métrica | MySQL (v1) | Postgres (v2) | OK |");
  L.push("|---|---|---|---|");

  const somaV1 = (status) =>
    round2(
      escopo.vendas
        .filter((v) =>
          status === "ABERTA" ? v.status !== "PAGA" : v.status === status,
        )
        .reduce((s, v) => s + Number(v.valor_total), 0),
    ).toFixed(2);
  const s = await q(`select
      coalesce(sum(valor_total) filter (where status <> 'PAGA'), 0)::numeric(12,2) as abertas,
      coalesce(sum(valor_total) filter (where status = 'PAGA'), 0)::numeric(12,2) as pagas,
      coalesce(sum(valor_total - valor_pago) filter (where status <> 'PAGA'), 0)::numeric(12,2) as a_receber
    from public.fiado_vendas where user_id = $1 and legacy_id is not null`);
  check(
    "Σ valor_total vendas em aberto",
    somaV1("ABERTA"),
    Number(s.abertas).toFixed(2),
  );
  check(
    "Σ valor_total vendas pagas",
    somaV1("PAGA"),
    Number(s.pagas).toFixed(2),
  );

  L.push("");
  L.push("## 3. Critério nº 1 — Total a receber = dashboard do app antigo");
  L.push("");
  // Fórmula EXATA do v1 (api/dashboard_stats.php): SUM(valor_total) das
  // vendas ATIVA/PARCIAL. Nas migradas valor_pago=0, então no v2
  // SUM(valor_total - valor_pago) das não-PAGA dá o mesmo número.
  const receberV1 = somaV1("ABERTA");
  const receberV2 = Number(s.a_receber).toFixed(2);
  const okReceber = receberV1 === receberV2;
  if (!okReceber) falhas++;
  L.push(`- MySQL (fórmula do dashboard v1): **${brl(receberV1)}**`);
  L.push(
    `- Postgres (fiado_resumo_dashboard): **${brl(receberV2)}** ${okReceber ? "✅" : "❌"}`,
  );
  L.push(
    `- 👤 Confira: o card "A Receber" em https://fiadoapp.net deve mostrar **${brl(receberV1)}**.`,
  );

  L.push("");
  L.push("## 4. Saldo devedor por cliente (top 20)");
  L.push("");
  L.push("| Cliente | MySQL (v1) | Postgres (v2) | OK |");
  L.push("|---|---|---|---|");
  const devedorV1 = new Map();
  for (const v of escopo.vendas) {
    if (v.status === "PAGA") continue;
    devedorV1.set(
      v.cliente_id,
      round2((devedorV1.get(v.cliente_id) ?? 0) + Number(v.valor_total)),
    );
  }
  const nomes = new Map(
    escopo.clientes.map((c) => [
      c.id,
      [c.nome, c.sobrenome, c.referencia && `(${c.referencia})`]
        .filter(Boolean)
        .join(" "),
    ]),
  );
  const topV1 = [...devedorV1.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  const { rows: topV2 } = await pgc.query(
    `select c.legacy_id, coalesce(sum(v.valor_total - v.valor_pago), 0)::numeric(12,2) as saldo
     from public.fiado_vendas v join public.fiado_clientes c on c.id = v.cliente_id
     where v.user_id = $1 and v.status <> 'PAGA' and v.legacy_id is not null
     group by c.legacy_id`,
    [userId],
  );
  const saldoV2 = new Map(topV2.map((r) => [r.legacy_id, Number(r.saldo)]));
  for (const [clienteId, saldo] of topV1) {
    check(
      nomes.get(clienteId) ?? `#${clienteId}`,
      saldo.toFixed(2),
      (saldoV2.get(clienteId) ?? 0).toFixed(2),
    );
  }

  L.push("");
  L.push("## 5. Inadimplentes (vencimento < hoje, não pagas)");
  L.push("");
  L.push("| Cliente | Dias de atraso (v1) | Dias de atraso (v2) | OK |");
  L.push("|---|---|---|---|");
  const inadV1 = new Map(); // cliente → maior atraso
  for (const v of escopo.vendas) {
    if (v.status === "PAGA" || !v.data_vencimento || v.data_vencimento >= hoje)
      continue;
    const dias = Math.floor(
      (new Date(hoje) - new Date(v.data_vencimento)) / 86400000,
    );
    inadV1.set(v.cliente_id, Math.max(inadV1.get(v.cliente_id) ?? 0, dias));
  }
  const { rows: inadV2 } = await pgc.query(
    `select c.legacy_id, max(current_date - v.data_vencimento) as dias
     from public.fiado_vendas v join public.fiado_clientes c on c.id = v.cliente_id
     where v.user_id = $1 and v.status <> 'PAGA' and v.legacy_id is not null
       and v.data_vencimento < current_date
     group by c.legacy_id`,
    [userId],
  );
  const diasV2 = new Map(inadV2.map((r) => [r.legacy_id, Number(r.dias)]));
  check("(quantidade de clientes)", inadV1.size, inadV2.length);
  for (const [clienteId, dias] of [...inadV1.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    check(
      nomes.get(clienteId) ?? `#${clienteId}`,
      dias,
      diasV2.get(clienteId) ?? "—",
    );
  }

  L.push("");
  L.push("## 6. Amostras aleatórias (venda campo a campo + itens)");
  L.push("");
  const amostra = [...escopo.vendas]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
  for (const v of amostra) {
    const { rows } = await pgc.query(
      `select v.data_compra::text, v.data_vencimento::text, v.valor_total::text,
              v.status, v.observacao, count(i.id) as n_itens,
              coalesce(sum(i.valor_total), 0)::numeric(12,2) as soma_itens
       from public.fiado_vendas v
       left join public.fiado_itens_venda i on i.venda_id = v.id
       where v.user_id = $1 and v.legacy_id = $2
       group by v.id`,
      [userId, v.id],
    );
    const w = rows[0];
    const itensV1 = escopo.itens.filter((i) => i.venda_id === v.id);
    const statusEsperado = v.status === "PAGA" ? "PAGA" : "ATIVA";
    const iguais =
      w &&
      w.data_compra === v.data_compra &&
      (w.data_vencimento ?? null) === dataOuNull(v.data_vencimento) &&
      Number(w.valor_total).toFixed(2) === Number(v.valor_total).toFixed(2) &&
      w.status === statusEsperado &&
      (w.observacao ?? "") === String(v.observacao ?? "").trim() &&
      Number(w.n_itens) === itensV1.length;
    if (!iguais) falhas++;
    L.push(
      `- venda legacy #${v.id}: ${v.data_compra}, ${brl(v.valor_total)}, ` +
        `${statusEsperado}, ${itensV1.length} item(ns) → ${iguais ? "✅ idêntica" : "❌ DIVERGÊNCIA"}`,
    );
  }

  L.push("");
  L.push(
    falhas === 0
      ? "## ✅ RESULTADO: todas as verificações passaram — zero divergência."
      : `## ❌ RESULTADO: ${falhas} verificação(ões) FALHARAM — revisar antes de prosseguir.`,
  );

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const arquivo = path.join(OUT_DIR, `relatorio-validacao-${stamp}.md`);
  writeFileSync(arquivo, L.join("\n"));
  console.log(`\nRelatório salvo em ${arquivo}`);
  console.log(L.slice(-1)[0]);
  return falhas === 0;
}

// ---------- Main ----------
const mysqlConn = await conectarMysql();
try {
  const dados = await lerMysql(mysqlConn);
  console.log(
    `MySQL lido: ${dados.usuarios.length} usuários, ${dados.clientes.length} clientes, ` +
      `${dados.vendas.length} vendas, ${dados.itens.length} itens, ${dados.pagamentos.length} pagamentos.`,
  );
  gravarSnapshot(dados);
  if (cmd === "snapshot") process.exit(0);

  if (!flags.usuario) {
    console.error("Informe --usuario <email do login do FiadoApp v1>.");
    console.error(
      "Usuários no MySQL:",
      dados.usuarios.map((u) => u.email).join(", "),
    );
    process.exit(1);
  }
  const escopo = escopoDoUsuario(dados, flags.usuario);

  const outros = dados.usuarios.filter((u) => u.id !== escopo.usuario.id);
  for (const u of outros) {
    const n = dados.vendas.filter((v) => v.usuario_id === u.id).length;
    if (n > 0)
      console.warn(
        `⚠️ Usuário v1 NÃO migrado com dados: ${u.email} (${n} vendas) — decidir com o dono.`,
      );
  }

  const { erros, avisos } = detectarAnomalias(escopo);
  for (const a of avisos) console.warn(`aviso: ${a}`);
  if (erros.length) {
    console.error(
      `\n${erros.length} anomalia(s) IMPEDEM a migração (zero perda — decisão do dono antes de contornar):`,
    );
    for (const e of erros) console.error(`  - ${e}`);
    process.exit(1);
  }

  const pgc = await conectarPg();
  try {
    const conta = await acharContaSupabase(pgc, flags.conta ?? flags.usuario);
    console.log(`Conta Supabase alvo: ${conta.email} (${conta.id})`);
    if (cmd === "dry-run") await migrar(pgc, escopo, conta.id);
    const ok = await validar(pgc, escopo, conta.id);
    process.exitCode = ok ? 0 : 1;
  } finally {
    await pgc.end();
  }
} finally {
  await mysqlConn.end();
}
