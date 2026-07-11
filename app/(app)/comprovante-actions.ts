"use server";

import {
  TITULO_ESPELHO_CLIENTE,
  tituloComprovanteVenda,
  type ComprovanteQuitacaoData,
  type ComprovanteVendaData,
  type EspelhoClienteData,
  type PedidoComprovante,
} from "@/lib/comprovante";
import {
  carregarComprovanteQuitacao,
  carregarComprovanteVenda,
  carregarEspelhoCliente,
} from "@/lib/comprovante-data";
import type { MarcaComprovante } from "@/lib/marca";
import { createClient } from "@/lib/supabase/server";
import { pedidoComprovanteSchema } from "@/lib/validations/comprovante";

export type ResultadoComprovante =
  | {
      ok: true;
      comprovante:
        | { tipo: "venda"; data: ComprovanteVendaData }
        | { tipo: "quitacao"; data: ComprovanteQuitacaoData }
        | { tipo: "espelho-cliente"; data: EspelhoClienteData };
      marca: MarcaComprovante;
      titulo: string;
      /** Nome do arquivo SEM extensão (o emissor põe .png/.pdf). */
      nomeArquivo: string;
    }
  | { ok: false; error: string };

const ERRO_GENERICO =
  "Não foi possível gerar o comprovante. Tente de novo em instantes.";

/**
 * Dados de um comprovante para emissão direta no aparelho (celular, F5b):
 * o cliente renderiza o papel fora da tela e gera PDF/PNG + compartilhamento
 * nativo, sem abrir a rota /comprovante/*.
 */
export async function dadosComprovante(
  pedido: PedidoComprovante,
): Promise<ResultadoComprovante> {
  const parsed = pedidoComprovanteSchema.safeParse(pedido);
  if (!parsed.success) {
    return { ok: false, error: ERRO_GENERICO };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sessão expirada. Entre de novo." };
  }

  try {
    switch (parsed.data.tipo) {
      case "venda": {
        const res = await carregarComprovanteVenda(
          supabase,
          user.id,
          parsed.data.vendaId,
        );
        if (!res) return { ok: false, error: ERRO_GENERICO };
        return {
          ok: true,
          comprovante: { tipo: "venda", data: res.data },
          marca: res.marca,
          titulo: tituloComprovanteVenda(res.data.status),
          nomeArquivo: "comprovante-venda",
        };
      }
      case "quitacao": {
        const res = await carregarComprovanteQuitacao(
          supabase,
          user.id,
          parsed.data.clienteId,
          parsed.data.em,
        );
        if (!res) return { ok: false, error: ERRO_GENERICO };
        return {
          ok: true,
          comprovante: { tipo: "quitacao", data: res.data },
          marca: res.marca,
          titulo: "Comprovante de quitação",
          nomeArquivo: "comprovante-quitacao",
        };
      }
      case "espelho-cliente": {
        const res = await carregarEspelhoCliente(
          supabase,
          user.id,
          parsed.data.clienteId,
        );
        if (!res) return { ok: false, error: ERRO_GENERICO };
        return {
          ok: true,
          comprovante: { tipo: "espelho-cliente", data: res.data },
          marca: res.marca,
          titulo: TITULO_ESPELHO_CLIENTE,
          nomeArquivo: "espelho-vendas",
        };
      }
    }
  } catch {
    return { ok: false, error: ERRO_GENERICO };
  }
}
