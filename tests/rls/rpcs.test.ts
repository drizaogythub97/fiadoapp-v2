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
  alice = await createTestUser("rpc-alice");
  bob = await createTestUser("rpc-bob");
}, 60_000);

afterAll(async () => {
  if (alice) await deleteTestUser({ id: alice.id });
  if (bob) await deleteTestUser({ id: bob.id });
});

async function registrarVenda(
  user: TestUser,
  clienteId: string,
  total: number,
  dataCompra?: string,
  dataVencimento?: string,
): Promise<string> {
  const app = userClient(user.accessToken);
  const { data, error } = await app.rpc("fiado_registrar_venda", {
    p_itens: [
      { descricao: "Item teste", quantidade: 1, valor_unitario: total },
    ],
    p_cliente_id: clienteId,
    p_data_compra: dataCompra ?? null,
    p_data_vencimento: dataVencimento ?? null,
  });
  if (error || !data) {
    throw new Error(`Falha ao registrar venda: ${error?.message}`);
  }
  return data as string;
}

describe("RPC fiado_registrar_venda", () => {
  it("cria venda com itens e total calculado no banco", async () => {
    const aliceApp = userClient(alice.accessToken);
    const clienteId = await createCliente(alice.accessToken, alice.id, "João");

    const { data: vendaId, error } = await aliceApp.rpc(
      "fiado_registrar_venda",
      {
        p_itens: [
          { descricao: "Feijão", quantidade: 2, valor_unitario: 8.5 },
          { descricao: "Café", quantidade: 1, valor_unitario: 18.9 },
        ],
        p_cliente_id: clienteId,
        p_observacao: "  primeira venda  ",
      },
    );
    expect(error).toBeNull();
    expect(vendaId).toBeTruthy();

    const { data: venda } = await aliceApp
      .from("fiado_vendas")
      .select("valor_total, valor_pago, status, observacao")
      .eq("id", vendaId as string)
      .single();
    expect(venda?.valor_total).toBe(35.9); // 2×8,50 + 18,90
    expect(venda?.valor_pago).toBe(0);
    expect(venda?.status).toBe("ATIVA");
    expect(venda?.observacao).toBe("primeira venda");

    const { data: itens } = await aliceApp
      .from("fiado_itens_venda")
      .select("descricao, valor_total")
      .eq("venda_id", vendaId as string);
    expect(itens).toHaveLength(2);
  });

  it("cria cliente novo inline junto com a venda", async () => {
    const aliceApp = userClient(alice.accessToken);
    const { data: vendaId, error } = await aliceApp.rpc(
      "fiado_registrar_venda",
      {
        p_itens: [{ descricao: "Pão", quantidade: 10, valor_unitario: 0.75 }],
        p_cliente: {
          nome: "  Cliente Inline ",
          telefone: "62999990000",
          limite_credito: "150",
        },
      },
    );
    expect(error).toBeNull();

    const { data: venda } = await aliceApp
      .from("fiado_vendas")
      .select("cliente_id")
      .eq("id", vendaId as string)
      .single();
    const { data: cliente } = await aliceApp
      .from("fiado_clientes")
      .select("nome, telefone, limite_credito")
      .eq("id", venda!.cliente_id as string)
      .single();
    expect(cliente?.nome).toBe("Cliente Inline");
    expect(cliente?.telefone).toBe("62999990000");
    expect(cliente?.limite_credito).toBe(150);
  });

  it("rejeita venda sem itens, sem cliente ou com total zero", async () => {
    const aliceApp = userClient(alice.accessToken);
    const clienteId = await createCliente(alice.accessToken, alice.id, "Ana");

    const semItens = await aliceApp.rpc("fiado_registrar_venda", {
      p_itens: [],
      p_cliente_id: clienteId,
    });
    expect(semItens.error).not.toBeNull();

    const semCliente = await aliceApp.rpc("fiado_registrar_venda", {
      p_itens: [{ descricao: "X", quantidade: 1, valor_unitario: 1 }],
    });
    expect(semCliente.error).not.toBeNull();

    const totalZero = await aliceApp.rpc("fiado_registrar_venda", {
      p_itens: [{ descricao: "Brinde", quantidade: 1, valor_unitario: 0 }],
      p_cliente_id: clienteId,
    });
    expect(totalZero.error).not.toBeNull();
  });

  it("Bob nao consegue vender para cliente da Alice", async () => {
    const clienteAlice = await createCliente(
      alice.accessToken,
      alice.id,
      "Cliente da Alice",
    );
    const bobApp = userClient(bob.accessToken);
    const { error } = await bobApp.rpc("fiado_registrar_venda", {
      p_itens: [{ descricao: "Invasão", quantidade: 1, valor_unitario: 10 }],
      p_cliente_id: clienteAlice,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toContain("Cliente não encontrado");
  });
});

describe("RPC fiado_registrar_pagamento — cascata (decisão F2)", () => {
  it("valor parcial abate as vendas mais antigas primeiro", async () => {
    const aliceApp = userClient(alice.accessToken);
    const clienteId = await createCliente(
      alice.accessToken,
      alice.id,
      "Cascata",
    );
    const vendaAntiga = await registrarVenda(
      alice,
      clienteId,
      50,
      "2026-01-01",
    );
    const vendaNova = await registrarVenda(alice, clienteId, 30, "2026-02-01");

    const { data: resultado, error } = await aliceApp.rpc(
      "fiado_registrar_pagamento",
      { p_cliente_id: clienteId, p_valor: 60 },
    );
    expect(error).toBeNull();
    expect(resultado?.total_pago).toBe(60);

    const { data: antiga } = await aliceApp
      .from("fiado_vendas")
      .select("valor_pago, status, quitado_em")
      .eq("id", vendaAntiga)
      .single();
    expect(antiga?.valor_pago).toBe(50);
    expect(antiga?.status).toBe("PAGA");
    expect(antiga?.quitado_em).toBeTruthy();

    const { data: nova } = await aliceApp
      .from("fiado_vendas")
      .select("valor_pago, status, quitado_em")
      .eq("id", vendaNova)
      .single();
    expect(nova?.valor_pago).toBe(10);
    expect(nova?.status).toBe("PARCIAL");
    expect(nova?.quitado_em).toBeNull();

    // Pagamentos registram o valor REAL (correção vs v1)
    const { data: pagamentos } = await aliceApp
      .from("fiado_pagamentos")
      .select("venda_id, valor_pago")
      .in("venda_id", [vendaAntiga, vendaNova]);
    const valores = pagamentos
      ?.map((p) => p.valor_pago as number)
      .sort((a, b) => a - b);
    expect(valores).toEqual([10, 50]);

    // Quitação total do restante (modo 1)
    const { data: quitacao, error: quitError } = await aliceApp.rpc(
      "fiado_registrar_pagamento",
      { p_cliente_id: clienteId },
    );
    expect(quitError).toBeNull();
    expect(quitacao?.total_pago).toBe(20);

    const { data: novaPaga } = await aliceApp
      .from("fiado_vendas")
      .select("status, valor_pago")
      .eq("id", vendaNova)
      .single();
    expect(novaPaga?.status).toBe("PAGA");
    expect(novaPaga?.valor_pago).toBe(30);
  });

  it("rejeita valor maior que o total em aberto", async () => {
    const aliceApp = userClient(alice.accessToken);
    const clienteId = await createCliente(
      alice.accessToken,
      alice.id,
      "Overpay",
    );
    await registrarVenda(alice, clienteId, 40);

    const { error } = await aliceApp.rpc("fiado_registrar_pagamento", {
      p_cliente_id: clienteId,
      p_valor: 100,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toContain("maior que o total em aberto");

    // Nada foi gravado (transação atômica)
    const { data: pagamentos } = await aliceApp
      .from("fiado_pagamentos")
      .select("id, fiado_vendas!inner(cliente_id)")
      .eq("fiado_vendas.cliente_id", clienteId);
    expect(pagamentos).toHaveLength(0);
  });

  it("quita apenas as vendas selecionadas (modo 2)", async () => {
    const aliceApp = userClient(alice.accessToken);
    const clienteId = await createCliente(
      alice.accessToken,
      alice.id,
      "Seleção",
    );
    const venda1 = await registrarVenda(alice, clienteId, 25, "2026-01-10");
    const venda2 = await registrarVenda(alice, clienteId, 35, "2026-01-20");

    const { data: resultado, error } = await aliceApp.rpc(
      "fiado_registrar_pagamento",
      { p_cliente_id: clienteId, p_venda_ids: [venda2] },
    );
    expect(error).toBeNull();
    expect(resultado?.total_pago).toBe(35);

    const { data: v1 } = await aliceApp
      .from("fiado_vendas")
      .select("status")
      .eq("id", venda1)
      .single();
    expect(v1?.status).toBe("ATIVA");

    const { data: v2 } = await aliceApp
      .from("fiado_vendas")
      .select("status")
      .eq("id", venda2)
      .single();
    expect(v2?.status).toBe("PAGA");

    // Selecionar venda já quitada é erro explícito
    const denovo = await aliceApp.rpc("fiado_registrar_pagamento", {
      p_cliente_id: clienteId,
      p_venda_ids: [venda2],
    });
    expect(denovo.error).not.toBeNull();
  });

  it("valor parcial nas selecionadas: cascata SÓ entre as marcadas (modo 4)", async () => {
    const aliceApp = userClient(alice.accessToken);
    const clienteId = await createCliente(
      alice.accessToken,
      alice.id,
      "Valor nas selecionadas",
    );
    // A mais antiga (vendaForaSel) NÃO é selecionada — mesmo sendo a mais
    // velha do cliente, o valor não pode abatê-la.
    const vendaForaSel = await registrarVenda(
      alice,
      clienteId,
      50,
      "2026-01-01",
    );
    const vendaSelAntiga = await registrarVenda(
      alice,
      clienteId,
      40,
      "2026-02-01",
    );
    const vendaSelNova = await registrarVenda(
      alice,
      clienteId,
      30,
      "2026-03-01",
    );

    const { data: resultado, error } = await aliceApp.rpc(
      "fiado_registrar_pagamento",
      {
        p_cliente_id: clienteId,
        p_valor: 60,
        p_venda_ids: [vendaSelAntiga, vendaSelNova],
      },
    );
    expect(error).toBeNull();
    expect(resultado?.total_pago).toBe(60);

    // A não selecionada continua intocada, apesar de ser a mais antiga.
    const { data: fora } = await aliceApp
      .from("fiado_vendas")
      .select("valor_pago, status")
      .eq("id", vendaForaSel)
      .single();
    expect(fora?.valor_pago).toBe(0);
    expect(fora?.status).toBe("ATIVA");

    // Cascata dentro da seleção: a mais antiga das selecionadas quita 1º.
    const { data: selAntiga } = await aliceApp
      .from("fiado_vendas")
      .select("valor_pago, status")
      .eq("id", vendaSelAntiga)
      .single();
    expect(selAntiga?.valor_pago).toBe(40);
    expect(selAntiga?.status).toBe("PAGA");

    const { data: selNova } = await aliceApp
      .from("fiado_vendas")
      .select("valor_pago, status")
      .eq("id", vendaSelNova)
      .single();
    expect(selNova?.valor_pago).toBe(20);
    expect(selNova?.status).toBe("PARCIAL");
  });

  it("modo 4: rejeita valor maior que o total das selecionadas", async () => {
    const aliceApp = userClient(alice.accessToken);
    const clienteId = await createCliente(
      alice.accessToken,
      alice.id,
      "Overpay selecionadas",
    );
    // Total do cliente = 120, mas o total das SELECIONADAS = 70.
    await registrarVenda(alice, clienteId, 50, "2026-01-01");
    const sel1 = await registrarVenda(alice, clienteId, 40, "2026-02-01");
    const sel2 = await registrarVenda(alice, clienteId, 30, "2026-03-01");

    const { error } = await aliceApp.rpc("fiado_registrar_pagamento", {
      p_cliente_id: clienteId,
      p_valor: 100, // < 120 do cliente, mas > 70 das selecionadas
      p_venda_ids: [sel1, sel2],
    });
    expect(error).not.toBeNull();
    expect(error?.message).toContain(
      "maior que o total em aberto das vendas selecionadas",
    );

    // Transação atômica: nada foi gravado.
    const { data: pagamentos } = await aliceApp
      .from("fiado_pagamentos")
      .select("id, fiado_vendas!inner(cliente_id)")
      .eq("fiado_vendas.cliente_id", clienteId);
    expect(pagamentos).toHaveLength(0);
  });

  it("Bob nao consegue registrar pagamento em cliente da Alice", async () => {
    const clienteAlice = await createCliente(
      alice.accessToken,
      alice.id,
      "Alvo do Bob",
    );
    await registrarVenda(alice, clienteAlice, 15);

    const bobApp = userClient(bob.accessToken);
    const { error } = await bobApp.rpc("fiado_registrar_pagamento", {
      p_cliente_id: clienteAlice,
      p_valor: 15,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toContain("Cliente não encontrado");
  });
});

describe("RPC fiado_resumo_dashboard", () => {
  it("agrega KPIs no banco para o usuario autenticado", async () => {
    // Usuária dedicada para valores determinísticos
    const carol = await createTestUser("rpc-carol");
    try {
      const carolApp = userClient(carol.accessToken);

      const inadimplente = await createCliente(
        carol.accessToken,
        carol.id,
        "Atrasado",
      );
      await registrarVenda(
        carol,
        inadimplente,
        100,
        "2020-01-01",
        "2020-02-01",
      );

      const emDia = await createCliente(carol.accessToken, carol.id, "Em Dia");
      await registrarVenda(carol, emDia, 50, undefined, "2099-01-01");
      await carolApp.rpc("fiado_registrar_pagamento", {
        p_cliente_id: emDia,
        p_valor: 20,
      });

      const { data, error } = await carolApp.rpc("fiado_resumo_dashboard");
      expect(error).toBeNull();
      const resumo = Array.isArray(data) ? data[0] : data;
      expect(resumo?.a_receber).toBe(130); // 100 + (50 − 20)
      expect(resumo?.vendas_ativas).toBe(2);
      expect(resumo?.clientes_inadimplentes).toBe(1);
      expect(resumo?.total_clientes).toBe(2);
    } finally {
      await deleteTestUser({ id: carol.id });
    }
  });

  it("usuario sem dados recebe tudo zerado", async () => {
    const bobApp = userClient(bob.accessToken);
    const { data, error } = await bobApp.rpc("fiado_resumo_dashboard");
    expect(error).toBeNull();
    const resumo = Array.isArray(data) ? data[0] : data;
    expect(resumo?.a_receber).toBe(0);
    expect(resumo?.total_clientes).toBe(0);
  });
});
