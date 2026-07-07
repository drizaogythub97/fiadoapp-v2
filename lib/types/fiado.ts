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
