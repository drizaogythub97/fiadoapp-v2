"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { pagamentoSchema, vendaSchema } from "@/lib/validations/venda";

/**
 * Mensagens de negócio levantadas pelas RPCs (raise exception) que são
 * seguras de mostrar ao usuário. Qualquer outro erro vira mensagem
 * genérica — nunca vazar SQL/stack (padrão Gaveta).
 */
const ERROS_RPC_CONHECIDOS = new Set([
  "Cliente não encontrado",
  "Venda sem itens",
  "Venda com valor total zero",
  "Nenhuma venda em aberto para este cliente",
  "Nenhuma venda selecionada",
  "Venda inválida ou já quitada na seleção",
  "Valor maior que o total em aberto do cliente",
  "Valor maior que o total em aberto das vendas selecionadas",
  "Valor de pagamento inválido",
  "Informe um valor OU vendas selecionadas, não os dois",
  "Informe o cliente existente OU os dados do cliente novo",
]);

function mensagemRPC(message: string | undefined, generica: string): string {
  return message && ERROS_RPC_CONHECIDOS.has(message) ? message : generica;
}

function revalidarTelas(clienteId?: string) {
  revalidatePath("/vendas");
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  revalidatePath("/inadimplentes");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

export type RegistrarVendaResult =
  | { ok: true; vendaId: string; clienteId: string }
  | { ok: false; error: string };

export async function registrarVenda(
  input: unknown,
): Promise<RegistrarVendaResult> {
  const parsed = vendaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados da venda inválidos.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }

  const { clienteId, clienteNovo, dataCompra, dataVencimento, observacao } =
    parsed.data;

  const { data: vendaId, error } = await supabase.rpc(
    "fiado_registrar_venda",
    {
      p_itens: parsed.data.itens.map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        valor_unitario: i.valorUnitario,
      })),
      p_cliente_id: clienteId,
      p_cliente: clienteNovo
        ? {
            nome: clienteNovo.nome,
            sobrenome: clienteNovo.sobrenome,
            referencia: clienteNovo.referencia,
            telefone: clienteNovo.telefone,
          }
        : null,
      p_data_compra: dataCompra,
      p_data_vencimento: dataVencimento,
      p_observacao: observacao,
    },
  );

  if (error || !vendaId) {
    return {
      ok: false,
      error: mensagemRPC(
        error?.message,
        "Não foi possível salvar a venda. Tente novamente.",
      ),
    };
  }

  // Cliente criado inline: a RPC devolve só o id da venda — busca o
  // cliente para o redirect ao detalhe.
  let clienteFinal = clienteId;
  if (!clienteFinal) {
    const { data: venda } = await supabase
      .from("fiado_vendas")
      .select("cliente_id")
      .eq("id", vendaId)
      .single();
    clienteFinal = venda?.cliente_id ?? null;
  }

  revalidarTelas(clienteFinal ?? undefined);
  return {
    ok: true,
    vendaId: vendaId as string,
    clienteId: clienteFinal ?? "",
  };
}

export type RegistrarPagamentoResult =
  | { ok: true; totalPago: number; pagoEm: string | null }
  | { ok: false; error: string };

export async function registrarPagamento(
  input: unknown,
): Promise<RegistrarPagamentoResult> {
  const parsed = pagamentoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados da quitação inválidos.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }

  const dados = parsed.data;
  // Modo "selecionadas" com valor = abate esse valor só nas selecionadas
  // (cascata); sem valor = quita cada selecionada por inteiro.
  const valorRPC =
    dados.modo === "parcial"
      ? dados.valor
      : dados.modo === "selecionadas"
        ? (dados.valor ?? null)
        : null;
  const { data, error } = await supabase.rpc("fiado_registrar_pagamento", {
    p_cliente_id: dados.clienteId,
    p_valor: valorRPC,
    p_venda_ids: dados.modo === "selecionadas" ? dados.vendaIds : null,
  });

  if (error || !data) {
    return {
      ok: false,
      error: mensagemRPC(
        error?.message,
        "Não foi possível registrar o pagamento. Tente novamente.",
      ),
    };
  }

  revalidarTelas(dados.clienteId);
  const resultado = data as {
    total_pago: number;
    vendas: { venda_id: string }[];
  };

  // Timestamp do ato (a RPC usa um único now()): identifica a quitação na
  // rota /comprovante/quitacao/[clienteId]?em=...
  let pagoEm: string | null = null;
  const primeiraVenda = resultado.vendas?.[0]?.venda_id;
  if (primeiraVenda) {
    const { data: pagamento } = await supabase
      .from("fiado_pagamentos")
      .select("pago_em")
      .eq("venda_id", primeiraVenda)
      .order("pago_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    pagoEm = pagamento?.pago_em ?? null;
  }

  return { ok: true, totalPago: Number(resultado.total_pago), pagoEm };
}

export async function excluirVenda(
  id: string,
): Promise<{ error?: string; clienteId?: string }> {
  if (!id) return { error: "Venda inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  const { data: venda } = await supabase
    .from("fiado_vendas")
    .select("cliente_id, origem")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!venda) {
    return { error: "Venda não encontrada." };
  }

  if (venda.origem === "gaveta") {
    // Exclusão consistente (F6 Fase 3): a RPC-ponte remove TAMBÉM a venda do
    // Gaveta e estorna o estoque, numa transação.
    const { error } = await supabase.rpc("excluir_venda_fiado", {
      p_venda_id: id,
    });
    if (error) {
      return { error: "Não foi possível excluir a venda. Tente novamente." };
    }
  } else {
    // on delete cascade leva itens e pagamentos juntos (paridade v1).
    const { error } = await supabase
      .from("fiado_vendas")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return { error: "Não foi possível excluir a venda. Tente novamente." };
    }
  }

  revalidarTelas(venda.cliente_id);
  return { clienteId: venda.cliente_id };
}
