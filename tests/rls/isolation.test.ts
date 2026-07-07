import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  createCliente,
  createTestUser,
  deleteTestUser,
  userClient,
  type TestUser,
} from "./helpers";

let alice: TestUser;
let bob: TestUser;
let aliceClienteId: string;
let aliceVendaId: string;

beforeAll(async () => {
  const admin = adminClient();
  const { error } = await admin.from("fiado_clientes").select("id").limit(1);
  if (error) {
    throw new Error(
      `Tabela public.fiado_clientes inacessivel — confirme que o SQL de ` +
        `supabase/migrations/0001_init.sql foi aplicado: ${error.message}`,
    );
  }

  alice = await createTestUser("alice");
  bob = await createTestUser("bob");

  // Dados da Alice usados nos testes de isolamento
  aliceClienteId = await createCliente(alice.accessToken, alice.id, "Maria");
  const aliceApp = userClient(alice.accessToken);
  const { data: vendaId, error: vendaError } = await aliceApp.rpc(
    "fiado_registrar_venda",
    {
      p_itens: [{ descricao: "Arroz 5kg", quantidade: 2, valor_unitario: 25 }],
      p_cliente_id: aliceClienteId,
    },
  );
  if (vendaError || !vendaId) {
    throw new Error(`Falha ao criar venda da Alice: ${vendaError?.message}`);
  }
  aliceVendaId = vendaId as string;
}, 60_000);

afterAll(async () => {
  if (alice) await deleteTestUser({ id: alice.id });
  if (bob) await deleteTestUser({ id: bob.id });
});

describe("RLS — fiado_clientes", () => {
  it("Bob nao enxerga clientes da Alice e nao consegue deleta-los", async () => {
    const bobApp = userClient(bob.accessToken);

    const { data: bobSees, error: selectError } = await bobApp
      .from("fiado_clientes")
      .select("id");
    expect(selectError).toBeNull();
    expect(bobSees).toHaveLength(0);

    const { error: deleteError } = await bobApp
      .from("fiado_clientes")
      .delete()
      .eq("id", aliceClienteId);
    expect(deleteError).toBeNull(); // RLS filtra silenciosamente (0 linhas)

    const admin = adminClient();
    const { data: stillThere } = await admin
      .from("fiado_clientes")
      .select("id")
      .eq("id", aliceClienteId)
      .single();
    expect(stillThere?.id).toBe(aliceClienteId);
  });

  it("Bob nao consegue inserir cliente forjando user_id da Alice", async () => {
    const bobApp = userClient(bob.accessToken);
    const { error } = await bobApp.from("fiado_clientes").insert({
      user_id: alice.id,
      nome: "Tentativa do Bob",
    });
    expect(error).not.toBeNull();
  });

  it("Bob nao consegue editar cliente da Alice", async () => {
    const bobApp = userClient(bob.accessToken);
    const { data: updated, error } = await bobApp
      .from("fiado_clientes")
      .update({ nome: "Renomeado pelo Bob" })
      .eq("id", aliceClienteId)
      .select("id");
    expect(error).toBeNull();
    expect(updated).toHaveLength(0);

    const admin = adminClient();
    const { data: untouched } = await admin
      .from("fiado_clientes")
      .select("nome")
      .eq("id", aliceClienteId)
      .single();
    expect(untouched?.nome).toBe("Maria");
  });
});

describe("RLS — fiado_vendas / fiado_itens_venda / fiado_pagamentos", () => {
  it("venda e itens da Alice nao aparecem para Bob", async () => {
    const bobApp = userClient(bob.accessToken);

    const { data: bobVendas } = await bobApp.from("fiado_vendas").select("id");
    expect(bobVendas).toHaveLength(0);

    const { data: bobItens } = await bobApp
      .from("fiado_itens_venda")
      .select("id");
    expect(bobItens).toHaveLength(0);

    const aliceApp = userClient(alice.accessToken);
    const { data: aliceVendas } = await aliceApp
      .from("fiado_vendas")
      .select("id");
    expect(aliceVendas?.length).toBeGreaterThanOrEqual(1);
  });

  it("Bob nao consegue alterar valor_pago da venda da Alice", async () => {
    const bobApp = userClient(bob.accessToken);
    const { data: updated, error } = await bobApp
      .from("fiado_vendas")
      .update({ valor_pago: 50, status: "PAGA" })
      .eq("id", aliceVendaId)
      .select("id");
    expect(error).toBeNull();
    expect(updated).toHaveLength(0);

    const admin = adminClient();
    const { data: venda } = await admin
      .from("fiado_vendas")
      .select("status")
      .eq("id", aliceVendaId)
      .single();
    expect(venda?.status).toBe("ATIVA");
  });

  it("pagamentos da Alice nao aparecem para Bob", async () => {
    const aliceApp = userClient(alice.accessToken);
    const { error: pagError } = await aliceApp.rpc(
      "fiado_registrar_pagamento",
      { p_cliente_id: aliceClienteId, p_valor: 10 },
    );
    expect(pagError).toBeNull();

    const bobApp = userClient(bob.accessToken);
    const { data: bobPagamentos } = await bobApp
      .from("fiado_pagamentos")
      .select("id");
    expect(bobPagamentos).toHaveLength(0);

    const { data: alicePagamentos } = await aliceApp
      .from("fiado_pagamentos")
      .select("id");
    expect(alicePagamentos?.length).toBeGreaterThanOrEqual(1);
  });
});

describe("RLS — fiado_preferencias", () => {
  it("cada usuario ve apenas a propria linha", async () => {
    const aliceApp = userClient(alice.accessToken);
    const bobApp = userClient(bob.accessToken);

    const { error: upsertError } = await aliceApp
      .from("fiado_preferencias")
      .upsert({ user_id: alice.id, limite_credito_padrao: 200 });
    expect(upsertError).toBeNull();

    const { data: bobSees } = await bobApp
      .from("fiado_preferencias")
      .select("user_id");
    expect(bobSees).toHaveLength(0);

    const { error: forgeError } = await bobApp
      .from("fiado_preferencias")
      .upsert({ user_id: alice.id, limite_credito_padrao: 999999 });
    expect(forgeError).not.toBeNull();
  });
});
