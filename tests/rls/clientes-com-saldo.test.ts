import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCliente,
  createTestUser,
  deleteTestUser,
  userClient,
  type TestUser,
} from "./helpers";

let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  alice = await createTestUser("saldo-alice");
  bob = await createTestUser("saldo-bob");
}, 60_000);

afterAll(async () => {
  if (alice) await deleteTestUser({ id: alice.id });
  if (bob) await deleteTestUser({ id: bob.id });
});

describe("RPC fiado_clientes_com_saldo", () => {
  it("agrega saldo, contagens e flags por cliente do próprio usuário", async () => {
    const aliceApp = userClient(alice.accessToken);

    // Devedor acima do limite e inadimplente: limite 50, deve 80, vencida
    const { data: devedorId } = await aliceApp
      .from("fiado_clientes")
      .insert({
        user_id: alice.id,
        nome: "Devedor",
        limite_credito: 50,
      })
      .select("id")
      .single();
    await aliceApp.rpc("fiado_registrar_venda", {
      p_itens: [{ descricao: "Compra", quantidade: 1, valor_unitario: 80 }],
      p_cliente_id: devedorId!.id,
      p_data_vencimento: "2020-01-01",
    });

    // Em dia: 1 venda paga, nada em aberto
    const emDiaId = await createCliente(alice.accessToken, alice.id, "Em Dia");
    await aliceApp.rpc("fiado_registrar_venda", {
      p_itens: [{ descricao: "Compra", quantidade: 1, valor_unitario: 30 }],
      p_cliente_id: emDiaId,
    });
    await aliceApp.rpc("fiado_registrar_pagamento", {
      p_cliente_id: emDiaId,
    });

    const { data, error } = await aliceApp.rpc("fiado_clientes_com_saldo");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);

    const devedor = data?.find(
      (c: { nome: string }) => c.nome === "Devedor",
    ) as Record<string, unknown>;
    expect(devedor.saldo_devedor).toBe(80);
    expect(devedor.total_ativas).toBe(1);
    expect(devedor.total_pagas).toBe(0);
    expect(devedor.inadimplente).toBe(true);
    expect(devedor.acima_limite).toBe(true);

    const emDia = data?.find(
      (c: { nome: string }) => c.nome === "Em Dia",
    ) as Record<string, unknown>;
    expect(emDia.saldo_devedor).toBe(0);
    expect(emDia.total_ativas).toBe(0);
    expect(emDia.total_pagas).toBe(1);
    expect(emDia.inadimplente).toBe(false);
    expect(emDia.acima_limite).toBe(false); // sem limite definido = nunca acima
  });

  it("Bob não enxerga os clientes da Alice pela RPC", async () => {
    const bobApp = userClient(bob.accessToken);
    const { data, error } = await bobApp.rpc("fiado_clientes_com_saldo");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("limite padrão das preferências vale para cliente SEM limite próprio (0003)", async () => {
    const bobApp = userClient(bob.accessToken);

    // Sem limite individual, deve 40
    const semLimiteId = await createCliente(bob.accessToken, bob.id, "Solto");
    await bobApp.rpc("fiado_registrar_venda", {
      p_itens: [{ descricao: "Compra", quantidade: 1, valor_unitario: 40 }],
      p_cliente_id: semLimiteId,
    });
    // Com limite individual 100 (sobrepõe o padrão), deve 40
    const { data: comLimite } = await bobApp
      .from("fiado_clientes")
      .insert({ user_id: bob.id, nome: "Blindado", limite_credito: 100 })
      .select("id")
      .single();
    await bobApp.rpc("fiado_registrar_venda", {
      p_itens: [{ descricao: "Compra", quantidade: 1, valor_unitario: 40 }],
      p_cliente_id: comLimite!.id,
    });

    // Antes das preferências: sem limite efetivo para o Solto
    let { data } = await bobApp.rpc("fiado_clientes_com_saldo");
    let solto = data?.find((c: { nome: string }) => c.nome === "Solto");
    expect(solto.limite_efetivo).toBeNull();
    expect(solto.acima_limite).toBe(false);

    // Define padrão 25 → Solto (deve 40) fica acima; Blindado (limite 100) não
    await bobApp
      .from("fiado_preferencias")
      .upsert({ user_id: bob.id, limite_credito_padrao: 25 });

    ({ data } = await bobApp.rpc("fiado_clientes_com_saldo"));
    solto = data?.find((c: { nome: string }) => c.nome === "Solto");
    const blindado = data?.find(
      (c: { nome: string }) => c.nome === "Blindado",
    );
    expect(solto.limite_efetivo).toBe(25);
    expect(solto.acima_limite).toBe(true);
    expect(blindado.limite_efetivo).toBe(100);
    expect(blindado.acima_limite).toBe(false);
  });
});
