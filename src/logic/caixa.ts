// Caixa da pelada: entradas e saídas (fica no perfil de quem entrou com o Google). PLANO.md, seção 12.1.

import type { ResumoPagamentos } from './pagamento'

export type MovimentoDoCaixa = { tipo: 'entrada' | 'saida'; valor: number; descricao: string; data: number }

/** Saldo: entradas − saídas (arredondado no centavo). */
export function saldoDoCaixa(lancamentos: Pick<MovimentoDoCaixa, 'tipo' | 'valor'>[]): number {
  const total = lancamentos.reduce((s, l) => s + (l.tipo === 'entrada' ? l.valor : -l.valor), 0)
  return Math.round(total * 100) / 100
}

/**
 * Fechamento do campo pago no caixa: entra o que foi pago e sai o valor do campo.
 * Ex.: 12 pagaram R$ 15 (R$ 180) e o campo custou R$ 120 → caixa +R$ 60.
 */
export function lancamentosDaPelada(resumo: ResumoPagamentos, data: number, dia: string): MovimentoDoCaixa[] {
  const lista: MovimentoDoCaixa[] = []
  if (resumo.arrecadado > 0) {
    lista.push({ tipo: 'entrada', valor: resumo.arrecadado, descricao: `Pelada ${dia} · ${resumo.pagos} ${resumo.pagos === 1 ? 'pagou' : 'pagaram'}`, data })
  }
  if (resumo.campo > 0) lista.push({ tipo: 'saida', valor: resumo.campo, descricao: `Campo · pelada ${dia}`, data: data + 1 })
  return lista
}
