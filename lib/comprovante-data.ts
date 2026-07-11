import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ComprovanteQuitacaoData,
  ComprovanteVendaData,
  EspelhoClienteData,
} from "@/lib/comprovante";
import { marcaDoUsuario, type MarcaComprovante } from "@/lib/marca";
import type {
  ClienteResumo,
  ItemVenda,
  Pagamento,
  Venda,
} from "@/lib/types/fiado";

/**
 * Carregadores dos dados dos comprovantes — compartilhados pelas rotas
 * /comprovante/* (preview/impressão) e pela server action `dadosComprovante`
 * (emissão direta no celular, F5b). RLS garante o escopo por usuário; os
 * callers devem validar formato dos parâmetros e autenticação antes.
 * Devolvem null quando o alvo não existe/não pertence ao usuário.
 */

type VendaComCliente = Venda & { fiado_clientes: ClienteResumo | null };

export async function carregarComprovanteVenda(
  supabase: SupabaseClient,
  userId: string,
  vendaId: string,
): Promise<{ data: ComprovanteVendaData; marca: MarcaComprovante } | null> {
  const [
    marca,
    { data: vendaData },
    { data: itensData },
    { data: pagamentosData },
  ] = await Promise.all([
    marcaDoUsuario(supabase, userId),
    supabase
      .from("fiado_vendas")
      .select(
        "id, data_compra, data_vencimento, valor_total, valor_pago, status, observacao, quitado_em, fiado_clientes(id, nome, sobrenome, referencia, telefone)",
      )
      .eq("id", vendaId)
      .maybeSingle(),
    supabase
      .from("fiado_itens_venda")
      .select("id, descricao, quantidade, valor_unitario, valor_total")
      .eq("venda_id", vendaId),
    supabase
      .from("fiado_pagamentos")
      .select("id, venda_id, valor_pago, pago_em")
      .eq("venda_id", vendaId)
      .order("pago_em", { ascending: true }),
  ]);

  if (!vendaData) return null;
  const venda = vendaData as unknown as VendaComCliente;
  const cliente = venda.fiado_clientes;
  if (!cliente) return null;

  const data: ComprovanteVendaData = {
    vendaId: venda.id,
    cliente,
    dataCompra: venda.data_compra,
    dataVencimento: venda.data_vencimento,
    status: venda.status,
    quitadoEm: venda.quitado_em,
    observacao: venda.observacao,
    itens: ((itensData ?? []) as ItemVenda[]).map((i) => ({
      descricao: i.descricao,
      quantidade: i.quantidade,
      valorUnitario: i.valor_unitario,
      valorTotal: i.valor_total,
    })),
    pagamentos: ((pagamentosData ?? []) as Pagamento[]).map((p) => ({
      pagoEm: p.pago_em,
      valor: p.valor_pago,
    })),
    valorTotal: venda.valor_total,
    valorPago: venda.valor_pago,
  };
  return { data, marca };
}

type PagamentoComVenda = {
  valor_pago: number;
  pago_em: string;
  fiado_vendas: {
    cliente_id: string;
    data_compra: string;
    valor_total: number;
    valor_pago: number;
    status: string;
  } | null;
};

export async function carregarComprovanteQuitacao(
  supabase: SupabaseClient,
  userId: string,
  clienteId: string,
  em: string,
): Promise<{ data: ComprovanteQuitacaoData; marca: MarcaComprovante } | null> {
  // O ato de quitação é identificado pelo timestamp: a RPC usa um único
  // now() para todos os pagamentos da cascata/seleção.
  const [
    marca,
    { data: clienteData },
    { data: pagamentosData },
    { data: abertas },
  ] = await Promise.all([
    marcaDoUsuario(supabase, userId),
    supabase
      .from("fiado_clientes")
      .select("id, nome, sobrenome, referencia, telefone")
      .eq("id", clienteId)
      .maybeSingle(),
    supabase
      .from("fiado_pagamentos")
      .select(
        "valor_pago, pago_em, fiado_vendas(cliente_id, data_compra, valor_total, valor_pago, status)",
      )
      .eq("pago_em", em),
    supabase
      .from("fiado_vendas")
      .select("valor_total, valor_pago")
      .eq("cliente_id", clienteId)
      .neq("status", "PAGA"),
  ]);

  if (!clienteData) return null;
  const cliente = clienteData as ClienteResumo;

  const pagamentos = ((pagamentosData ?? []) as unknown as PagamentoComVenda[])
    .filter((p) => p.fiado_vendas?.cliente_id === clienteId)
    .sort((a, b) =>
      (a.fiado_vendas?.data_compra ?? "").localeCompare(
        b.fiado_vendas?.data_compra ?? "",
      ),
    );
  if (pagamentos.length === 0) return null;

  const saldoRestante =
    Math.round(
      ((abertas ?? []) as { valor_total: number; valor_pago: number }[]).reduce(
        (s, v) => s + (v.valor_total - v.valor_pago),
        0,
      ) * 100,
    ) / 100;

  const data: ComprovanteQuitacaoData = {
    cliente,
    pagoEm: pagamentos[0].pago_em,
    vendas: pagamentos.map((p) => ({
      dataCompra: p.fiado_vendas?.data_compra ?? "",
      valorTotal: p.fiado_vendas?.valor_total ?? 0,
      valorPago: p.valor_pago,
      quitada: p.fiado_vendas?.status === "PAGA",
    })),
    totalPago:
      Math.round(pagamentos.reduce((s, p) => s + p.valor_pago, 0) * 100) / 100,
    saldoRestante,
  };
  return { data, marca };
}

type VendaComItens = Venda & { fiado_itens_venda: ItemVenda[] };

export async function carregarEspelhoCliente(
  supabase: SupabaseClient,
  userId: string,
  clienteId: string,
): Promise<{ data: EspelhoClienteData; marca: MarcaComprovante } | null> {
  const [marca, { data: clienteData }, { data: vendasData }] =
    await Promise.all([
      marcaDoUsuario(supabase, userId),
      supabase
        .from("fiado_clientes")
        .select("id, nome, sobrenome, referencia, telefone")
        .eq("id", clienteId)
        .maybeSingle(),
      supabase
        .from("fiado_vendas")
        .select(
          "id, data_compra, data_vencimento, valor_total, valor_pago, status, observacao, fiado_itens_venda(id, descricao, quantidade, valor_unitario, valor_total)",
        )
        .eq("cliente_id", clienteId)
        .neq("status", "PAGA")
        // mesma ordem da cascata da RPC: mais antigas primeiro
        .order("data_compra", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (!clienteData) return null;
  const cliente = clienteData as ClienteResumo;
  const vendas = (vendasData ?? []) as unknown as VendaComItens[];

  const totalEmAberto =
    Math.round(
      vendas.reduce((soma, v) => soma + (v.valor_total - v.valor_pago), 0) *
        100,
    ) / 100;

  const data: EspelhoClienteData = {
    cliente,
    geradoEm: new Date().toISOString(),
    vendas: vendas.map((v) => ({
      dataCompra: v.data_compra,
      dataVencimento: v.data_vencimento,
      status: v.status,
      observacao: v.observacao,
      itens: (v.fiado_itens_venda ?? []).map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitario: i.valor_unitario,
        valorTotal: i.valor_total,
      })),
      valorTotal: v.valor_total,
      valorPago: v.valor_pago,
    })),
    totalEmAberto,
  };
  return { data, marca };
}
