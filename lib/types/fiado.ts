/** Linha retornada pela RPC fiado_clientes_com_saldo (migration 0002). */
export type ClienteComSaldo = {
  id: string;
  nome: string;
  sobrenome: string | null;
  referencia: string | null;
  telefone: string | null;
  limite_credito: number | null;
  saldo_devedor: number;
  total_ativas: number;
  total_pagas: number;
  inadimplente: boolean;
  acima_limite: boolean;
};

/** Linha retornada pela RPC fiado_resumo_dashboard (migration 0001). */
export type ResumoDashboard = {
  a_receber: number;
  vendas_ativas: number;
  clientes_inadimplentes: number;
  total_clientes: number;
};

/** Status derivado de valor_pago pelas RPCs (nunca escrito pela aplicação). */
export type VendaStatus = "ATIVA" | "PARCIAL" | "PAGA";

/** Linha de fiado_vendas. Datas date → "aaaa-mm-dd"; timestamptz → ISO. */
export type Venda = {
  id: string;
  cliente_id: string;
  data_compra: string;
  data_vencimento: string | null;
  valor_total: number;
  valor_pago: number;
  status: VendaStatus;
  observacao: string | null;
  quitado_em: string | null;
  created_at: string;
};

/** Campos do cliente embutidos numa consulta de vendas (via FK). */
export type ClienteResumo = {
  id: string;
  nome: string;
  sobrenome: string | null;
  referencia: string | null;
  telefone: string | null;
};

export type VendaComCliente = Venda & {
  fiado_clientes: ClienteResumo | null;
};

/** Linha de fiado_itens_venda. */
export type ItemVenda = {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

/** Linha de fiado_pagamentos. */
export type Pagamento = {
  id: string;
  venda_id: string;
  valor_pago: number;
  pago_em: string;
};
